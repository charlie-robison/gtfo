"""Email scanning orchestration — searches Gmail for services with stored addresses."""

import re
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
    max_results_per_query: int = 500,
) -> tuple[list[RawEmailHit], int]:
    """
    Scan the user's Gmail inbox for emails from services that likely store their address.

    Returns (list of RawEmailHit, total unique messages scanned).
    """
    queries = get_search_queries(old_address)
    seen_ids: set[str] = set()
    hits: list[RawEmailHit] = []
    total_fetched = 0

    for query in queries:
        print(f"  Searching: \"{query}\"...")
        results = gmail_client.search_messages(query, max_results=max_results_per_query)
        total_fetched += len(results)

        for msg_stub in results:
            msg_id = msg_stub["id"]
            if msg_id in seen_ids:
                continue
            seen_ids.add(msg_id)

            msg = gmail_client.get_message(msg_id)
            sender = msg.get("from", "")
            domain = _extract_domain(sender)

            hits.append(RawEmailHit(
                message_id=msg_id,
                sender=sender,
                sender_domain=domain,
                subject=msg.get("subject", ""),
                snippet=msg.get("snippet", ""),
                query_matched=query,
            ))

    print(f"  Found {len(hits)} unique emails from {total_fetched} total results.")
    return hits, len(hits)
