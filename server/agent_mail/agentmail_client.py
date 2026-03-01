"""AgentMail SDK wrapper — the agent's own inbox for outbound communication."""

from agentmail import AgentMail
from agentmail.inboxes.types.create_inbox_request import CreateInboxRequest

from .config import AGENTMAIL_API_KEY, AGENTMAIL_INBOX_USERNAME
from .models import DetectedService


class AgentMailClient:
    """Manages the agent's AgentMail inbox for sending scan results and notifications."""

    def __init__(self):
        self.client = AgentMail(api_key=AGENTMAIL_API_KEY)
        self._inbox = None

    def get_or_create_inbox(self) -> str:
        """Get existing or create new @agentmail.to inbox. Returns the inbox address."""
        if self._inbox:
            return self._inbox.inbox_id

        expected_id = f"{AGENTMAIL_INBOX_USERNAME}@agentmail.to"

        # Try to get existing inbox first
        try:
            self._inbox = self.client.inboxes.get(inbox_id=expected_id)
            return self._inbox.inbox_id
        except Exception:
            pass

        # Create new inbox
        self._inbox = self.client.inboxes.create(
            request=CreateInboxRequest(username=AGENTMAIL_INBOX_USERNAME),
        )
        return self._inbox.inbox_id

    def send_scan_summary(self, to_email: str, services: list[DetectedService]) -> None:
        """Send the user an email summary of detected services."""
        inbox_email = self.get_or_create_inbox()

        # Build HTML table
        rows = ""
        for svc in sorted(services, key=lambda s: s.priority.value):
            rows += (
                f"<tr>"
                f"<td>{svc.service_name}</td>"
                f"<td>{svc.category.value}</td>"
                f"<td>{svc.priority.value}</td>"
                f"<td>{svc.email_count}</td>"
                f"<td>{'Yes' if svc.needs_address_update else 'No'}</td>"
                f"</tr>\n"
            )

        html_body = f"""
<h2>MoveFlow — Address Update Scan Results</h2>
<p>We scanned your inbox and found <strong>{len(services)}</strong> services that may have your address on file.</p>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Service</th><th>Category</th><th>Priority</th><th>Emails Found</th><th>Needs Update</th></tr>
{rows}
</table>
<p>Reply to this email or visit your MoveFlow dashboard to start updating addresses.</p>
"""

        text_body = "MoveFlow Scan Results\n\n"
        for svc in sorted(services, key=lambda s: s.priority.value):
            text_body += (
                f"- {svc.service_name} ({svc.category.value}, {svc.priority.value}) "
                f"— {svc.email_count} emails found\n"
            )

        self.client.inboxes.messages.send(
            inbox_id=inbox_email,
            to=to_email,
            subject=f"MoveFlow: {len(services)} services found with your address",
            text=text_body,
            html=html_body,
        )

    def send_notification(self, to_email: str, subject: str, body: str) -> None:
        """Send a generic notification email."""
        inbox_email = self.get_or_create_inbox()
        self.client.inboxes.messages.send(
            inbox_id=inbox_email,
            to=to_email,
            subject=subject,
            text=body,
        )

    def send_rental_inquiry(
        self,
        to_email: str,
        applicant_name: str,
        property_address: str,
        move_in_date: str,
        message: str = "",
    ) -> None:
        """Send an inquiry email to a real estate agent / landlord about a rental listing."""
        inbox_email = self.get_or_create_inbox()

        text_body = f"""\
Hi,

My name is {applicant_name} and I'm interested in the property at {property_address}.

I'm looking for a move-in date around {move_in_date}. {message}

Could you let me know about availability, application requirements, and any next steps?

Thank you,
{applicant_name}

---
Sent via MoveFlow
"""

        html_body = f"""\
<p>Hi,</p>
<p>My name is <strong>{applicant_name}</strong> and I'm interested in the property at <strong>{property_address}</strong>.</p>
<p>I'm looking for a move-in date around <strong>{move_in_date}</strong>. {message}</p>
<p>Could you let me know about availability, application requirements, and any next steps?</p>
<p>Thank you,<br>{applicant_name}</p>
<hr>
<p style="color: gray; font-size: 12px;">Sent via MoveFlow</p>
"""

        self.client.inboxes.messages.send(
            inbox_id=inbox_email,
            to=to_email,
            subject=f"Rental Inquiry: {property_address}",
            text=text_body,
            html=html_body,
        )

    def send_lease_cancellation(
        self,
        to_email: str,
        tenant_name: str,
        current_address: str,
        lease_end_date: str,
        move_out_date: str,
        reason: str = "I am relocating.",
    ) -> None:
        """Send a lease cancellation / notice to vacate email to the current landlord."""
        inbox_email = self.get_or_create_inbox()

        text_body = f"""\
Dear Landlord / Property Manager,

This letter serves as formal written notice that I, {tenant_name}, am providing notice to vacate the property at:

{current_address}

Lease end date: {lease_end_date}
Intended move-out date: {move_out_date}

Reason: {reason}

I would appreciate confirmation of receipt of this notice and any information regarding:
- Move-out inspection scheduling
- Security deposit return process
- Any other requirements for a smooth transition

Please feel free to reply to this email or contact me at your earliest convenience.

Thank you for your time,
{tenant_name}

---
Sent via MoveFlow
"""

        html_body = f"""\
<p>Dear Landlord / Property Manager,</p>
<p>This letter serves as formal written notice that I, <strong>{tenant_name}</strong>, am providing notice to vacate the property at:</p>
<p><strong>{current_address}</strong></p>
<table cellpadding="4">
<tr><td><strong>Lease end date:</strong></td><td>{lease_end_date}</td></tr>
<tr><td><strong>Intended move-out date:</strong></td><td>{move_out_date}</td></tr>
</table>
<p><strong>Reason:</strong> {reason}</p>
<p>I would appreciate confirmation of receipt of this notice and any information regarding:</p>
<ul>
<li>Move-out inspection scheduling</li>
<li>Security deposit return process</li>
<li>Any other requirements for a smooth transition</li>
</ul>
<p>Please feel free to reply to this email or contact me at your earliest convenience.</p>
<p>Thank you for your time,<br><strong>{tenant_name}</strong></p>
<hr>
<p style="color: gray; font-size: 12px;">Sent via MoveFlow</p>
"""

        self.client.inboxes.messages.send(
            inbox_id=inbox_email,
            to=to_email,
            subject=f"Notice to Vacate: {current_address}",
            text=text_body,
            html=html_body,
        )
