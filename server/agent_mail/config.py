"""Configuration and constants for email scanning."""

import os
from typing import Optional

from dotenv import load_dotenv

from .models import UserAddress

load_dotenv()

# API keys
AGENTMAIL_API_KEY = os.getenv("AGENTMAIL_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# AgentMail settings
AGENTMAIL_INBOX_USERNAME = os.getenv("AGENTMAIL_INBOX_USERNAME", "moveflow-scanner")

# OpenAI model
OPENAI_MODEL = "gpt-4o"

# Gmail OAuth
GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
GMAIL_CREDENTIALS_JSON = os.getenv("GMAIL_CREDENTIALS_JSON", "")
GMAIL_TOKEN_JSON = os.getenv("GMAIL_TOKEN_JSON", "")

# Search queries for finding services with stored addresses
BASE_SEARCH_QUERIES = [
    "shipping confirmation",
    "order confirmation",
    "your account",
    "billing address",
    "delivery address",
    "subscription confirmation",
    "welcome to",
    "account created",
    "verify your address",
]


def get_search_queries(old_address: Optional[UserAddress] = None) -> list[str]:
    """Return search queries, optionally including address-specific queries."""
    queries = list(BASE_SEARCH_QUERIES)
    if old_address:
        queries.append(old_address.street)
        queries.append(old_address.zip_code)
    return queries
