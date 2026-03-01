"""Service classification using OpenAI — deduplicates, categorizes, and prioritizes."""

import json
from collections import defaultdict

from openai import OpenAI

from .config import OPENAI_API_KEY, OPENAI_MODEL
from .models import DetectedService, RawEmailHit, ServiceCategory, ServicePriority

CLASSIFICATION_PROMPT = """\
You are a service classifier for an address-change assistant. Given a list of email sender domains \
and sample email subjects, identify the distinct real-world services that likely have the user's \
physical address on file.

For each service, provide:
- service_name: The human-readable company/service name (e.g., "Amazon", "Chase Bank")
- category: One of: banking, shopping, subscription, utility, government, medical, insurance, other
- priority: One of: critical (banking/govt), high (utilities/medical/insurance), medium (shopping), low (subscriptions)
- settings_url: Best guess at the URL where the user can update their address (or null)
- needs_address_update: true if this service likely stores a physical address, false for email-only services
- sample_sender: One example sender email from the data

Rules:
1. Merge related domains into one service (e.g., amazon.com + amazonses.com → "Amazon")
2. Filter out pure email marketing platforms (mailchimp, sendgrid, etc.) — these don't store user addresses
3. Filter out social media notifications unless they clearly store addresses
4. Only include services that plausibly store a physical/mailing address

Return a JSON array of objects. Only output valid JSON, no markdown or explanation.
"""


def classify_services(raw_hits: list[RawEmailHit]) -> list[DetectedService]:
    """Group raw email hits by domain and classify via OpenAI."""
    # Group by sender domain
    domain_groups: dict[str, list[RawEmailHit]] = defaultdict(list)
    for hit in raw_hits:
        domain_groups[hit.sender_domain].append(hit)

    # Build summary for the LLM
    domain_summaries = []
    for domain, hits in sorted(domain_groups.items(), key=lambda x: -len(x[1])):
        subjects = list({h.subject for h in hits[:5]})
        queries = list({h.query_matched for h in hits})
        domain_summaries.append({
            "domain": domain,
            "email_count": len(hits),
            "sample_subjects": subjects,
            "matched_queries": queries,
            "sample_sender": hits[0].sender,
        })

    if not domain_summaries:
        return []

    # Call OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY)
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": CLASSIFICATION_PROMPT},
            {
                "role": "user",
                "content": (
                    "Here are the sender domains and sample data:\n\n"
                    + json.dumps(domain_summaries, indent=2)
                    + "\n\nReturn a JSON object with key \"services\" containing an array of classified services."
                ),
            },
        ],
        temperature=0.1,
    )

    result_text = response.choices[0].message.content or "[]"
    parsed = json.loads(result_text)

    # Handle both {"services": [...]} and bare [...]
    services_raw = parsed if isinstance(parsed, list) else parsed.get("services", [])

    # Map domain email counts
    domain_counts = {d: len(hits) for d, hits in domain_groups.items()}

    services = []
    for svc in services_raw:
        if not svc.get("needs_address_update", True):
            continue

        # Find matching domains for this service
        svc_name_lower = svc.get("service_name", "").lower()
        matched_domains = [
            d for d in domain_groups
            if svc_name_lower in d or d in svc_name_lower
        ]
        email_count = sum(domain_counts.get(d, 0) for d in matched_domains) or svc.get("email_count", 1)

        try:
            category = ServiceCategory(svc.get("category", "other"))
        except ValueError:
            category = ServiceCategory.OTHER

        try:
            priority = ServicePriority(svc.get("priority", "low"))
        except ValueError:
            priority = ServicePriority.LOW

        services.append(DetectedService(
            service_name=svc["service_name"],
            category=category,
            priority=priority,
            detected_from=matched_domains or [svc.get("sample_sender", "unknown")],
            email_count=email_count,
            settings_url=svc.get("settings_url"),
            needs_address_update=True,
            sample_sender=svc.get("sample_sender", ""),
        ))

    # Sort by priority
    priority_order = {
        ServicePriority.CRITICAL: 0,
        ServicePriority.HIGH: 1,
        ServicePriority.MEDIUM: 2,
        ServicePriority.LOW: 3,
    }
    services.sort(key=lambda s: priority_order.get(s.priority, 99))

    return services
