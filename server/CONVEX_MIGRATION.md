# Automovers — Convex + Browser Use Migration Guide

## Overview

This document covers the architectural migration from:

- **Old stack**: Python FastAPI + MongoDB (Motor) + browser-use (Python library)
- **New stack**: Convex (TypeScript backend + real-time DB) + browser-use-convex-component (Browser Use Cloud API)

All original business logic, agent prompts, database schemas, and GPT-4o parsing utilities have been preserved and translated to TypeScript.

---

## Architecture Comparison

```
OLD ARCHITECTURE                         NEW ARCHITECTURE
─────────────────                        ─────────────────
FastAPI (Python)                    →    Convex HTTP Actions (TypeScript)
MongoDB (Motor async driver)        →    Convex Database (built-in)
browser-use (Python, local browser) →    browser-use-convex-component (Cloud API)
OpenAI SDK (Python)                 →    OpenAI SDK (Node.js)
Background tasks (FastAPI)          →    Convex Internal Actions (serverless)
REST endpoints (uvicorn)            →    HTTP Actions (https://<deploy>.convex.site)
Polling GET /jobs/{id}              →    Real-time subscriptions via useQuery()
```

### Key Benefits

- **Same REST API**: HTTP actions expose the same POST/GET endpoints as FastAPI
- **Real-time too**: Convex queries are also available for reactive frontend subscriptions
- **No server management**: Convex is fully serverless; no uvicorn, no MongoDB Atlas
- **Cloud browser automation**: Browser Use Cloud handles browser infrastructure
- **Type safety**: Full TypeScript throughout the backend
- **Built-in persistence**: Browser Use tasks are tracked in the Convex DB automatically

---

## Directory Structure

```
server/
├── package.json                  # Node.js dependencies
├── tsconfig.json                 # TypeScript config
├── convex/
│   ├── convex.config.ts          # App config (registers browser-use component)
│   ├── schema.ts                 # Database schema (8 tables)
│   ├── http.ts                   # HTTP router — all REST endpoints
│   ├── browserUse.ts             # Browser Use component client
│   ├── jobs.ts                   # Job CRUD (queries + mutations)
│   ├── searchRentals.ts          # Search rentals internal action + helpers
│   ├── movingPipeline.ts         # House analysis + furniture + U-Haul
│   ├── updateAddress.ts          # Amazon address update internal action
│   ├── orderFurniture.ts         # Amazon furniture cart internal action
│   ├── data.ts                   # Read queries for all collections
│   └── lib/
│       ├── prompts.ts            # All prompt templates (preserved from Python)
│       └── openai.ts             # GPT-4o parsing utilities
```

---

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Initialize Convex

If this is a new Convex project:

```bash
npx convex dev
```

This will:
- Prompt you to log in to Convex
- Create a new project (or link to an existing one)
- Generate the `convex/_generated/` directory
- Start the dev server with hot-reload

### 3. Set Environment Variables

Set these in your Convex deployment dashboard, or via CLI:

```bash
# Browser Use Cloud API key
npx convex env set BROWSER_USE_API_KEY "bu_your_key_here"

# OpenAI API key (for GPT-4o house analysis + result parsing)
npx convex env set OPENAI_API_KEY "sk-your_key_here"

# Amazon credentials (for address update + furniture cart agents)
npx convex env set AMAZON_EMAIL "your_amazon_email"
npx convex env set AMAZON_PASSWORD "your_amazon_password"

# Redfin email (for rental contact forms)
npx convex env set REDFIN_EMAIL "your_redfin_email"

# U-Haul credentials (for truck reservation agent)
# Falls back to AMAZON_EMAIL/AMAZON_PASSWORD if not set
npx convex env set UHAUL_EMAIL "your_uhaul_email"
npx convex env set UHAUL_PASSWORD "your_uhaul_password"
```

### 4. Deploy

```bash
# Development (with hot-reload)
npm run dev

# Production
npm run deploy
```

---

## HTTP API Reference

All HTTP endpoints are served at `https://<your-deployment>.convex.site`.

The API is a 1:1 match with the original FastAPI endpoints — same paths, same HTTP methods, same JSON request/response shapes. CORS is enabled for all origins (matching the original FastAPI config).

### Endpoint Mapping (Old → New)

| Old FastAPI URL | New Convex HTTP Action | Method |
|----------------|----------------------|--------|
| `http://localhost:8000/search-rentals` | `https://<deploy>.convex.site/search-rentals` | POST |
| `http://localhost:8000/moving-pipeline` | `https://<deploy>.convex.site/moving-pipeline` | POST |
| `http://localhost:8000/update-address` | `https://<deploy>.convex.site/update-address` | POST |
| `http://localhost:8000/order-furniture` | `https://<deploy>.convex.site/order-furniture` | POST |
| `http://localhost:8000/jobs/{job_id}` | `https://<deploy>.convex.site/jobs/{job_id}` | GET |
| `http://localhost:8000/steps` | `https://<deploy>.convex.site/steps` | GET |
| `http://localhost:8000/search-constraints` | `https://<deploy>.convex.site/search-constraints` | GET |
| `http://localhost:8000/house-information` | `https://<deploy>.convex.site/house-information` | GET |
| `http://localhost:8000/redfin-applications` | `https://<deploy>.convex.site/redfin-applications` | GET |
| `http://localhost:8000/uhaul-information` | `https://<deploy>.convex.site/uhaul-information` | GET |
| `http://localhost:8000/recommended-furniture` | `https://<deploy>.convex.site/recommended-furniture` | GET |
| `http://localhost:8000/amazon-order-summary` | `https://<deploy>.convex.site/amazon-order-summary` | GET |

---

### POST Endpoints

#### `POST /search-rentals`

Search Redfin for rental listings and fill contact forms (demo mode).

```bash
curl -X POST https://<deploy>.convex.site/search-rentals \
  -H "Content-Type: application/json" \
  -d '{
    "budget": 4000,
    "city": "Sacramento",
    "state": "CA",
    "full_name": "Charlie Robison",
    "phone": "555-123-4567",
    "move_in_date": "04/01/2026",
    "min_bedrooms": 2,
    "min_bathrooms": 1,
    "initial_address": "El Dorado Hills, CA"
  }'
```

Response (immediate — the browser task runs in the background):
```json
{ "job_id": "k57abc123def456..." }
```

Poll for results:
```bash
curl https://<deploy>.convex.site/jobs/<job_id>
# → { "status": "running", ... }
# → { "status": "completed", "result": { "listingsCount": 5 } }
```

#### `POST /moving-pipeline`

Three-step pipeline: house analysis + furniture recs + U-Haul order.

```bash
curl -X POST https://<deploy>.convex.site/moving-pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "destination_address": "123 Oak St, Sacramento, CA",
    "date": "03/15/2026",
    "pickup_time": "10:00 AM",
    "house_image_base64": "data:image/jpeg;base64,..."
  }'
```

Response (GPT-4o analysis is synchronous and returned immediately; U-Haul browser task runs in the background):
```json
{
  "analysis": {
    "houseDescription": "...",
    "estimatedBedrooms": 3,
    "estimatedSquareFootage": 2500,
    "stuffVolumeEstimate": "1200-1500 cubic feet",
    "recommendedTruckSize": "20' Truck",
    "reasoning": "...",
    "recommendedWorkers": 3,
    "laborReasoning": "..."
  },
  "furniture": [
    {
      "item_name": "Queen Bed Frame",
      "room": "Master Bedroom",
      "amazon_search_query": "queen bed frame with headboard",
      "priority": "essential"
    }
  ],
  "uhaul_job_id": "k57abc123def456..."
}
```

Poll for U-Haul results:
```bash
curl https://<deploy>.convex.site/jobs/<uhaul_job_id>
```

**Note**: The house photo is now passed as a base64 data URL in the request body instead of being read from `house.jpg` on the server.

#### `POST /update-address`

Update Amazon delivery address via browser automation.

```bash
curl -X POST https://<deploy>.convex.site/update-address \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Charlie Robison",
    "street_address": "123 Oak St",
    "city": "Sacramento",
    "state": "CA",
    "zip_code": "95814",
    "phone": "555-123-4567"
  }'
```

Response (immediate — the browser task runs in the background):
```json
{ "job_id": "k57abc123def456..." }
```

#### `POST /order-furniture`

Order all recommended furniture on Amazon (reads from DB). No request body needed.

```bash
curl -X POST https://<deploy>.convex.site/order-furniture
```

Response (immediate — the browser task runs in the background):
```json
{ "job_id": "k57abc123def456..." }
```

---

### GET Endpoints

All GET endpoints return JSON arrays of documents.

```bash
# Check job status
curl https://<deploy>.convex.site/jobs/<job_id>

# List pipeline steps
curl https://<deploy>.convex.site/steps

# List search constraints
curl https://<deploy>.convex.site/search-constraints

# List house analyses
curl https://<deploy>.convex.site/house-information

# List rental listings
curl https://<deploy>.convex.site/redfin-applications

# List U-Haul reservations
curl https://<deploy>.convex.site/uhaul-information

# List furniture recommendations
curl https://<deploy>.convex.site/recommended-furniture

# List order summaries
curl https://<deploy>.convex.site/amazon-order-summary
```

---

## How It Works: Kickoff / Worker Pattern

All POST endpoints use a **kickoff/worker** pattern to avoid HTTP action timeouts. Browser-use tasks can run for minutes, but Convex HTTP actions have time limits (~2 minutes). The solution:

1. **HTTP handler** calls `kickoff` — a fast `internalAction` that creates a job, schedules a background worker, and returns immediately with a `job_id`
2. **Worker** runs in the background via `ctx.scheduler.runAfter(0, ...)` — it creates the browser-use task, polls for completion, parses results, and updates the job status
3. **Client** polls `GET /jobs/{job_id}` to check progress (or uses `useQuery(api.jobs.get)` for real-time updates)

```
Client (fetch/curl)
    │
    ▼
convex/http.ts (httpRouter)
    │
    ├── POST /search-rentals  → ctx.runAction(internal.searchRentals.kickoff)
    │                              ├── Creates job (status: "pending")
    │                              ├── Schedules worker via ctx.scheduler.runAfter(0, ...)
    │                              └── Returns { job_id: "..." } immediately
    │
    │   worker (runs in background):
    │       ├── Creates browser-use task
    │       ├── Sets job status to "running"
    │       ├── Polls browser-use for completion
    │       ├── Parses results, stores in DB
    │       └── Sets job status to "completed" or "failed"
    │
    ├── POST /moving-pipeline → ctx.runAction(internal.movingPipeline.kickoff)
    │                              ├── GPT-4o house analysis (fast, synchronous)
    │                              ├── GPT-4o furniture recommendations (fast, synchronous)
    │                              ├── Schedules U-Haul worker in background
    │                              └── Returns { analysis, furniture, uhaul_job_id }
    │
    ├── POST /update-address  → ctx.runAction(internal.updateAddress.kickoff)
    ├── POST /order-furniture → ctx.runAction(internal.orderFurniture.kickoff)
    │
    ├── GET /jobs/:id         → ctx.runQuery(api.jobs.get)
    ├── GET /steps            → ctx.runQuery(api.data.listSteps)
    └── GET /...              → ctx.runQuery(api.data.list...)
```

The internal actions are `internalAction()` functions so they can only be called from other Convex functions, not directly from clients.

---

## Frontend Integration

You have two options for frontend integration:

### Option A: Direct HTTP (drop-in replacement for FastAPI)

Just change the base URL from `http://localhost:8000` to `https://<deploy>.convex.site`:

```typescript
// Before (FastAPI)
const res = await fetch("http://localhost:8000/search-rentals", { ... });

// After (Convex HTTP Actions)
const res = await fetch("https://your-deploy.convex.site/search-rentals", { ... });
```

### Option B: Convex React SDK (real-time subscriptions)

For reactive real-time updates, use the Convex client SDK:

```bash
cd frontend && npm install convex
```

```typescript
// frontend/.env.local
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

```typescript
// frontend/src/app/layout.tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function RootLayout({ children }) {
  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  );
}
```

```typescript
// Real-time queries — auto-update when data changes
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const listings = useQuery(api.data.listRedfinApplications);
const job = useQuery(api.jobs.get, { jobId });
const furniture = useQuery(api.data.listRecommendedFurniture);
```

---

## Database Schema

All 8 original MongoDB collections are preserved as Convex tables:

| Convex Table | Original MongoDB Collection | Purpose |
|--------------|---------------------------|---------|
| `steps` | `steps` | Pipeline step tracking |
| `jobs` | `jobs` | Async job status (pending/running/completed/failed) |
| `searchConstraints` | `search_constraints` | User rental search preferences |
| `currentHouseInformation` | `current_house_information` | GPT-4o house analysis results |
| `redfinApplications` | `redfin_applications` | Found rental listings |
| `uhaulInformation` | `uhaul_information` | U-Haul reservation details |
| `recommendedFurniture` | `recommended_furniture` | AI furniture recommendations |
| `amazonOrderSummary` | `amazon_order_summary` | Amazon order summaries |

### Schema Details

```typescript
// jobs table — enhanced with Browser Use task tracking
jobs: {
  type: string,           // "search_rentals" | "order_uhaul" | "update_address" | "order_furniture"
  status: string,         // "pending" | "running" | "completed" | "failed"
  params: any,
  result?: any,
  errorMessage?: string,
  browserUseTaskId?: Id<"browserUse:tasks">,    // NEW: links to component task
  browserUseExternalId?: string,                 // NEW: Browser Use Cloud task ID
}

// All other tables match their MongoDB counterparts with camelCase field names
```

---

## Browser Use Integration

### How It Works

The `browser-use-convex-component` wraps the Browser Use Cloud API. Instead of running a local browser via Python `browser-use`, tasks are sent to Browser Use's cloud infrastructure.

### Component Setup

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import browserUse from "browser-use-convex-component/convex.config.js";

const app = defineApp();
app.use(browserUse);
export default app;
```

```typescript
// convex/browserUse.ts
import { BrowserUse } from "browser-use-convex-component";
import { components } from "./_generated/api.js";

export const browserUse = new BrowserUse(components.browserUse);
```

### Task Configuration

Each browser automation task supports these options:

| Option | Type | Description |
|--------|------|-------------|
| `task` | `string` | Natural language instructions (required) |
| `startUrl` | `string` | Initial URL to navigate to |
| `maxSteps` | `number` | Max execution steps (default: 100) |
| `vision` | `boolean` | Enable visual recognition |
| `secrets` | `object` | Secure credential injection (e.g. `{ x_amazon_email: "..." }`) |
| `allowedDomains` | `string[]` | Restrict navigation to specific domains |
| `structuredOutput` | `object` | JSON schema for structured agent output |

### Secrets Handling

Sensitive data (passwords, emails) is passed via the `secrets` field. In prompts, reference them with the `x_` prefix:

```
Enter email x_amazon_email and password x_amazon_pass
```

The agent will substitute actual values at runtime without exposing them in logs.

---

## Skill Mapping

All four browser-use skills are preserved with identical prompts:

| Skill | Prompt Builder | Browser Use Task |
|-------|---------------|-----------------|
| Search Redfin Rentals | `buildRedfinSearchTask()` | Navigates Redfin, searches rentals, fills contact forms |
| Order U-Haul | `buildUhaulOrderTask()` | Signs in to U-Haul, reserves truck, stops before payment |
| Update Amazon Address | `buildUpdateAddressTask()` | Navigates Amazon addresses, adds new address |
| Amazon Furniture Cart | `buildFurnitureCartTask()` | Searches items, adds to cart, stops before checkout |

### GPT-4o Analysis (Preserved)

Two GPT-4o vision calls are preserved in the moving pipeline:

1. **House Photo Analysis** (`buildHouseAnalysisPrompt()`) — Analyzes house exterior to estimate bedrooms, square footage, recommended truck size, and worker count
2. **Furniture Recommendations** (`buildFurnitureRecommendationPrompt()`) — Generates room-by-room furniture list with Amazon search queries

### GPT-4o Parsing (Preserved)

Two parsing utilities extract structured data from agent output:

1. **`parseRedfinResults()`** — Extracts listing objects from Redfin agent output
2. **`parseUhaulResult()`** — Extracts reservation details from U-Haul agent output

---

## Migration Checklist

- [ ] Run `npm install` in `server/`
- [ ] Run `npx convex dev` to initialize and start dev server
- [ ] Set all environment variables via `npx convex env set`
- [ ] Test HTTP endpoints with curl against `https://<deploy>.convex.site`
- [ ] Update frontend base URL from `localhost:8000` to `<deploy>.convex.site`
- [ ] (Optional) Install `convex` in frontend for real-time subscriptions
- [ ] Test each endpoint: search-rentals, moving-pipeline, update-address, order-furniture
- [ ] Verify GET queries return data correctly
- [ ] (Optional) Remove old Python server files once migration is verified

---

## Differences from Old Architecture

### What Changed

1. **HTTP Actions replace FastAPI** — Same REST paths, now served by Convex at `*.convex.site`
2. **No more MongoDB** — Convex has a built-in real-time database
3. **Real-time option** — In addition to HTTP GET, you can use `useQuery()` for live subscriptions
4. **Cloud browser automation** — Browser Use Cloud replaces local Python browser-use
5. **House photo sent as base64** — Instead of reading `house.jpg` from disk, the client sends the image as a base64 data URL in the request body
6. **Jobs table enhanced** — Added `browserUseTaskId` and `browserUseExternalId` fields to link jobs with Browser Use cloud tasks
7. **CORS built-in** — CORS headers are set on all HTTP action responses (allow all origins)

### What Stayed the Same

1. **All REST endpoints** — Same paths, methods, and JSON shapes
2. **All prompt templates** — Every agent instruction is identical to the Python version
3. **GPT-4o analysis** — Same prompts, same structured output schemas
4. **GPT-4o parsing** — Same extraction logic for Redfin and U-Haul results
5. **Database schema** — Same 8 collections with the same fields (camelCase naming)
6. **Demo mode** — All browser agents still stop before submitting forms or placing orders
7. **Secrets handling** — Credentials passed securely via `secrets` / `sensitive_data`
8. **Business logic** — Budget - $1000 for max rent, truck size validation, etc.
