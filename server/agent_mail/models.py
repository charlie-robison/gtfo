"""Data models for email scanning and service detection."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel


class UserAddress(BaseModel):
    street: str
    city: str
    state: str
    zip_code: str


class ServiceCategory(str, Enum):
    BANKING = "banking"
    SHOPPING = "shopping"
    SUBSCRIPTION = "subscription"
    UTILITY = "utility"
    GOVERNMENT = "government"
    MEDICAL = "medical"
    INSURANCE = "insurance"
    OTHER = "other"


class ServicePriority(str, Enum):
    CRITICAL = "critical"      # banking, government
    HIGH = "high"              # utilities, medical, insurance
    MEDIUM = "medium"          # shopping
    LOW = "low"                # subscriptions


class RawEmailHit(BaseModel):
    message_id: str
    sender: str
    sender_domain: str
    subject: str
    snippet: str
    query_matched: str


class DetectedService(BaseModel):
    service_name: str
    category: ServiceCategory
    priority: ServicePriority
    detected_from: list[str]
    email_count: int
    settings_url: Optional[str] = None
    needs_address_update: bool = True
    sample_sender: str


class ScanResult(BaseModel):
    user_email: str
    total_messages_scanned: int
    raw_hits: list[RawEmailHit]
    services: list[DetectedService]
