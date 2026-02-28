"""
Automovers FastAPI Server

Endpoints:
  POST /search-rentals      — Search & apply to Redfin rentals (background)
  POST /moving-pipeline     — Analyze house photo + furniture recs + UHaul order
  POST /update-address      — Update Amazon delivery address (background)
  POST /order-furniture     — Order recommended furniture on Amazon (background)
  GET  /jobs/{job_id}       — Check job status

Run:
  cd server && uvicorn main:app --reload
"""

import base64
import json
import sys
import traceback
import uuid
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI

# Load env files
load_dotenv(Path(__file__).resolve().parent / ".env")

# Add project root to path for skill imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import (
    jobs_col,
    steps_col,
    search_constraints_col,
    current_house_information_col,
    redfin_applications_col,
    uhaul_information_col,
    recommended_furniture_col,
    amazon_order_summary_col,
)
from models import (
    SearchRentalsRequest,
    MovingPipelineRequest,
    MovingPipelineResponse,
    UpdateAddressRequest,
    HouseAnalysis,
    FurnitureItem,
)
from server.utils import parse_redfin_results, parse_uhaul_result

app = FastAPI(title="Automovers API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

VALID_TRUCK_SIZES = [
    "8' Pickup Truck",
    "9' Cargo Van",
    "10' Truck",
    "12' Truck",
    "15' Truck",
    "17' Truck",
    "20' Truck",
    "26' Truck",
]


# ── Helpers ───────────────────────────────────────────────────────

async def _create_job(job_type: str, params: dict) -> str:
    """Insert a pending job and return its string ID."""
    job_id = uuid.uuid4().hex
    await jobs_col().insert_one({
        "_id": job_id,
        "type": job_type,
        "status": "pending",
        "params": params,
        "result": None,
        "error_message": None,
    })
    return job_id


async def _complete_job(job_id: str, result) -> None:
    await jobs_col().update_one(
        {"_id": job_id},
        {"$set": {"status": "completed", "result": result}},
    )


async def _fail_job(job_id: str, error_message: str) -> None:
    await jobs_col().update_one(
        {"_id": job_id},
        {"$set": {"status": "failed", "error_message": error_message}},
    )


async def _set_job_running(job_id: str) -> None:
    await jobs_col().update_one(
        {"_id": job_id},
        {"$set": {"status": "running"}},
    )


def _strip_markdown_fences(text: str) -> str:
    if text.startswith("```"):
        lines = text.split("\n")
        return "\n".join(l for l in lines if not l.strip().startswith("```"))
    return text


# ── Background task runners ──────────────────────────────────────

async def _run_search_rentals(job_id: str, params: dict) -> None:
    from server.skills.search_redfin_rentals import search_and_contact_redfin_rentals

    await _set_job_running(job_id)
    try:
        result = await search_and_contact_redfin_rentals(
            city=params["city"],
            state=params["state"],
            max_rent=params["max_rent"],
            full_name=params["full_name"],
            phone=params["phone"],
            move_in_date=params["move_in_date"],
            min_bedrooms=params.get("min_bedrooms", 1),
            min_bathrooms=params.get("min_bathrooms", 1),
            max_results=params.get("max_results", 5),
        )

        agent_output = str(result)
        listings = parse_redfin_results(agent_output)

        for listing in listings:
            await redfin_applications_col().insert_one({
                "address": listing.get("address", ""),
                "monthly_rent_price": listing.get("monthlyRentPrice", 0),
                "num_bedrooms": listing.get("numBedrooms", 0),
                "num_bathrooms": listing.get("numBathrooms", 0),
                "square_footage": listing.get("squareFootage", 0),
                "move_in_cost": listing.get("moveInCost", 0),
                "url": listing.get("url", ""),
            })

        await _complete_job(job_id, {"listings_count": len(listings)})
    except Exception as e:
        await _fail_job(job_id, f"{type(e).__name__}: {e}\n{traceback.format_exc()}")


async def _run_order_uhaul(job_id: str, params: dict) -> None:
    from server.skills.order_uhaul import order_uhaul

    await _set_job_running(job_id)
    try:
        result = await order_uhaul(
            pickup_location=params["pickup_location"],
            dropoff_location=params["dropoff_location"],
            pickup_date=params["pickup_date"],
            pickup_time=params.get("pickup_time", "10:00 AM"),
            vehicle_type=params.get("vehicle_type", "truck"),
            num_workers=params.get("num_workers", 0),
            loading_address=params.get("loading_address", ""),
        )

        agent_output = str(result)
        uhaul_data = parse_uhaul_result(agent_output)

        await uhaul_information_col().insert_one({
            "vehicle": uhaul_data.get("vehicle", ""),
            "pickup_location": uhaul_data.get("pickupLocation", ""),
            "pickup_time": uhaul_data.get("pickupTime", ""),
            "drop_off_location": uhaul_data.get("dropOffLocation", ""),
            "moving_help_provider": uhaul_data.get("movingHelpProvider", ""),
            "num_workers": uhaul_data.get("numWorkers", 0),
            "num_hours": uhaul_data.get("numHours", 0),
            "total_cost": uhaul_data.get("totalCost", 0),
        })

        await _complete_job(job_id, uhaul_data)
    except Exception as e:
        await _fail_job(job_id, f"{type(e).__name__}: {e}\n{traceback.format_exc()}")


async def _run_update_address(job_id: str, params: dict) -> None:
    from server.skills.update_amazon_address import update_amazon_address

    await _set_job_running(job_id)
    try:
        await update_amazon_address(
            full_name=params["full_name"],
            street_address=params["street_address"],
            city=params["city"],
            state=params["state"],
            zip_code=params["zip_code"],
            phone=params.get("phone", ""),
        )
        await _complete_job(job_id, "Updated all addresses to new address!")
    except Exception as e:
        await _fail_job(job_id, f"{type(e).__name__}: {e}\n{traceback.format_exc()}")


async def _run_order_furniture(job_id: str, params: dict) -> None:
    from server.skills.amazon_furniture_cart import amazon_furniture_cart

    await _set_job_running(job_id)
    try:
        result = await amazon_furniture_cart(furniture_items=params["items"])
        agent_output = str(result)

        await amazon_order_summary_col().insert_one({"summary": agent_output})
        await _complete_job(job_id, {"summary": agent_output})
    except Exception as e:
        await _fail_job(job_id, f"{type(e).__name__}: {e}\n{traceback.format_exc()}")


# ── Endpoints ─────────────────────────────────────────────────────

@app.get("/jobs/{job_id}")
async def get_job(job_id: str):
    """Check the status of a background job."""
    doc = await jobs_col().find_one({"_id": job_id})
    if not doc:
        return {"error": "Job not found"}
    doc["id"] = doc.pop("_id")
    return doc


@app.post("/search-rentals")
async def search_rentals(req: SearchRentalsRequest, background_tasks: BackgroundTasks):
    """
    Endpoint 1: Search & apply to Redfin rentals.

    Immediate: stores search constraints + step record.
    Background: runs browser skill, parses results, writes redfin_applications.
    """
    max_results = 5

    # Store search constraints
    await search_constraints_col().insert_one({
        "budget": req.budget,
        "city": req.city,
        "state": req.state,
        "full_name": req.full_name,
        "phone": req.phone,
        "move_in_date": req.move_in_date,
        "min_bedrooms": req.min_bedrooms,
        "min_bathrooms": req.min_bathrooms,
        "max_results": max_results,
        "initial_address": req.initial_address,
    })

    # Store step
    await steps_col().insert_one({
        "step_num": 0,
        "step_name": "Apply to Listings",
        "current_cost": 0,
    })

    # Create job and run in background
    params = {
        "city": req.city,
        "state": req.state,
        "max_rent": req.budget - 1000,
        "full_name": req.full_name,
        "phone": req.phone,
        "move_in_date": req.move_in_date,
        "min_bedrooms": req.min_bedrooms,
        "min_bathrooms": req.min_bathrooms,
        "max_results": max_results,
    }
    job_id = await _create_job("search_rentals", params)
    background_tasks.add_task(_run_search_rentals, job_id, params)

    return {"job_id": job_id}

@app.post("/cancel-current-lease")
async def cancel_current_lease(background_tasks: BackgroundTasks):
    ## TODO: IMPLEMENT THIS!!! INCLUDES UTILITIES!!
    return None

@app.post("/moving-pipeline")
async def moving_pipeline(req: MovingPipelineRequest, background_tasks: BackgroundTasks):
    """
    Endpoint 2: Analyze house photo → furniture recs → order UHaul.

    Immediate: calls OpenAI GPT-4o for house analysis + furniture recs,
               writes records to DB.
    Background: runs UHaul browser skill.
    """
    openai = AsyncOpenAI()
    house_image_path = Path(__file__).resolve().parent / "house.jpg"
    photo_b64 = base64.b64encode(house_image_path.read_bytes()).decode()
    image_url = f"data:image/jpeg;base64,{photo_b64}"
    truck_options = "\n".join(f"  - {s}" for s in VALID_TRUCK_SIZES)

    # ── Step 1: House photo analysis ──────────────────────────────
    house_prompt = f"""Analyze this photo of a house and estimate how much stuff would need to be
moved if someone were moving out of it. Based on your analysis, recommend
the most appropriate U-Haul truck size AND the number of moving helpers needed.

Consider:
- The apparent size of the house (stories, width, visible rooms/windows)
- Estimated number of bedrooms
- Estimated square footage
- Typical furniture and belongings for a home of this size
- The volume of stuff that would need to be transported

Valid U-Haul truck sizes (you MUST pick one of these exactly):
{truck_options}

Truck size guidelines:
- Studio / 1-bedroom apartment: 8' Pickup Truck or 9' Cargo Van or 10' Truck
- 1-2 bedroom home: 12' Truck or 15' Truck
- 2-3 bedroom home: 15' Truck or 17' Truck
- 3-4 bedroom home: 20' Truck
- 4+ bedroom / large home: 26' Truck

Moving labor guidelines (number of workers):
- Studio / 1-bedroom: 2 workers
- 2-3 bedroom: 2-3 workers
- 3-4 bedroom: 3-4 workers
- 4+ bedroom / large home: 4+ workers

Respond with ONLY valid JSON matching this schema (no markdown, no extra text):
{{
  "house_description": "<brief description of the house>",
  "estimated_bedrooms": <integer>,
  "estimated_square_footage": <integer>,
  "stuff_volume_estimate": "<e.g. 800-1200 cubic feet>",
  "recommended_truck_size": "<exact string from the list above>",
  "reasoning": "<explanation of your truck size recommendation>",
  "recommended_workers": <integer>,
  "labor_reasoning": "<explanation of your worker count recommendation>"
}}"""

    house_response = await openai.chat.completions.create(
        model="gpt-4o",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": image_url}},
                {"type": "text", "text": house_prompt},
            ],
        }],
    )

    raw_house = _strip_markdown_fences(
        house_response.choices[0].message.content.strip()
    )
    analysis_data = json.loads(raw_house)
    analysis = HouseAnalysis(**analysis_data)

    # Validate truck size
    if analysis.recommended_truck_size not in VALID_TRUCK_SIZES:
        match = next(
            (s for s in VALID_TRUCK_SIZES
             if s.lower() in analysis.recommended_truck_size.lower()),
            None,
        )
        analysis.recommended_truck_size = match or "15' Truck"

    # Write house analysis to DB
    await current_house_information_col().insert_one({
        "description": analysis.house_description,
        "estimated_bedrooms": analysis.estimated_bedrooms,
        "estimated_square_footage": analysis.estimated_square_footage,
        "stuff_volume_estimate": analysis.stuff_volume_estimate,
        "recommended_truck_size": analysis.recommended_truck_size,
        "reasoning": analysis.reasoning,
        "recommended_workers": analysis.recommended_workers,
        "labor_reasoning": analysis.labor_reasoning,
    })

    # ── Step 2: Furniture recommendations ─────────────────────────
    furniture_prompt = f"""You are a moving assistant. Based on the house details below,
recommend the furniture they will need to furnish it.

House details from prior analysis:
- Estimated bedrooms: {analysis.estimated_bedrooms}
- Estimated sq footage: {analysis.estimated_square_footage}
- Description: {analysis.house_description}

For each room you can infer from the house (bedrooms, living room, dining
room, kitchen, home office, etc.), list the essential furniture items
a person would need to buy.

For each item, provide an optimized Amazon search query that would find
a good, reasonably-priced version of that item.

Mark each item as "essential" (must-have for daily living) or
"nice-to-have" (improves comfort but not strictly necessary).

Respond with ONLY valid JSON matching this schema (no markdown, no extra text):
{{
  "reasoning": "<brief explanation of how you determined furniture needs>",
  "items": [
    {{
      "item_name": "<e.g. Queen Bed Frame>",
      "room": "<e.g. Master Bedroom>",
      "amazon_search_query": "<e.g. queen bed frame with headboard>",
      "priority": "<essential or nice-to-have>"
    }}
  ]
}}"""

    furniture_response = await openai.chat.completions.create(
        model="gpt-4o",
        max_tokens=2048,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": image_url}},
                {"type": "text", "text": furniture_prompt},
            ],
        }],
    )

    raw_furniture = _strip_markdown_fences(
        furniture_response.choices[0].message.content.strip()
    )
    furniture_data = json.loads(raw_furniture)
    furniture_items = [FurnitureItem(**item) for item in furniture_data["items"]]

    # Write furniture to DB
    for item in furniture_items:
        await recommended_furniture_col().insert_one({
            "item_name": item.item_name,
            "room": item.room,
            "amazon_search_query": item.amazon_search_query,
            "priority": item.priority,
        })

    # ── Step 3: Create UHaul job (background) ─────────────────────
    # Use initial_address from search constraints as pickup/loading address
    constraints_doc = await search_constraints_col().find_one(
        sort=[("_id", -1)]
    )
    initial_address = constraints_doc["initial_address"] if constraints_doc else ""

    uhaul_params = {
        "pickup_location": initial_address,
        "dropoff_location": req.destination_address,
        "pickup_date": req.date,
        "pickup_time": req.pickup_time,
        "vehicle_type": analysis.recommended_truck_size,
        "num_workers": analysis.recommended_workers,
        "loading_address": initial_address,
    }
    job_id = await _create_job("order_uhaul", uhaul_params)
    background_tasks.add_task(_run_order_uhaul, job_id, uhaul_params)

    return MovingPipelineResponse(
        analysis=analysis,
        furniture=furniture_items,
        uhaul_job_id=job_id,
    )

@app.post("/determine-addresses")
async def determine_addresses(background_tasks: BackgroundTasks):
    ## TODO: IMPLEMENT THIS!!
    return None

@app.post("/update-address")
async def update_address(req: UpdateAddressRequest, background_tasks: BackgroundTasks):
    """
    Endpoint 3: Update Amazon delivery address.

    Background: runs browser skill to update address.
    """
    params = {
        "full_name": req.full_name,
        "street_address": req.street_address,
        "city": req.city,
        "state": req.state,
        "zip_code": req.zip_code,
        "phone": req.phone,
    }
    job_id = await _create_job("update_address", params)
    background_tasks.add_task(_run_update_address, job_id, params)

    return {"job_id": job_id}


@app.post("/order-furniture")
async def order_furniture(background_tasks: BackgroundTasks):
    """
    Endpoint 4: Order all recommended furniture on Amazon.

    Reads furniture items from DB, creates a background job to add them to cart.
    """
    docs = await recommended_furniture_col().find().to_list(length=100)
    search_queries = [doc["amazon_search_query"] for doc in docs]

    if not search_queries:
        return {"error": "No recommended furniture found. Run /moving-pipeline first."}

    params = {"items": search_queries}
    job_id = await _create_job("order_furniture", params)
    background_tasks.add_task(_run_order_furniture, job_id, params)

    return {"job_id": job_id}

@app.post("/setup-utilities")
async def setup_utilities(background_tasks: BackgroundTasks):
    ## TODO: IMPLEMENT THIS!!
    return None


# ── Read endpoints (query stored data) ───────────────────────────

@app.get("/steps")
async def list_steps():
    docs = await steps_col().find().to_list(length=100)
    for d in docs:
        d["id"] = str(d.pop("_id"))
    return docs


@app.get("/search-constraints")
async def list_search_constraints():
    docs = await search_constraints_col().find().to_list(length=100)
    for d in docs:
        d["id"] = str(d.pop("_id"))
    return docs


@app.get("/house-information")
async def list_house_information():
    docs = await current_house_information_col().find().to_list(length=100)
    for d in docs:
        d["id"] = str(d.pop("_id"))
    return docs


@app.get("/redfin-applications")
async def list_redfin_applications():
    docs = await redfin_applications_col().find().to_list(length=100)
    for d in docs:
        d["id"] = str(d.pop("_id"))
    return docs


@app.get("/uhaul-information")
async def list_uhaul_information():
    docs = await uhaul_information_col().find().to_list(length=100)
    for d in docs:
        d["id"] = str(d.pop("_id"))
    return docs


@app.get("/recommended-furniture")
async def list_recommended_furniture():
    docs = await recommended_furniture_col().find().to_list(length=100)
    for d in docs:
        d["id"] = str(d.pop("_id"))
    return docs


@app.get("/amazon-order-summary")
async def list_amazon_order_summary():
    docs = await amazon_order_summary_col().find().to_list(length=100)
    for d in docs:
        d["id"] = str(d.pop("_id"))
    return docs
