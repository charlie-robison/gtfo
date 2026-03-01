# Database Schema

Convex database for the Automovers platform. All tables include automatic `_id` (document ID) and `_creationTime` (Unix timestamp in ms) fields provided by Convex.

---

## jobs

Tracks every background task dispatched to FastAPI. Each skill execution (rental search, U-Haul ordering, address update, furniture ordering) creates a job so the client can poll for completion.

| Field | Type | Description |
|-------|------|-------------|
| type | string | The kind of skill being run. One of: `search_rentals`, `order_uhaul`, `update_address`, `order_furniture`. |
| status | string | Current lifecycle state. One of: `pending` (created, not yet started), `running` (skill is executing), `completed` (finished successfully), `failed` (error occurred). |
| params | any | The input parameters passed to the skill. Shape varies by job type. |
| result | any? | The output returned by the skill on success. `undefined` while pending/running. Shape varies by job type. |
| errorMessage | string? | Error details if the job failed. `undefined` unless status is `failed`. |
| browserUseExternalId | string? | External session ID from the Browser Use API. Used to track/resume browser automation sessions. |
| browserUseTaskId | string? | Internal task ID from the Browser Use component. Used for cleanup and status tracking. |

**Written by:** `POST /search-rentals`, `POST /moving-pipeline`, `POST /update-address`, `POST /order-furniture`

**Read by:** `GET /jobs`, `GET /jobs?job_id=...`

---

## steps

Tracks the high-level pipeline steps the user has initiated. Each step represents a major phase in the moving process with its associated cost.

| Field | Type | Description |
|-------|------|-------------|
| stepNum | number | Zero-indexed step number indicating order in the pipeline. |
| stepName | string | Human-readable name for this step (e.g. `"Apply to Listings"`). |
| currentCost | number | Running cost in dollars accumulated during this step. Starts at 0 and updates as actions complete. |

**Written by:** `POST /search-rentals`

**Read by:** `GET /steps`

---

## search_constraints

Stores the rental search parameters submitted by the user. One record per search request. Used to pass context between pipeline stages (e.g. the initial address feeds into U-Haul pickup location).

| Field | Type | Description |
|-------|------|-------------|
| budget | number | Total monthly budget in dollars. Max rent is derived as `budget - 1000`. |
| city | string | City to search for rentals (e.g. `"Sacramento"`). |
| state | string | Two-letter state abbreviation (e.g. `"CA"`). |
| fullName | string | Applicant's full name for rental applications. |
| phone | string | Applicant's phone number for rental applications. |
| moveInDate | string | Desired move-in date (e.g. `"03/15/2026"`). |
| minBedrooms | number | Minimum number of bedrooms to filter by. |
| minBathrooms | number | Minimum number of bathrooms to filter by. |
| maxResults | number | Maximum number of listings to process per search. |
| initialAddress | string | The user's current address. Used as U-Haul pickup location and moving help loading address. |

**Written by:** `POST /search-rentals`

**Read by:** `GET /search-constraints`, `POST /moving-pipeline` (reads `initialAddress` for U-Haul pickup)

---

## current_house_information

GPT-4o vision analysis of the user's house photo. Contains size estimates and moving recommendations that drive truck selection and labor planning.

| Field | Type | Description |
|-------|------|-------------|
| description | string | Brief text description of the house from the photo (e.g. `"A two-story suburban home with attached garage"`). |
| estimatedBedrooms | number | Estimated number of bedrooms based on the photo. |
| estimatedSquareFootage | number | Estimated total square footage of the home. |
| stuffVolumeEstimate | string | Estimated volume of belongings to move (e.g. `"800-1200 cubic feet"`). |
| recommendedTruckSize | string | The U-Haul truck size to book. Must be one of: `8' Pickup Truck`, `9' Cargo Van`, `10' Truck`, `12' Truck`, `15' Truck`, `17' Truck`, `20' Truck`, `26' Truck`. |
| reasoning | string | GPT-4o's explanation for why it chose that truck size. |
| recommendedWorkers | number | Number of moving helpers to hire. |
| laborReasoning | string | GPT-4o's explanation for the worker count recommendation. |

**Written by:** `POST /moving-pipeline`

**Read by:** `GET /house-information`

---

## redfin_applications

Rental listings found and contacted by the Redfin browser agent. Each record is one listing the agent applied to on behalf of the user.

| Field | Type | Description |
|-------|------|-------------|
| address | string | Full street address of the rental listing. |
| monthlyRentPrice | number | Monthly rent in dollars. |
| numBedrooms | number | Number of bedrooms in the listing. |
| numBathrooms | number | Number of bathrooms in the listing. |
| squareFootage | number | Total square footage of the rental. |
| moveInCost | number | Total move-in cost in dollars (first month + deposit + fees). |
| url | string | Direct URL to the listing on Redfin. |

**Written by:** Background action after `POST /search-rentals` completes

**Read by:** `GET /redfin-applications`

---

## uhaul_information

U-Haul reservation details captured by the browser agent after completing the booking flow (stops before payment).

| Field | Type | Description |
|-------|------|-------------|
| vehicle | string | The truck or van reserved (e.g. `"17' Truck"`). |
| pickupLocation | string | Address of the U-Haul pickup location. |
| pickupTime | string | Scheduled pickup time (e.g. `"10:00 AM"`). |
| dropOffLocation | string | Address of the U-Haul drop-off location. |
| movingHelpProvider | string | Name of the moving labor provider if hired through U-Haul. |
| numWorkers | number | Number of moving helpers booked. |
| numHours | number | Number of hours the workers are booked for. |
| totalCost | number | Total reservation cost in dollars (truck + labor). |

**Written by:** Background action after `POST /moving-pipeline` schedules U-Haul ordering

**Read by:** `GET /uhaul-information`

---

## recommended_furniture

Furniture items recommended by GPT-4o based on the house analysis. Each item includes an Amazon search query optimized for finding a good deal.

| Field | Type | Description |
|-------|------|-------------|
| itemName | string | Name of the furniture piece (e.g. `"Queen Bed Frame"`). |
| room | string | Which room the item is for (e.g. `"Master Bedroom"`, `"Living Room"`). |
| amazonSearchQuery | string | Optimized Amazon search query to find this item (e.g. `"queen bed frame with headboard"`). |
| priority | string | How important the item is. One of: `essential` (must-have for daily living), `nice-to-have` (improves comfort but not required). |

**Written by:** `POST /moving-pipeline`

**Read by:** `GET /recommended-furniture`, `POST /order-furniture` (reads items to build cart)

---

## amazon_order_summary

Summary of the Amazon cart after the furniture ordering browser agent runs. Contains a text recap of what was added and the total.

| Field | Type | Description |
|-------|------|-------------|
| summary | string | Free-text summary of the cart contents and total from the browser agent (e.g. `"Added 12 items to cart. Total: $2,450.00"`). |

**Written by:** Background action after `POST /order-furniture` completes

**Read by:** `GET /amazon-order-summary`

---

## screenshots

Screenshots captured during browser-use skill sessions. Each row stores metadata about one screenshot along with a reference to the image stored in Convex file storage. Images are stored as PNGs via `ctx.storage.store()` since they can exceed the 1MB Convex document limit.

| Field | Type | Description |
|-------|------|-------------|
| jobId | id (jobs) | Reference to the job that produced this screenshot. |
| jobType | string | The kind of skill that was running. One of: `search_rentals`, `order_uhaul`, `update_address`, `order_furniture`. |
| stepNumber | number | Zero-indexed step number in the agent's action history. |
| pageUrl | string | The URL the browser was visiting when the screenshot was taken. |
| pageTitle | string | The page title at the time the screenshot was taken. |
| storageId | id (_storage) | Convex file storage ID for the PNG image. Resolve to a public URL via `ctx.storage.getUrl()`. |

**Indexes:**
- `by_job_type` — on `jobType`. For listing all screenshots from a given skill type.
- `by_job_id` — on `jobId`. For listing all screenshots from a specific job.

**Written by:** Background actions after `POST /search-rentals`, `POST /moving-pipeline` (U-Haul sub-job), `POST /update-address`, `POST /order-furniture`

**Read by:** `GET /screenshots?job_type=...`, `GET /screenshots?job_id=...`
