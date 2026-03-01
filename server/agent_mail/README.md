# Agent Mail — Email Scanning & Outreach

This module handles all email-related functionality for MoveFlow:

1. **Scan** your Gmail history to find every service that has your physical address on file
2. **Classify** those services by priority using OpenAI
3. **Send emails** to real estate agents and landlords from the agent's own inbox

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      MoveFlow Agent                      │
├──────────────────────┬──────────────────────────────────┤
│    Gmail API (Read)  │       AgentMail (Send)           │
│                      │                                   │
│  • OAuth read-only   │  • Agent's own inbox             │
│  • Scans 2+ years    │    moveflow-scanner@agentmail.to │
│    of inbox history  │  • Sends scan summaries          │
│  • Searches by query │  • Sends rental inquiries        │
│    ("shipping conf", │  • Sends lease cancellations     │
│     "billing addr")  │  • Receives replies              │
└──────────┬───────────┴──────────────┬───────────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────┐   ┌──────────────────────┐
│   OpenAI (gpt-4o)   │   │   Recipient Inboxes  │
│                      │   │                      │
│  • Deduplicates      │   │  • Your Gmail        │
│    sender domains    │   │  • Real estate agents │
│  • Categorizes       │   │  • Landlords          │
│  • Assigns priority  │   │  • Property managers  │
│  • Guesses settings  │   │                      │
│    URLs              │   │                      │
└─────────────────────┘   └──────────────────────┘
```

### Scanning Pipeline

1. **Connect** — Authenticates with Gmail via OAuth (read-only, never modifies your inbox)
2. **Search** — Runs 9+ search queries against your full Gmail history:
   - "shipping confirmation", "order confirmation", "billing address", "delivery address"
   - "subscription confirmation", "welcome to", "account created", "verify your address"
   - Your old street address and zip code (if provided)
3. **Deduplicate** — Removes duplicate emails that match multiple queries (keyed by message ID)
4. **Extract** — Pulls sender, domain, subject, and snippet from each email
5. **Classify** — Sends grouped domain data to OpenAI which:
   - Merges related domains (e.g., `amazon.com` + `amazonses.com` → "Amazon")
   - Filters out pure marketing senders (Mailchimp, SendGrid, etc.)
   - Assigns a category: banking, shopping, subscription, utility, government, medical, insurance
   - Assigns a priority: critical, high, medium, low
   - Guesses the settings URL where you'd update your address
6. **Output** — Prints results, saves JSON, and emails you a summary via AgentMail

### Email Outreach

The agent has its own email address (`moveflow-scanner@agentmail.to`) powered by AgentMail. This lets it:

- **Send scan summaries** — After scanning, emails you an HTML table of all detected services
- **Contact real estate agents** — Sends rental inquiry emails on your behalf
- **Cancel leases** — Sends formal notice-to-vacate emails to your landlord
- **Receive replies** — All replies come back to the agent's inbox

## Setup

### Prerequisites

1. **Google Cloud OAuth credentials** (one-time):
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a project → Enable Gmail API
   - Go to APIs & Services → OAuth consent screen → Add yourself as a test user
   - Go to Credentials → Create OAuth client ID (Desktop App)
   - Download as `credentials.json` into the project root

2. **API keys** in `.env`:
   ```
   AGENTMAIL_API_KEY=your_key_from_agentmail.to
   OPENAI_API_KEY=your_openai_key
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

### First Run

```bash
python3 -m agent_mail.demo --setup
```

This will:
- Open your browser for Gmail OAuth consent (one-time, saves `token.json`)
- Create or connect to the `moveflow-scanner@agentmail.to` inbox

## Usage

### Scan your inbox for services

```bash
python3 -m agent_mail.demo --scan
```

Output: prioritized list of services with your address + `scan_results.json`

### Send a rental inquiry

```bash
python3 -m agent_mail.demo --inquire agent@realestate.com
```

Prompts for: your name, property address, move-in date, optional message

### Send a lease cancellation

```bash
python3 -m agent_mail.demo --cancel-lease landlord@property.com
```

Prompts for: your name, current address, lease end date, move-out date, reason

## File Structure

```
agent_mail/
  __init__.py          — Module exports
  config.py            — Env vars, search queries, constants
  models.py            — Pydantic data models (UserAddress, DetectedService, ScanResult, etc.)
  gmail_client.py      — Gmail API OAuth wrapper (read-only access to user's inbox)
  agentmail_client.py  — AgentMail SDK wrapper (agent's own inbox for sending)
  scanner.py           — Email scanning orchestration (searches Gmail, deduplicates)
  classifier.py        — OpenAI service classification (categorize, prioritize, deduplicate)
  demo.py              — CLI entry point (--setup, --scan, --inquire, --cancel-lease)
```

## Data Models

### DetectedService

Each service found in your inbox:

| Field               | Type             | Example                                  |
|---------------------|------------------|------------------------------------------|
| service_name        | str              | "Amazon"                                 |
| category            | ServiceCategory  | shopping                                 |
| priority            | ServicePriority  | medium                                   |
| email_count         | int              | 47                                       |
| settings_url        | str or None      | https://www.amazon.com/a/addresses       |
| needs_address_update| bool             | true                                     |
| sample_sender       | str              | "Amazon <ship-confirm@amazon.com>"       |

### Priority Levels

| Priority | Categories                  | Action           |
|----------|-----------------------------|------------------|
| critical | Banking, Government         | Update first     |
| high     | Utilities, Medical, Insurance| Update soon     |
| medium   | Shopping                    | Update when able |
| low      | Subscriptions               | Update last      |

## Security

- **Gmail access is read-only** — scope is `gmail.readonly`, the app can never modify, send, or delete emails in your inbox
- **OAuth token is local** — `token.json` is saved locally, never committed (in `.gitignore`)
- **Credentials are local** — `credentials.json` and `.env` are in `.gitignore`
