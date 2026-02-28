"""
Pipeline: House Photo Analysis → U-Haul Order

Takes a photo of a house, analyzes it with OpenAI GPT-4o vision to estimate
the amount of stuff inside and recommend a U-Haul truck size, then
automatically reserves that truck through the U-Haul website.
"""

import asyncio
import base64
import sys
from pathlib import Path
from typing import List

from dotenv import load_dotenv
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

load_dotenv()

# Add project root to path so we can import skills
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from server.skills.order_uhaul import order_uhaul

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


class HouseAnalysis(BaseModel):
    """Structured result from analyzing a house photo."""

    house_description: str = Field(
        description="Brief description of the house exterior and visible features"
    )
    estimated_bedrooms: int = Field(
        description="Estimated number of bedrooms based on house size"
    )
    estimated_square_footage: int = Field(
        description="Estimated square footage of the home"
    )
    stuff_volume_estimate: str = Field(
        description="Estimated volume of belongings (e.g. '800-1200 cubic feet')"
    )
    recommended_truck_size: str = Field(
        description="Recommended U-Haul truck size from the valid options"
    )
    reasoning: str = Field(
        description="Explanation of how the truck size was determined"
    )
    recommended_workers: int = Field(
        description="Recommended number of moving helpers/workers"
    )
    labor_reasoning: str = Field(
        description="Explanation of how the worker count was determined"
    )


class FurnitureItem(BaseModel):
    """A single furniture item recommendation."""

    item_name: str = Field(description="Name of the furniture item (e.g. 'Queen Bed Frame')")
    room: str = Field(description="Which room this item is for (e.g. 'Master Bedroom')")
    amazon_search_query: str = Field(
        description="Optimized Amazon search query to find this item"
    )
    priority: str = Field(description="'essential' or 'nice-to-have'")


class FurnitureList(BaseModel):
    """Structured furniture recommendation list from analyzing a house photo."""

    reasoning: str = Field(
        description="Brief explanation of how furniture needs were determined"
    )
    items: List[FurnitureItem] = Field(
        description="List of recommended furniture items"
    )


def _read_image_as_data_url(image_path: str) -> str:
    """Read an image file and return a base64 data URL."""
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    suffix = path.suffix.lower()
    media_type_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    media_type = media_type_map.get(suffix)
    if not media_type:
        raise ValueError(
            f"Unsupported image format '{suffix}'. "
            f"Supported: {', '.join(media_type_map.keys())}"
        )

    raw = path.read_bytes()
    b64 = base64.standard_b64encode(raw).decode("utf-8")
    return f"data:{media_type};base64,{b64}"


async def moving_pipeline(
    photo_path: str,
    pickup_location: str,
    dropoff_location: str,
    pickup_date: str,
    pickup_time: str = "10:00 AM",
    loading_address: str = "",
):
    """
    End-to-end moving pipeline: analyze a house photo with OpenAI,
    then order a U-Haul truck of the recommended size.

    Args:
        photo_path: Path to a photo of the house being moved from.
        pickup_location: Address or city/state for U-Haul pickup.
        dropoff_location: Address or city/state for U-Haul drop-off.
        pickup_date: Desired pickup date (e.g. "03/15/2026").
        pickup_time: Desired pickup time (default: "10:00 AM").
        loading_address: Full street address where movers will load
                         (e.g. "1234 Main St, El Dorado Hills, CA 95762").
    """
    # ── Step 1: Analyze the house photo with OpenAI ──────────────────
    print("=" * 60)
    print("STEP 1: Analyzing house photo with OpenAI GPT-4o...")
    print("=" * 60)

    image_url = _read_image_as_data_url(photo_path)
    truck_options = "\n".join(f"  - {size}" for size in VALID_TRUCK_SIZES)

    prompt = f"""Analyze this photo of a house and estimate how much stuff would need to be
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

    client = AsyncOpenAI()
    response = await client.chat.completions.create(
        model="gpt-4o",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": image_url},
                    },
                    {
                        "type": "text",
                        "text": prompt,
                    },
                ],
            }
        ],
    )

    raw_text = response.choices[0].message.content.strip()

    # Strip markdown fences if the model wraps the JSON
    if raw_text.startswith("```"):
        lines = raw_text.splitlines()
        lines = [l for l in lines if not l.strip().startswith("```")]
        raw_text = "\n".join(lines)

    analysis = HouseAnalysis.model_validate_json(raw_text)

    # Validate truck size is one of the allowed options
    if analysis.recommended_truck_size not in VALID_TRUCK_SIZES:
        for size in VALID_TRUCK_SIZES:
            if size.lower() in analysis.recommended_truck_size.lower():
                analysis.recommended_truck_size = size
                break
        else:
            analysis.recommended_truck_size = "15' Truck"
            analysis.reasoning += (
                " (Note: original recommendation was not a valid U-Haul size; "
                "defaulted to 15' Truck.)"
            )

    print("\n--- House Analysis Results ---")
    print(f"  Description:       {analysis.house_description}")
    print(f"  Est. Bedrooms:     {analysis.estimated_bedrooms}")
    print(f"  Est. Sq Footage:   {analysis.estimated_square_footage}")
    print(f"  Stuff Volume:      {analysis.stuff_volume_estimate}")
    print(f"  Recommended Truck: {analysis.recommended_truck_size}")
    print(f"  Reasoning:         {analysis.reasoning}")
    print(f"  Recommended Workers: {analysis.recommended_workers}")
    print(f"  Labor Reasoning:     {analysis.labor_reasoning}")
    print()

    # ── Step 2: Order the U-Haul + Moving Help ─────────────────────
    print("=" * 60)
    print(f"STEP 2: Ordering U-Haul — {analysis.recommended_truck_size}")
    print(f"  + Moving Help: {analysis.recommended_workers} workers")
    print(f"  From: {pickup_location}")
    print(f"  To:   {dropoff_location}")
    print(f"  Date: {pickup_date} at {pickup_time}")
    print("=" * 60)

    result = await order_uhaul(
        pickup_location=pickup_location,
        dropoff_location=dropoff_location,
        pickup_date=pickup_date,
        pickup_time=pickup_time,
        vehicle_type=analysis.recommended_truck_size,
        num_workers=analysis.recommended_workers,
        loading_address=loading_address,
    )

    print("\n--- U-Haul Reservation Result ---")
    print(result)

    # ── Step 3: Recommend furniture for the new home ─────────────
    print()
    print("=" * 60)
    print("STEP 3: Analyzing furniture needs with OpenAI GPT-4o...")
    print("=" * 60)

    furniture_prompt = f"""You are a moving assistant. Look at this photo of a house someone is
moving into. Based on the house size and layout, recommend the furniture
they will need to furnish it.

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

    furniture_response = await client.chat.completions.create(
        model="gpt-4o",
        max_tokens=2048,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": image_url},
                    },
                    {
                        "type": "text",
                        "text": furniture_prompt,
                    },
                ],
            }
        ],
    )

    furniture_raw = furniture_response.choices[0].message.content.strip()

    if furniture_raw.startswith("```"):
        lines = furniture_raw.splitlines()
        lines = [l for l in lines if not l.strip().startswith("```")]
        furniture_raw = "\n".join(lines)

    furniture = FurnitureList.model_validate_json(furniture_raw)

    print(f"\n--- Furniture Recommendations ({len(furniture.items)} items) ---")
    print(f"  Reasoning: {furniture.reasoning}")
    essential = [i for i in furniture.items if i.priority == "essential"]
    nice_to_have = [i for i in furniture.items if i.priority == "nice-to-have"]
    print(f"\n  Essential ({len(essential)} items):")
    for item in essential:
        print(f"    - [{item.room}] {item.item_name}")
        print(f"      Amazon search: \"{item.amazon_search_query}\"")
    if nice_to_have:
        print(f"\n  Nice-to-have ({len(nice_to_have)} items):")
        for item in nice_to_have:
            print(f"    - [{item.room}] {item.item_name}")
            print(f"      Amazon search: \"{item.amazon_search_query}\"")
    print()

    return {
        "analysis": analysis,
        "uhaul_result": result,
        "furniture": furniture,
    }


if __name__ == "__main__":
    # Resolve house.jpg relative to the project root (parent of pipelines/)
    PROJECT_ROOT = Path(__file__).resolve().parent.parent
    DEFAULT_PHOTO = str(PROJECT_ROOT / "house.jpg")

    # Default demo values — override as needed
    asyncio.run(
        moving_pipeline(
            photo_path=DEFAULT_PHOTO,
            pickup_location="El Dorado Hills, CA",
            dropoff_location="Sacramento, CA",
            pickup_date="03/15/2026",
            pickup_time="10:00 AM",
            loading_address="4533 Glenwood Springs Dr, El Dorado Hills, CA 95762",
        )
    )
