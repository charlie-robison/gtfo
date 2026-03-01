"""
Automovers FastAPI Server — Skill Runner

Pure skill/agent execution layer. No database operations.
Convex handles all reads, writes, and job management.

Endpoints:
  POST /run-search-rentals           — Search Redfin for rentals, return parsed listings
  POST /run-apply-redfin             — Apply to a single Redfin listing (browser-use)
  POST /run-moving-analysis          — Run GPT-4o house analysis + furniture recs
  POST /run-order-uhaul              — Run U-Haul ordering skill, return parsed result
  POST /run-update-amazon-address    — Run Amazon address update skill
  POST /run-order-furniture          — Run Amazon furniture cart skill
  POST /run-update-cashapp-address   — Run Cash App address update skill
  POST /run-update-southwest-address — Run Southwest address update skill
  POST /run-update-doordash-address  — Run DoorDash address update skill
  POST /run-determine-addresses      — Scan Gmail for services with stored addresses
  POST /run-cancel-lease             — Send lease cancellation email via AgentMail

Run:
  cd server && uvicorn main:app --reload
"""

import asyncio
import base64
import json
import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI

load_dotenv(Path(__file__).resolve().parent / ".env")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from server.utils import parse_redfin_results, parse_uhaul_result
from server.agent_mail import AgentMailClient, GmailClient, UserAddress, classify_services, scan_emails

CONVEX_SITE_URL = os.getenv("CONVEX_SITE_URL", "")

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


# ── Helpers ──────────────────────────────────────────────────────


async def push_screenshot_to_convex(
    job_id: str,
    job_type: str,
    step: int,
    url: str,
    title: str,
    b64: str,
) -> None:
    """POST a single screenshot to the Convex HTTP endpoint for storage."""
    if not CONVEX_SITE_URL:
        return
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{CONVEX_SITE_URL}/screenshots/upload",
            json={
                "jobId": job_id,
                "jobType": job_type,
                "stepNumber": step,
                "pageUrl": url,
                "pageTitle": title,
                "screenshotBase64": b64,
            },
            timeout=30,
        )


def make_screenshot_loop(job_id: str, job_type: str, interval: float = 0.5):
    """Return an async function that periodically captures browser screenshots."""

    async def _loop(browser):
        step = 0
        while True:
            try:
                page = await browser.get_current_page()
                if page:
                    screenshot_b64 = await page.screenshot()
                    url = page.url if hasattr(page, "url") else ""
                    title = ""
                    try:
                        title = await page.title() if callable(getattr(page, "title", None)) else ""
                    except Exception:
                        pass
                    await push_screenshot_to_convex(
                        job_id=job_id,
                        job_type=job_type,
                        step=step,
                        url=url or "",
                        title=title or "",
                        b64=screenshot_b64,
                    )
                    step += 1
            except Exception:
                pass  # swallow errors so the agent doesn't crash
            await asyncio.sleep(interval)

    return _loop


# ── Skill Endpoints ──────────────────────────────────────────────


@app.post("/run-search-rentals")
async def run_search_rentals(params: dict):
    """Run the Redfin search skill and return parsed listings with full details."""
    from server.skills.search_redfin_rentals import search_redfin_rentals

    job_id = params.get("jobId", "")
    job_type = params.get("jobType", "search_rentals")
    loop = make_screenshot_loop(job_id, job_type) if job_id else None

    try:
        result = await search_redfin_rentals(
            city=params["city"],
            state=params["state"],
            max_rent=params["maxRent"],
            min_bedrooms=params.get("minBedrooms", 1),
            min_bathrooms=params.get("minBathrooms", 1),
            max_results=params.get("maxResults", 5),
            screenshot_loop=loop,
        )

        agent_output = str(result)
        listings = parse_redfin_results(agent_output)
        return {"listings": listings}

    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}", "listings": []}


@app.post("/run-apply-redfin")
async def run_apply_redfin(params: dict):
    """Run the Redfin apply skill for a single listing."""
    from server.skills.apply_redfin_listing import apply_redfin_listing

    job_id = params.get("jobId", "")
    job_type = params.get("jobType", "apply_redfin")
    loop = make_screenshot_loop(job_id, job_type) if job_id else None

    try:
        result = await apply_redfin_listing(
            listing_url=params["listingUrl"],
            full_name=params["fullName"],
            phone=params["phone"],
            move_in_date=params["moveInDate"],
            screenshot_loop=loop,
        )
        return {"message": f"Applied to listing: {params['listingUrl']}", "result": str(result)}

    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}"}


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

    job_id = params.get("jobId", "")
    job_type = params.get("jobType", "order_uhaul")
    loop = make_screenshot_loop(job_id, job_type) if job_id else None

    try:
        result = await order_uhaul(
            pickup_location=params["pickupLocation"],
            dropoff_location=params["dropoffLocation"],
            pickup_date=params["pickupDate"],
            pickup_time=params.get("pickupTime", "10:00 AM"),
            vehicle_type=params.get("vehicleType", "truck"),
            num_workers=params.get("numWorkers", 0),
            loading_address=params.get("loadingAddress", ""),
            screenshot_loop=loop,
        )

        agent_output = str(result)
        parsed = parse_uhaul_result(agent_output)
        return parsed

    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}"}


@app.post("/run-update-amazon-address")
async def run_update_amazon_address(params: dict):
    """Run the Amazon address update skill."""
    from server.skills.update_amazon_address import update_amazon_address

    job_id = params.get("jobId", "")
    job_type = params.get("jobType", "update_amazon_address")
    loop = make_screenshot_loop(job_id, job_type) if job_id else None

    try:
        result = await update_amazon_address(
            full_name=params["fullName"],
            street_address=params["streetAddress"],
            city=params["city"],
            state=params["state"],
            zip_code=params["zipCode"],
            phone=params.get("phone", ""),
            screenshot_loop=loop,
        )
        return {"message": "Updated all addresses to new address!"}

    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}"}


@app.post("/run-order-furniture")
async def run_order_furniture(params: dict):
    """Run the Amazon furniture cart skill."""
    from server.skills.amazon_furniture_cart import amazon_furniture_cart

    job_id = params.get("jobId", "")
    job_type = params.get("jobType", "order_furniture")
    loop = make_screenshot_loop(job_id, job_type) if job_id else None

    try:
        result = await amazon_furniture_cart(
            furniture_items=params["items"],
            screenshot_loop=loop,
        )
        return {"summary": str(result)}

    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}"}


@app.post("/run-update-cashapp-address")
async def run_update_cashapp_address(params: dict):
    """Run the Cash App address update skill."""
    print(f"[CashApp] Received request with params: {list(params.keys())}")
    from server.skills.update_cashapp_address import update_cashapp_address
    print("[CashApp] Skill imported OK")

    job_id = params.get("jobId", "")
    job_type = params.get("jobType", "update_cashapp_address")
    loop = make_screenshot_loop(job_id, job_type) if job_id else None

    try:
        print("[CashApp] Starting skill...")
        result = await update_cashapp_address(
            street_address=params.get("streetAddress", ""),
            city=params.get("city", ""),
            state=params.get("state", ""),
            zip_code=params.get("zipCode", ""),
            screenshot_loop=loop,
        )
        print(f"[CashApp] Skill completed OK")
        return {"message": "Updated Cash App address!"}

    except Exception as e:
        print(f"[CashApp] ERROR: {type(e).__name__}: {e}")
        import traceback; traceback.print_exc()
        return {"error": f"{type(e).__name__}: {e}"}


@app.post("/run-update-southwest-address")
async def run_update_southwest_address(params: dict):
    """Run the Southwest Airlines address update skill."""
    print(f"[Southwest] Received request with params: {list(params.keys())}")
    from server.skills.update_southwest_address import update_southwest_address
    print("[Southwest] Skill imported OK")

    job_id = params.get("jobId", "")
    job_type = params.get("jobType", "update_southwest_address")
    loop = make_screenshot_loop(job_id, job_type) if job_id else None

    try:
        print("[Southwest] Starting skill...")
        result = await update_southwest_address(
            street_address=params.get("streetAddress", ""),
            city=params.get("city", ""),
            state=params.get("state", ""),
            zip_code=params.get("zipCode", ""),
            screenshot_loop=loop,
        )
        print(f"[Southwest] Skill completed OK")
        return {"message": "Updated Southwest Airlines address!"}

    except Exception as e:
        print(f"[Southwest] ERROR: {type(e).__name__}: {e}")
        import traceback; traceback.print_exc()
        return {"error": f"{type(e).__name__}: {e}"}


@app.post("/run-update-doordash-address")
async def run_update_doordash_address(params: dict):
    """Run the DoorDash address update skill."""
    print(f"[DoorDash] Received request with params: {list(params.keys())}")
    from server.skills.update_doordash_address import update_doordash_address
    print("[DoorDash] Skill imported OK")

    job_id = params.get("jobId", "")
    job_type = params.get("jobType", "update_doordash_address")
    loop = make_screenshot_loop(job_id, job_type) if job_id else None

    try:
        print("[DoorDash] Starting skill...")
        result = await update_doordash_address(
            street_address=params.get("streetAddress", ""),
            city=params.get("city", ""),
            state=params.get("state", ""),
            zip_code=params.get("zipCode", ""),
            screenshot_loop=loop,
        )
        print(f"[DoorDash] Skill completed OK")
        return {"message": "Updated DoorDash address!"}

    except Exception as e:
        print(f"[DoorDash] ERROR: {type(e).__name__}: {e}")
        import traceback; traceback.print_exc()
        return {"error": f"{type(e).__name__}: {e}"}


@app.post("/run-determine-addresses")
async def run_determine_addresses(params: dict):
    """Scan Gmail for services that likely store the user's address, classify them."""
    old_address = None
    if params.get("oldStreet"):
        old_address = UserAddress(
            street=params["oldStreet"],
            city=params.get("oldCity", ""),
            state=params.get("oldState", ""),
            zip_code=params.get("oldZipCode", ""),
        )

    try:
        # Gmail client + scanning are synchronous — run in a thread
        loop = asyncio.get_event_loop()
        gmail = await loop.run_in_executor(None, GmailClient)
        user_email = await loop.run_in_executor(None, gmail.get_profile)

        raw_hits, total = await loop.run_in_executor(
            None, lambda: scan_emails(gmail, old_address=old_address)
        )

        if not raw_hits:
            return {"services": [], "userEmail": user_email, "totalScanned": total}

        services = await loop.run_in_executor(None, classify_services, raw_hits)

        return {
            "services": [svc.model_dump(mode="json") for svc in services],
            "userEmail": user_email,
            "totalScanned": total,
        }
    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}", "services": []}


@app.post("/run-cancel-lease")
async def run_cancel_lease(params: dict):
    """Send a lease cancellation email via AgentMail."""
    try:
        loop = asyncio.get_event_loop()

        def _send():
            client = AgentMailClient()
            client.send_lease_cancellation(
                to_email=params["landlordEmail"],
                tenant_name=params["tenantName"],
                current_address=params["currentAddress"],
                lease_end_date=params["leaseEndDate"],
                move_out_date=params["moveOutDate"],
                reason=params.get("reason", "I am relocating."),
            )
            return client.get_or_create_inbox()

        inbox = await loop.run_in_executor(None, _send)

        return {
            "message": f"Lease cancellation sent to {params['landlordEmail']}",
            "sentFrom": inbox,
        }
    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}"}
