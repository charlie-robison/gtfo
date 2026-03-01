"""Gmail API OAuth wrapper for reading user's inbox."""

import json
import threading

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

from .config import GMAIL_CREDENTIALS_JSON, GMAIL_SCOPES, GMAIL_TOKEN_JSON


class GmailClient:
    """Reads the user's Gmail inbox via OAuth (read-only). Thread-safe."""

    def __init__(self):
        self._creds = self._get_credentials()
        self._local = threading.local()

    def _get_credentials(self) -> Credentials:
        """Authenticate via OAuth and return credentials."""
        creds = None

        # Load token from env var
        if GMAIL_TOKEN_JSON:
            token_info = json.loads(GMAIL_TOKEN_JSON)
            creds = Credentials.from_authorized_user_info(token_info, GMAIL_SCOPES)

        # Refresh or run OAuth flow
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not GMAIL_CREDENTIALS_JSON:
                    raise ValueError(
                        "Missing GMAIL_CREDENTIALS_JSON in .env. "
                        "Set it to the contents of your Google OAuth credentials JSON."
                    )
                client_config = json.loads(GMAIL_CREDENTIALS_JSON)
                flow = InstalledAppFlow.from_client_config(client_config, GMAIL_SCOPES)
                creds = flow.run_local_server(port=0)

        return creds

    @property
    def service(self):
        """Return a per-thread Gmail API service instance."""
        svc = getattr(self._local, "service", None)
        if svc is None:
            svc = build("gmail", "v1", credentials=self._creds)
            self._local.service = svc
        return svc

    def get_profile(self) -> str:
        """Return the authenticated user's email address."""
        profile = self.service.users().getProfile(userId="me").execute()
        return profile["emailAddress"]

    def search_messages(self, query: str, max_results: int = 500) -> list[dict]:
        """Search Gmail for messages matching a query. Returns list of {id, threadId}."""
        messages = []
        request = self.service.users().messages().list(
            userId="me", q=query, maxResults=min(max_results, 500)
        )

        while request and len(messages) < max_results:
            response = request.execute()
            batch = response.get("messages", [])
            messages.extend(batch)

            # Handle pagination
            if "nextPageToken" in response and len(messages) < max_results:
                request = self.service.users().messages().list(
                    userId="me",
                    q=query,
                    maxResults=min(max_results - len(messages), 500),
                    pageToken=response["nextPageToken"],
                )
            else:
                break

        return messages[:max_results]

    def get_message(self, message_id: str) -> dict:
        """Fetch message metadata (From, Subject, snippet) by ID."""
        msg = self.service.users().messages().get(
            userId="me", id=message_id, format="metadata",
            metadataHeaders=["From", "Subject", "Date"],
        ).execute()

        headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}

        return {
            "id": msg["id"],
            "thread_id": msg.get("threadId", ""),
            "snippet": msg.get("snippet", ""),
            "from": headers.get("From", ""),
            "subject": headers.get("Subject", ""),
            "date": headers.get("Date", ""),
        }
