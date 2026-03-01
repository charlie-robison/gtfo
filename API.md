# Automovers API

## Architecture

- **Convex** (`https://amiable-viper-68.convex.site`) — HTTP API, database, job management
- **FastAPI** (local via ngrok) — Runs browser skills/agents only, no database access

All client requests go through Convex. Convex writes to its DB, schedules background actions, and calls FastAPI only to execute skills.

---

## Action Endpoints (POST)

### POST /search-rentals

Search & apply to Redfin rental listings. Creates a background job that runs the browser agent.

**Input:**

```json
{
  "budget": 3000,
  "city": "Sacramento",
  "state": "CA",
  "full_name": "John Doe",
  "phone": "5551234567",
  "move_in_date": "03/15/2026",
  "min_bedrooms": 1,
  "min_bathrooms": 1,
  "initial_address": "123 Main St"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| budget | int | yes | — | Total budget |
| city | string | yes | — | City to search |
| state | string | yes | — | State abbreviation |
| full_name | string | yes | — | Applicant name |
| phone | string | yes | — | Phone number |
| move_in_date | string | yes | — | Desired move-in date |
| min_bedrooms | int | no | 1 | Minimum bedrooms |
| min_bathrooms | int | no | 1 | Minimum bathrooms |
| initial_address | string | no | "" | Current address |

**Output:**

```json
{ "job_id": "jd7..." }
```

**Side effects:** Writes to `search_constraints`, `steps`, `jobs`. Background action writes to `redfin_applications`.

---

### POST /moving-pipeline

Analyze house photo with GPT-4o, get furniture recommendations, and schedule U-Haul ordering.

**Input:**

```json
{
  "destination_address": "456 Oak Ave, Sacramento, CA 95814",
  "date": "03/20/2026",
  "pickup_time": "10:00 AM"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| destination_address | string | yes | — | Address moving to |
| date | string | yes | — | Move date |
| pickup_time | string | no | "10:00 AM" | Pickup time |

**Output:**

```json
{
  "analysis": {
    "house_description": "A two-story suburban home...",
    "estimated_bedrooms": 3,
    "estimated_square_footage": 1800,
    "stuff_volume_estimate": "800-1200 cubic feet",
    "recommended_truck_size": "17' Truck",
    "reasoning": "...",
    "recommended_workers": 3,
    "labor_reasoning": "..."
  },
  "furniture": [
    {
      "item_name": "Queen Bed Frame",
      "room": "Master Bedroom",
      "amazon_search_query": "queen bed frame with headboard",
      "priority": "essential"
    }
  ],
  "uhaulJobId": "jd7..."
}
```

**Side effects:** Writes to `current_house_information`, `recommended_furniture`, `jobs`. Schedules U-Haul background action.

---

### POST /update-address

Update Amazon delivery address. Creates a background job.

**Input:**

```json
{
  "full_name": "John Doe",
  "street_address": "456 Oak Ave",
  "city": "Sacramento",
  "state": "CA",
  "zip_code": "95814",
  "phone": "5551234567"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| full_name | string | yes | — | Full name |
| street_address | string | yes | — | Street address |
| city | string | yes | — | City |
| state | string | yes | — | State |
| zip_code | string | yes | — | ZIP code |
| phone | string | no | "" | Phone number |

**Output:**

```json
{ "job_id": "jd7..." }
```

---

### POST /order-furniture

Order all recommended furniture on Amazon. Reads items from Convex DB (run `/moving-pipeline` first).

**Input:** None (empty body)

**Output:**

```json
{ "job_id": "jd7..." }
```

**Error:**

```json
{ "error": "No recommended furniture found. Run /moving-pipeline first." }
```

---

### POST /cancel-current-lease

**Not yet implemented.** Returns `null`.

### POST /determine-addresses

**Not yet implemented.** Returns `null`.

### POST /setup-utilities

**Not yet implemented.** Returns `null`.

---

## Read Endpoints (GET — Convex HTTP)

All GET endpoints are Convex HTTP actions that read directly from the Convex database. No request body needed.

Base URL: `https://amiable-viper-68.convex.site`

---

### GET /jobs

`https://amiable-viper-68.convex.site/jobs`

List all background jobs, or get one by ID.

**Query params:** `?job_id=jd7...` (optional)

**Output (list):**

```json
[
  {
    "_id": "jd7...",
    "_creationTime": 1709312345678,
    "type": "search_rentals",
    "status": "completed",
    "params": { ... },
    "result": { "listingsCount": 5 },
    "errorMessage": null
  }
]
```

**Output (single, with `?job_id=...`):**

```json
{
  "_id": "jd7...",
  "_creationTime": 1709312345678,
  "type": "order_uhaul",
  "status": "running",
  "params": { ... },
  "result": null,
  "errorMessage": null
}
```

| Field | Type | Values |
|-------|------|--------|
| type | string | `search_rentals` \| `order_uhaul` \| `update_address` \| `order_furniture` |
| status | string | `pending` \| `running` \| `completed` \| `failed` |

---

### GET /steps

`https://amiable-viper-68.convex.site/steps`

List all pipeline steps.

```json
[{ "_id": "...", "_creationTime": 1709312345678, "stepNum": 0, "stepName": "Apply to Listings", "currentCost": 0 }]
```

---

### GET /search-constraints

`https://amiable-viper-68.convex.site/search-constraints`

List all rental search constraints submitted.

```json
[{
  "_id": "...", "_creationTime": 1709312345678,
  "budget": 3000, "city": "Sacramento", "state": "CA",
  "fullName": "John Doe", "phone": "5551234567", "moveInDate": "03/15/2026",
  "minBedrooms": 1, "minBathrooms": 1, "maxResults": 5, "initialAddress": "123 Main St"
}]
```

---

### GET /house-information

`https://amiable-viper-68.convex.site/house-information`

List all house analysis records from the moving pipeline.

```json
[{
  "_id": "...", "_creationTime": 1709312345678,
  "description": "A two-story suburban home...",
  "estimatedBedrooms": 3, "estimatedSquareFootage": 1800,
  "stuffVolumeEstimate": "800-1200 cubic feet",
  "recommendedTruckSize": "17' Truck", "reasoning": "...",
  "recommendedWorkers": 3, "laborReasoning": "..."
}]
```

---

### GET /redfin-applications

`https://amiable-viper-68.convex.site/redfin-applications`

List all Redfin rental applications submitted by the browser agent.

```json
[{
  "_id": "...", "_creationTime": 1709312345678,
  "address": "789 Pine St, Sacramento, CA",
  "monthlyRentPrice": 2200, "numBedrooms": 2, "numBathrooms": 1,
  "squareFootage": 950, "moveInCost": 4400, "url": "https://redfin.com/..."
}]
```

---

### GET /uhaul-information

`https://amiable-viper-68.convex.site/uhaul-information`

List all U-Haul reservation records.

```json
[{
  "_id": "...", "_creationTime": 1709312345678,
  "vehicle": "17' Truck", "pickupLocation": "123 Main St",
  "pickupTime": "10:00 AM", "dropOffLocation": "456 Oak Ave",
  "movingHelpProvider": "Moving Help Co", "numWorkers": 3,
  "numHours": 4, "totalCost": 285.50
}]
```

---

### GET /recommended-furniture

`https://amiable-viper-68.convex.site/recommended-furniture`

List all furniture items recommended by the moving pipeline.

```json
[{
  "_id": "...", "_creationTime": 1709312345678,
  "itemName": "Queen Bed Frame", "room": "Master Bedroom",
  "amazonSearchQuery": "queen bed frame with headboard", "priority": "essential"
}]
```

---

### GET /screenshots

`https://amiable-viper-68.convex.site/screenshots`

List screenshots captured during browser-use skill sessions. Filter by job type or specific job ID.

**Query params:** `?job_type=search_rentals` or `?job_id=jd7...` (at least one required)

**Output:**

```json
[
  {
    "_id": "...",
    "_creationTime": 1709312345678,
    "jobId": "jd7...",
    "jobType": "search_rentals",
    "stepNumber": 3,
    "pageUrl": "https://redfin.com/...",
    "pageTitle": "Redfin - Apartments for Rent",
    "storageId": "...",
    "url": "https://amiable-viper-68.convex.cloud/api/storage/..."
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| jobId | id | Reference to the job that produced this screenshot |
| jobType | string | `search_rentals` \| `order_uhaul` \| `update_address` \| `order_furniture` |
| stepNumber | number | Zero-indexed step in the agent's history |
| pageUrl | string | URL the browser was on when the screenshot was taken |
| pageTitle | string | Page title at the time of the screenshot |
| storageId | id | Convex file storage reference |
| url | string | Resolved public URL to the screenshot image (PNG) |

---

### GET /amazon-order-summary

`https://amiable-viper-68.convex.site/amazon-order-summary`

List all Amazon order summaries from furniture ordering.

```json
[{ "_id": "...", "_creationTime": 1709312345678, "summary": "Added 12 items to cart. Total: $2,450.00..." }]
```

---

## Endpoint Summary

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/search-rentals` | Search & apply to Redfin rentals |
| POST | `/moving-pipeline` | Analyze house + furniture recs + schedule U-Haul |
| POST | `/update-address` | Update Amazon delivery address |
| POST | `/order-furniture` | Order recommended furniture on Amazon |
| POST | `/cancel-current-lease` | Cancel current lease (TODO) |
| POST | `/determine-addresses` | Determine addresses (TODO) |
| POST | `/setup-utilities` | Set up utilities (TODO) |
| GET | `/jobs` | List all jobs or get one by `?job_id=` |
| GET | `/steps` | List all pipeline steps |
| GET | `/search-constraints` | List all search constraints |
| GET | `/house-information` | List all house analysis records |
| GET | `/redfin-applications` | List all Redfin applications |
| GET | `/uhaul-information` | List all U-Haul reservations |
| GET | `/recommended-furniture` | List all recommended furniture |
| GET | `/screenshots` | List screenshots by `?job_type=` or `?job_id=` |
| GET | `/amazon-order-summary` | List all Amazon order summaries |

All endpoints are at `https://amiable-viper-68.convex.site`.

---

## Convex Client SDK

These queries can also be called directly via the Convex React/JS client (real-time subscriptions):

| Function | Description |
|----------|-------------|
| `api.queries.listJobs` | List all jobs |
| `api.queries.getJob` | Get a single job by ID |
| `api.queries.listSteps` | List all steps |
| `api.queries.listSearchConstraints` | List all search constraints |
| `api.queries.listHouseInformation` | List all house analysis records |
| `api.queries.listRedfinApplications` | List all Redfin applications |
| `api.queries.listUhaulInformation` | List all U-Haul reservations |
| `api.queries.listRecommendedFurniture` | List all recommended furniture |
| `api.queries.listAmazonOrderSummary` | List all Amazon order summaries |
| `api.queries.listScreenshotsByJobType` | List screenshots by job type (with resolved URLs) |
| `api.queries.listScreenshotsByJobId` | List screenshots by job ID (with resolved URLs) |

---

## FastAPI Skill Endpoints (Internal)

Called by Convex actions only. Not for direct client use.

| Endpoint | Description |
|----------|-------------|
| `POST /run-search-rentals` | Run Redfin browser agent, return parsed listings |
| `POST /run-moving-analysis` | Run GPT-4o house analysis + furniture recs |
| `POST /run-order-uhaul` | Run U-Haul browser agent, return parsed result |
| `POST /run-update-address` | Run Amazon address update browser agent |
| `POST /run-order-furniture` | Run Amazon furniture cart browser agent |
