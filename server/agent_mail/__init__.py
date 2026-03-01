"""MoveFlow Agent Mail — email scanning and service detection."""

from .agentmail_client import AgentMailClient
from .classifier import classify_services
from .gmail_client import GmailClient
from .models import (
    DetectedService,
    RawEmailHit,
    ScanResult,
    ServiceCategory,
    ServicePriority,
    UserAddress,
)
from .scanner import scan_emails

__all__ = [
    "AgentMailClient",
    "GmailClient",
    "classify_services",
    "DetectedService",
    "RawEmailHit",
    "scan_emails",
    "ScanResult",
    "ServiceCategory",
    "ServicePriority",
    "UserAddress",
]
