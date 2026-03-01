"""Standalone demo entry point for MoveFlow email scanning and outreach.

Usage:
    python -m agent_mail.demo --setup                            # Run OAuth flow + create AgentMail inbox
    python -m agent_mail.demo --scan                             # Full scan pipeline
    python -m agent_mail.demo --inquire agent@email.com          # Send rental inquiry to a real estate agent
    python -m agent_mail.demo --cancel-lease landlord@email.com  # Send lease cancellation notice to landlord
"""

import argparse
import json

from .agentmail_client import AgentMailClient
from .classifier import classify_services
from .gmail_client import GmailClient
from .models import ScanResult, UserAddress
from .scanner import scan_emails

# Default old address (from skills/update_amazon_address.py)
DEFAULT_OLD_ADDRESS = UserAddress(
    street="5122 Mertola Drive",
    city="El Dorado Hills",
    state="CA",
    zip_code="95762",
)


def run_setup():
    """Run Gmail OAuth flow and create AgentMail inbox."""
    print("=== MoveFlow Setup ===\n")

    # Gmail OAuth
    print("1. Connecting to Gmail...")
    gmail = GmailClient()
    user_email = gmail.get_profile()
    print(f"   Gmail connected: {user_email}\n")

    # AgentMail inbox
    print("2. Creating AgentMail inbox...")
    agent_mail = AgentMailClient()
    inbox_addr = agent_mail.get_or_create_inbox()
    print(f"   Agent inbox: {inbox_addr}\n")

    print("Setup complete! You can now run --scan.")


def run_scan():
    """Run the full email scanning and classification pipeline."""
    print("=== MoveFlow Email Scanner ===\n")

    # Connect
    print("1. Connecting to Gmail...")
    gmail = GmailClient()
    user_email = gmail.get_profile()
    print(f"   Authenticated as: {user_email}\n")

    # Scan
    print("2. Scanning inbox...")
    raw_hits, total = scan_emails(gmail, old_address=DEFAULT_OLD_ADDRESS)
    print(f"   {len(raw_hits)} unique email hits found.\n")

    if not raw_hits:
        print("No emails found matching search queries. Try broadening the search.")
        return

    # Classify
    print("3. Classifying services with OpenAI...")
    services = classify_services(raw_hits)
    print(f"   {len(services)} services detected.\n")

    # Display results
    print("=" * 60)
    print("DETECTED SERVICES (sorted by priority)")
    print("=" * 60)
    for i, svc in enumerate(services, 1):
        print(f"\n  {i}. {svc.service_name}")
        print(f"     Category: {svc.category.value} | Priority: {svc.priority.value}")
        print(f"     Emails found: {svc.email_count}")
        print(f"     Sample sender: {svc.sample_sender}")
        if svc.settings_url:
            print(f"     Settings URL: {svc.settings_url}")
    print()

    # Build scan result
    scan_result = ScanResult(
        user_email=user_email,
        total_messages_scanned=total,
        raw_hits=raw_hits,
        services=services,
    )

    # Send summary via AgentMail
    print("4. Sending summary email via AgentMail...")
    try:
        agent_mail = AgentMailClient()
        agent_mail.send_scan_summary(user_email, services)
        print(f"   Summary sent to {user_email}\n")
    except Exception as e:
        print(f"   AgentMail send failed (non-blocking): {e}\n")

    # Dump JSON
    output_file = "scan_results.json"
    with open(output_file, "w") as f:
        json.dump(scan_result.model_dump(mode="json"), f, indent=2)
    print(f"5. Full results saved to {output_file}")


def run_rental_inquiry(agent_email: str):
    """Send a rental inquiry email to a real estate agent."""
    print("=== MoveFlow Rental Inquiry ===\n")

    agent_mail = AgentMailClient()
    inbox = agent_mail.get_or_create_inbox()
    print(f"Sending from: {inbox}\n")

    name = input("Your full name: ")
    property_addr = input("Property address you're inquiring about: ")
    move_in = input("Desired move-in date (e.g., April 1, 2026): ")
    extra = input("Any additional message (optional, press Enter to skip): ")

    agent_mail.send_rental_inquiry(
        to_email=agent_email,
        applicant_name=name,
        property_address=property_addr,
        move_in_date=move_in,
        message=extra,
    )
    print(f"\nInquiry sent to {agent_email}!")
    print(f"Replies will come to {inbox}")


def run_lease_cancellation(landlord_email: str):
    """Send a lease cancellation / notice to vacate to the landlord."""
    print("=== MoveFlow Lease Cancellation ===\n")

    agent_mail = AgentMailClient()
    inbox = agent_mail.get_or_create_inbox()
    print(f"Sending from: {inbox}\n")

    name = input("Your full name: ")
    current_addr = input("Current rental address: ")
    lease_end = input("Lease end date (e.g., June 30, 2026): ")
    move_out = input("Intended move-out date (e.g., June 30, 2026): ")
    reason = input("Reason for leaving (optional, press Enter for default): ")

    agent_mail.send_lease_cancellation(
        to_email=landlord_email,
        tenant_name=name,
        current_address=current_addr,
        lease_end_date=lease_end,
        move_out_date=move_out,
        reason=reason or "I am relocating.",
    )
    print(f"\nLease cancellation notice sent to {landlord_email}!")
    print(f"Replies will come to {inbox}")


def main():
    parser = argparse.ArgumentParser(description="MoveFlow Email Scanner & Outreach")
    parser.add_argument("--setup", action="store_true", help="Run OAuth + inbox setup")
    parser.add_argument("--scan", action="store_true", help="Run full scan pipeline")
    parser.add_argument("--inquire", metavar="EMAIL", help="Send rental inquiry to a real estate agent")
    parser.add_argument("--cancel-lease", metavar="EMAIL", help="Send lease cancellation notice to landlord")
    args = parser.parse_args()

    if args.setup:
        run_setup()
    elif args.scan:
        run_scan()
    elif args.inquire:
        run_rental_inquiry(args.inquire)
    elif args.cancel_lease:
        run_lease_cancellation(args.cancel_lease)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
