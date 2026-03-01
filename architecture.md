# 🏠 MoveFlow — End-to-End AI Moving Platform

## Architecture & Sponsor Integration Guide

---

## High-Level Flow

```
User Input (new city/budget/preferences)
        │
        ▼
┌─────────────────────────────────┐
│   ORCHESTRATION LAYER (OpenClaw) │
│   + Google Gemini for reasoning  │
└──────┬────────┬────────┬────────┘
       │        │        │
       ▼        ▼        ▼
   Phase 1   Phase 2   Phase 3
   Find &    Update    Book
   Apply     Addresses Movers
```

---

## Phase 1: Find & Apply to Places

**Goal:** User enters target city, budget, move-in date, preferences → agents find listings, apply, and surface top options.

| Component | Tool | Role |
|-----------|------|------|
| Apartment search agents | **Browser Use** | Navigate Zillow, Apartments.com, Craigslist, Facebook Marketplace. Extract listings, photos, pricing. |
| Parallel agent execution | **Superset** | Spin up 5-10 Browser Use agents simultaneously — one per listing site |
| Application submission | **Browser Use** | Fill out rental applications on each platform |
| Orchestration | **OpenClaw + Gemini** | Rank listings by user preferences, decide which to apply to |
| Real-time dashboard | **Convex** | Live-updating list of found apartments, application statuses |
| Frontend | **Vercel** | Deploy the Next.js dashboard |

### Data Model (Convex)
```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    oldAddress: v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
    }),
    newAddress: v.optional(v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
    })),
    moveDate: v.string(),
    preferences: v.object({
      budget: v.number(),
      bedrooms: v.number(),
      petFriendly: v.boolean(),
    }),
  }),

  listings: defineTable({
    userId: v.id("users"),
    source: v.string(),          // "zillow", "apartments.com", etc.
    url: v.string(),
    title: v.string(),
    price: v.number(),
    address: v.string(),
    photos: v.array(v.string()),
    score: v.number(),           // AI-ranked relevance score
    applicationStatus: v.union(
      v.literal("found"),
      v.literal("applying"),
      v.literal("applied"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
  }),

  addressAccounts: defineTable({
    userId: v.id("users"),
    serviceName: v.string(),     // "Amazon", "Chase Bank", etc.
    serviceUrl: v.string(),
    category: v.string(),        // "shopping", "banking", "subscription", "utility"
    detectedFrom: v.string(),    // "email_scan", "manual"
    updateStatus: v.union(
      v.literal("detected"),
      v.literal("queued"),
      v.literal("in_progress"),
      v.literal("needs_review"),
      v.literal("completed"),
      v.literal("failed")
    ),
    agentSessionId: v.optional(v.string()),
    screenshot: v.optional(v.string()),
    lastUpdated: v.number(),
  }),

  agentSessions: defineTable({
    userId: v.id("users"),
    phase: v.union(
      v.literal("apartment_search"),
      v.literal("address_update"),
      v.literal("mover_booking")
    ),
    targetSite: v.string(),
    status: v.union(
      v.literal("running"),
      v.literal("waiting_approval"),
      v.literal("completed"),
      v.literal("errored")
    ),
    currentStep: v.string(),
    logs: v.array(v.string()),
    startedAt: v.number(),
  }),

  moverQuotes: defineTable({
    userId: v.id("users"),
    company: v.string(),
    url: v.string(),
    price: v.number(),
    date: v.string(),
    inventorySize: v.string(),   // "studio", "1br", "2br", "3br+"
    status: v.union(
      v.literal("quoted"),
      v.literal("booked"),
      v.literal("cancelled")
    ),
  }),
});
```

---

## Phase 2: Scan Email & Update Addresses

**Goal:** Once user selects a place, scan their email to find every service that has their address, then update all of them.

### 2a: Email Scanning (Agentmail)

```
┌──────────────────────────────────────────┐
│           AGENTMAIL INTEGRATION           │
│                                          │
│  1. Connect user's email via Agentmail   │
│  2. Search for patterns:                 │
│     - Shipping confirmations             │
│     - Account signup emails              │
│     - Billing/invoice emails             │
│     - Subscription confirmations         │
│     - Utility/service notifications      │
│  3. Extract unique services/domains      │
│  4. Classify by category                 │
│  5. Prioritize (banking > shopping)      │
└──────────────────────────────────────────┘
```

| Component | Tool | Role |
|-----------|------|------|
| Email inbox access | **Agentmail** | Connect to user's email, search/filter messages programmatically |
| Service extraction | **Gemini** | Parse email senders/content → identify services with stored addresses |
| Classification | **Gemini** | Categorize: banking, shopping, subscriptions, utilities, government, medical |

### Email Scanning Logic
```python
# Pseudocode for Agentmail integration
SEARCH_QUERIES = [
    "shipping confirmation",
    "order confirmation", 
    "your account",
    "billing address",
    "delivery address",
    "subscription confirmation",
    "welcome to",
    "account created",
    "verify your address",
    # Also search for the old address directly
    f"{user.old_address.street}",
    f"{user.old_address.zip}",
]

# For each query, extract unique sender domains
# Then use Gemini to:
# 1. Deduplicate (amazon.com, amazon.co.uk → Amazon)
# 2. Classify priority
# 3. Determine if address update is likely needed
# 4. Generate the likely settings URL path
```

### 2b: Address Update Agents (Browser Use + Superset)

```
┌─────────────────────────────────────────────┐
│         PARALLEL ADDRESS UPDATES             │
│                                             │
│  Superset spawns N Browser Use agents:      │
│                                             │
│  Agent 1: Amazon ──→ Account → Addresses    │
│  Agent 2: Chase  ──→ Profile → Contact Info │
│  Agent 3: Netflix ─→ Account → Billing      │
│  Agent 4: USPS   ──→ Mail Forwarding        │
│  Agent 5: DMV    ──→ Address Change          │
│  ...                                        │
│                                             │
│  Each agent:                                │
│  1. Navigates to site                       │
│  2. Logs in (user provides creds or SSO)    │
│  3. Finds address/profile settings          │
│  4. Locates address fields                  │
│  5. PAUSES for user approval (screenshot)   │
│  6. Submits change on approval              │
└─────────────────────────────────────────────┘
```

| Component | Tool | Role |
|-----------|------|------|
| Web navigation | **Browser Use** | Each agent handles one site — login, navigate, find fields, fill |
| Parallel execution | **Superset** | Run 5-10 agents simultaneously from one terminal |
| Live status updates | **Convex** | Real-time mutations as each agent progresses — dashboard updates instantly |
| User approval gate | **Convex** | Agent writes screenshot + proposed change → waits for user approval mutation |
| Agent tracing | **Laminar** | Full trace of every agent action — which page, what it clicked, time per step |

### Browser Use Agent Template
```python
from browser_use import Agent, Browser

async def update_address_agent(site_config, old_address, new_address, convex_client):
    """Generic agent that updates address on any site."""
    
    agent = Agent(
        task=f"""
        Go to {site_config['url']}.
        Log into the account.
        Navigate to account settings or profile.
        Find the address or contact information section.
        Locate the current address fields showing: {old_address}.
        Replace with new address: {new_address}.
        DO NOT submit yet — take a screenshot of the filled form.
        """,
        llm=gemini_model,  # Google Deepmind sponsor
    )
    
    # Update Convex in real-time as agent progresses
    await convex_client.mutation("agentSessions:updateStatus", {
        "status": "running",
        "currentStep": "Navigating to settings page..."
    })
    
    result = await agent.run()
    
    # Pause for user approval
    await convex_client.mutation("agentSessions:updateStatus", {
        "status": "waiting_approval",
        "screenshot": result.screenshot_b64,
    })
    
    # Wait for approval from dashboard...
    # On approval, agent clicks submit
```

---

## Phase 3: Book Movers

**Goal:** Based on inventory size and move date, find and book moving companies.

| Component | Tool | Role |
|-----------|------|------|
| Mover search agents | **Browser Use** | Search moving.com, Yelp, Google for movers. Get quotes. |
| Parallel quotes | **Superset** | Hit multiple mover sites simultaneously |
| Quote comparison | **Gemini** | Rank movers by price, reviews, availability |
| Booking | **Browser Use** | Book selected mover (with user approval) |

---

## Observability & Evaluation

| Component | Tool | Role |
|-----------|------|------|
| Agent tracing | **Laminar** | Every Browser Use agent sends traces — full action replay, latency, errors |
| Agent evaluation | **HUD** | Benchmark agents on test sites — measure success rate of address updates |
| Code quality | **Cubic** | AI code review on PRs during hackathon development |

### Laminar Integration
```python
from laminar import trace, observe

@observe(name="address_update_agent")
async def update_address(site, old_addr, new_addr):
    with trace("navigate_to_settings"):
        # Browser Use navigates
        pass
    with trace("locate_address_fields"):
        # Browser Use finds fields
        pass
    with trace("fill_new_address"):
        # Browser Use fills form
        pass
    with trace("await_approval"):
        # Pause for user
        pass
```

### HUD Integration
```python
# Create evaluation benchmarks for address update agents
# Test against known site structures to measure:
# - Success rate per site category
# - Time to complete
# - Error recovery ability
```

---

## Full Tech Stack Summary

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│         Next.js Dashboard on Vercel              │
│                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Apartment │ │ Address  │ │  Mover Booking   │ │
│  │ Search    │ │ Updates  │ │  Comparison      │ │
│  │ Results   │ │ Dashboard│ │  Dashboard       │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
│         ▲           ▲              ▲             │
│         │    Live Subscriptions    │             │
│         └───────────┼──────────────┘             │
└─────────────────────┼───────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────┐
│              CONVEX BACKEND                      │
│   Real-time DB + Server Functions                │
│                                                  │
│   • User data & preferences                     │
│   • Listing results (live updates)               │
│   • Agent session status (live updates)          │
│   • Address account detection results            │
│   • Approval queue (user approves changes)       │
│   • Mover quotes                                 │
└─────────────────────┼───────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────┐
│           ORCHESTRATION LAYER                    │
│              OpenClaw Agent                       │
│         + Google Gemini (reasoning)              │
│                                                  │
│   Manages the 3-phase pipeline:                  │
│   Phase 1 → Phase 2 → Phase 3                   │
│                                                  │
│   Decides: which sites to target, priority       │
│   order, error recovery, retries                 │
└──────┬────────────┬─────────────┬───────────────┘
       │            │             │
       ▼            ▼             ▼
┌────────────┐┌───────────┐┌───────────────┐
│  AGENTMAIL ││BROWSER USE││   SUPERSET    │
│            ││  AGENTS   ││               │
│ Scan inbox ││           ││ Parallel agent│
│ for service││ Navigate  ││ execution     │
│ detection  ││ sites &   ││ from terminal │
│            ││ update    ││               │
└────────────┘│ addresses ││               │
              └───────────┘└───────────────┘
                      │
┌─────────────────────┼───────────────────────────┐
│            OBSERVABILITY                         │
│                                                  │
│   Laminar: Traces every agent action             │
│   HUD: Benchmarks agent success rates            │
│   Cubic: Code review during dev                  │
└─────────────────────────────────────────────────┘
```

---

## Sponsor Scorecard

| Sponsor | Integration | How |
|---------|------------|-----|
| **Browser Use** | ⭐ CORE | Every web agent — apartment search, address updates, mover booking |
| **Google Deepmind** | ⭐ CORE | Gemini as LLM for Browser Use agents + orchestration reasoning |
| **Convex** | ⭐ CORE | Entire real-time backend — live dashboard, approval queue, all data |
| **Agentmail** | ⭐ CORE | Email scanning to detect services with stored addresses |
| **Superset** | ⭐ HIGH | Parallel agent execution — run 10 address updates simultaneously |
| **Vercel** | ⭐ HIGH | Frontend deployment |
| **Laminar** | ⭐ HIGH | Full agent observability — traces, latency, error tracking |
| **HUD** | ⭐ MEDIUM | Agent evaluation benchmarks — measure address update success rates |
| **Cubic** | ⭐ MEDIUM | Code review during development |
| **Vibeflow** | ⭐ MEDIUM | Could build the orchestration workflow visually — the 3-phase pipeline |

**Total: 10/10 sponsors integrated** ✅

---

## Hackathon Execution Plan

### Hour 0-2: Foundation
- [ ] Set up Convex backend with schema
- [ ] Deploy Next.js shell on Vercel
- [ ] Set up Agentmail integration
- [ ] Set up Laminar tracing

### Hour 2-5: Phase 2 First (Address Updates = Core Demo)
- [ ] Build email scanning with Agentmail → service detection
- [ ] Build single Browser Use agent for one site (e.g., Amazon)
- [ ] Connect to Convex for live status
- [ ] Build approval flow in dashboard

### Hour 5-8: Scale & Polish
- [ ] Add Superset for parallel execution
- [ ] Add 5-10 more site agents
- [ ] Build Phase 1 (apartment search) if time permits
- [ ] Build Phase 3 (mover booking) if time permits
- [ ] Add HUD benchmarks

### Hour 8-10: Demo Prep
- [ ] Polish dashboard UI
- [ ] Record demo video
- [ ] Prepare pitch

### Key Demo Moments
1. **"Watch it scan"** — Agentmail finds 47 services from your inbox
2. **"Watch them all go"** — 10 Browser Use agents updating addresses simultaneously on the live dashboard
3. **"One click to approve"** — User reviews screenshot, clicks approve, agent submits
4. **"Full observability"** — Show Laminar traces of every agent action

---

## Auth / Security Considerations

- **Browser sessions**: Users need to be logged into their accounts. Options:
  - Browser Use can use existing browser profiles/cookies
  - OAuth where available
  - User pre-logs into sites, agent takes over the session
- **Approval gate is critical**: Never auto-submit address changes — always show screenshot + get approval
- **Credential handling**: Never store passwords — use session-based approach