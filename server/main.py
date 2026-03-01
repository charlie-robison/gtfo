"""
Automovers FastAPI Server — Skill Runner

Pure skill/agent execution layer. No database operations.
Convex handles all reads, writes, and job management.

Endpoints:
  POST /run-search-rentals     — Run Redfin search skill, return parsed listings
  POST /run-moving-analysis    — Run GPT-4o house analysis + furniture recs
  POST /run-order-uhaul        — Run U-Haul ordering skill, return parsed result
  POST /run-update-address     — Run Amazon address update skill
  POST /run-order-furniture    — Run Amazon furniture cart skill

Run:
  cd server && uvicorn main:app --reload
"""

import base64
import json
import sys
import traceback
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI

load_dotenv(Path(__file__).resolve().parent / ".env")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from server.utils import parse_redfin_results, parse_uhaul_result

app = FastAPI(title="Automovers Skill Runner")

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


def _strip_markdown_fences(text: str) -> str:
    if text.startswith("```"):
        lines = text.split("\n")
        return "\n".join(l for l in lines if not l.strip().startswith("```"))
    return text


# ── Skill Endpoints ──────────────────────────────────────────────


@app.post("/run-search-rentals")
async def run_search_rentals(params: dict):
    """Run the Redfin search skill and return parsed listings."""
    from server.skills.search_redfin_rentals import search_and_contact_redfin_rentals

    try:
        result = await search_and_contact_redfin_rentals(
            city=params["city"],
            state=params["state"],
            max_rent=params["maxRent"],
            full_name=params["fullName"],
            phone=params["phone"],
            move_in_date=params["moveInDate"],
            min_bedrooms=params.get("minBedrooms", 1),
            min_bathrooms=params.get("minBathrooms", 1),
            max_results=params.get("maxResults", 5),
        )

        agent_output = str(result)
        listings = parse_redfin_results(agent_output)
        return {"listings": listings}

    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}", "listings": []}


@app.post("/run-moving-analysis")
async def run_moving_analysis(params: dict):
    """Run GPT-4o house analysis and furniture recommendations."""
    openai = AsyncOpenAI()
    house_image_path = Path(__file__).resolve().parent / "house.jpg"
    photo_b64 = base64.b64encode(house_image_path.read_bytes()).decode()
    image_url = f"data:image/jpeg;base64,{photo_b64}"
    truck_options = "\n".join(f"  - {s}" for s in VALID_TRUCK_SIZES)

    # ── House photo analysis ─────────────────────────────────────
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
    analysis = json.loads(raw_house)

    # Validate truck size
    if analysis["recommended_truck_size"] not in VALID_TRUCK_SIZES:
        match = next(
            (s for s in VALID_TRUCK_SIZES
             if s.lower() in analysis["recommended_truck_size"].lower()),
            None,
        )
        analysis["recommended_truck_size"] = match or "15' Truck"

    # ── Furniture recommendations ────────────────────────────────
    furniture_prompt = f"""You are a moving assistant. Based on the house details below,
recommend the furniture they will need to furnish it.

House details from prior analysis:
- Estimated bedrooms: {analysis["estimated_bedrooms"]}
- Estimated sq footage: {analysis["estimated_square_footage"]}
- Description: {analysis["house_description"]}

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

    return {
        "analysis": analysis,
        "furniture": furniture_data["items"],
    }


@app.post("/run-order-uhaul")
async def run_order_uhaul(params: dict):
    """Run the U-Haul ordering skill and return parsed result."""
    from server.skills.order_uhaul import order_uhaul

    try:
        result = await order_uhaul(
            pickup_location=params["pickupLocation"],
            dropoff_location=params["dropoffLocation"],
            pickup_date=params["pickupDate"],
            pickup_time=params.get("pickupTime", "10:00 AM"),
            vehicle_type=params.get("vehicleType", "truck"),
            num_workers=params.get("numWorkers", 0),
            loading_address=params.get("loadingAddress", ""),
        )

        agent_output = str(result)
        return parse_uhaul_result(agent_output)

    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}"}


@app.post("/run-update-address")
async def run_update_address(params: dict):
    """Run the Amazon address update skill."""
    from server.skills.update_amazon_address import update_amazon_address

    try:
        await update_amazon_address(
            full_name=params["fullName"],
            street_address=params["streetAddress"],
            city=params["city"],
            state=params["state"],
            zip_code=params["zipCode"],
            phone=params.get("phone", ""),
        )
        return {"message": "Updated all addresses to new address!"}

    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}"}


@app.post("/run-order-furniture")
async def run_order_furniture(params: dict):
    """Run the Amazon furniture cart skill."""
    from server.skills.amazon_furniture_cart import amazon_furniture_cart

    try:
        result = await amazon_furniture_cart(furniture_items=params["items"])
        return {"summary": str(result)}

    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}"}
