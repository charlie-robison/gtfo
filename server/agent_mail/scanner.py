"""Email scanning orchestration — searches Gmail for services with stored addresses."""

import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

from .config import get_search_queries
from .gmail_client import GmailClient
from .models import RawEmailHit, UserAddress


def _extract_domain(from_header: str) -> str:
    """Extract domain from a From header like 'Amazon <noreply@amazon.com>'."""
    match = re.search(r"@([\w.-]+)", from_header)
    if not match:
        return from_header
    domain = match.group(1).lower()
    # Strip common subdomains
    for prefix in ("mail.", "email.", "noreply.", "notify.", "info.", "alerts.", "e.", "mailer."):
        if domain.startswith(prefix):
            domain = domain[len(prefix):]
    return domain


def scan_emails(
    gmail_client: GmailClient,
    old_address: Optional[UserAddress] = None,
    max_results_per_query: int = 150,
    max_total: int = 1000,
) -> tuple[list[RawEmailHit], int]:
    """
    Scan the user's Gmail inbox for emails from services that likely store their address.

    Runs all search queries and message fetches in parallel for speed.
    Returns (list of RawEmailHit, total unique messages scanned).
    """
    queries = get_search_queries(old_address)

    # Step 1: Run all search queries in parallel
    print("  Running all search queries in parallel...")
    query_results: dict[str, list[dict]] = {}

    with ThreadPoolExecutor(max_workers=len(queries)) as executor:
        future_to_query = {
            executor.submit(gmail_client.search_messages, q, max_results_per_query): q
            for q in queries
        }
        for future in as_completed(future_to_query):
            query = future_to_query[future]
            try:
                query_results[query] = future.result()
                print(f"    \"{query}\" — {len(query_results[query])} results")
            except Exception as e:
                print(f"    \"{query}\" — error: {e}")
                query_results[query] = []

    # Step 2: Deduplicate message IDs across all queries, track which query matched
    seen_ids: set[str] = set()
    msg_id_to_query: dict[str, str] = {}
    total_fetched = 0

    for query in queries:
        results = query_results.get(query, [])
        total_fetched += len(results)
        for msg_stub in results:
            msg_id = msg_stub["id"]
            if msg_id not in seen_ids:
                seen_ids.add(msg_id)
                msg_id_to_query[msg_id] = query
            if len(msg_id_to_query) >= max_total:
                break
        if len(msg_id_to_query) >= max_total:
            break

    # Step 3: Fetch all unique messages in parallel
    print(f"  Fetching {len(msg_id_to_query)} unique messages in parallel...")
    hits: list[RawEmailHit] = []

    with ThreadPoolExecutor(max_workers=20) as executor:
        future_to_id = {
            executor.submit(gmail_client.get_message, msg_id): msg_id
            for msg_id in msg_id_to_query
        }
        for future in as_completed(future_to_id):
            msg_id = future_to_id[future]
            try:
                msg = future.result()
                sender = msg.get("from", "")
                domain = _extract_domain(sender)
                hits.append(RawEmailHit(
                    message_id=msg_id,
                    sender=sender,
                    sender_domain=domain,
                    subject=msg.get("subject", ""),
                    snippet=msg.get("snippet", ""),
                    query_matched=msg_id_to_query[msg_id],
                ))
            except Exception:
                pass

    print(f"  Found {len(hits)} unique emails from {total_fetched} total results.")
    return hits, len(hits)
