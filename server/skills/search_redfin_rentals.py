"""
Skill: Search Redfin for Rental Listings (Search Only)

This skill uses browser-use to navigate redfin.com, search for rental
properties matching given criteria, and collect detailed listing information
including images, descriptions, and URLs.

Applying to listings is handled separately by apply_redfin_listing.py —
one browser session per listing, each with its own job ID and screenshots.
"""

import asyncio
import os
from browser_use import Agent, Browser, ChatBrowserUse
from dotenv import load_dotenv

load_dotenv()


async def search_redfin_rentals(
    city: str,
    state: str,
    max_rent: int,
    max_move_in_cost: int = 0,
    min_bedrooms: int = 1,
    min_bathrooms: int = 1,
    max_results: int = 10,
    screenshot_loop=None,
):
    """
    Search Redfin for rental listings and collect detailed information.

    This skill only searches and collects data — it does NOT fill contact
    forms. Each listing is applied to separately via apply_redfin_listing.

    Args:
        city: City to search in (e.g. "Sacramento")
        state: State abbreviation (e.g. "CA")
        max_rent: Maximum monthly rent budget in dollars (e.g. 2000)
        max_move_in_cost: Maximum move-in cost budget in dollars. Set to 0 to skip.
        min_bedrooms: Minimum number of bedrooms (default: 1)
        min_bathrooms: Minimum number of bathrooms (default: 1)
        max_results: Maximum number of listings to collect (default: 10)
    """

    move_in_filter = ""
    if max_move_in_cost > 0:
        move_in_filter = f"""
STEP 3b — Filter by move-in cost (before opening tabs):
1. For each listing you collected, check if the listing mentions a security deposit or move-in cost.
2. Estimate the total move-in cost as: first month's rent + security deposit (if listed).
   - If no deposit info is shown, assume the deposit equals one month's rent.
3. Exclude any listing where the estimated move-in cost exceeds ${max_move_in_cost:,}.
Only open tabs for listings that pass this filter.
"""

    task = f"""
Go to https://www.redfin.com and do the following:

IMPORTANT — Human-like pacing (applies throughout the ENTIRE session):
  - Wait 2–4 seconds between major navigation actions (searching, clicking filters).
  - If you see any CAPTCHA or "are you a robot?" challenge, wait 10 seconds
    and then attempt to solve it normally.

STEP 1 — Navigate to rentals & search:
1. Navigate to https://www.redfin.com and wait 3 seconds for the page to load.
2. Look for a "Rent" tab/link near the top of the page and click it to
   switch to the rental search mode.
3. Find the search bar.
4. Type "{city}, {state}" into the search bar.
5. Wait 2 seconds for the autocomplete suggestions to appear.
6. Select the correct city/state suggestion from the dropdown (click it).
7. Wait for the rental search results to load (3–5 seconds).

STEP 2 — Apply filters:
1. Set the maximum rent (price) filter to ${max_rent:,}/mo.
   - Look for a "Price" or "Rent" filter button, click it, and set the max
     price to {max_rent}. Click "Apply" or close the dropdown to confirm.
2. Set bedrooms to {min_bedrooms}+ bedrooms.
   - Look for a "Beds" or "Bedrooms" filter and set the minimum to
     {min_bedrooms}.
3. Set bathrooms to {min_bathrooms}+ bathrooms.
   - Look for a "Baths" or "Bathrooms" filter and set the minimum to
     {min_bathrooms}.
4. Wait 3 seconds for the filtered results to update.

STEP 3 — Collect listing data from search results page:
1. Browse the search results list/cards on the page.
2. For up to {max_results} listings, collect the following from each card:
   - Full address (shown on the card)
   - Monthly rent price
   - Number of bedrooms and bathrooms
   - Square footage (if shown)
   - The listing image URL (the src of the main photo thumbnail on the card)
   - The Redfin listing URL (the href link to the individual listing page)
3. If the first page does not have enough results, go to page 2 if available.
{move_in_filter}
DO NOT open individual listing pages. Just collect data from the search results.

STEP 4 — Final report:
After collecting all listings from the search results, provide a summary:
   - For EACH listing provide ALL of the following:
     * name: The address or property name shown on the card
     * address: Full street address
     * city: "{city}"
     * description: Brief info visible on the card (beds/baths/sqft)
     * imageUrl: URL of the listing photo thumbnail from the card
     * monthlyRentPrice: Monthly rent in dollars (number only)
     * numBedrooms: Number of bedrooms (number)
     * numBathrooms: Number of bathrooms (number)
     * squareFootage: Square footage (number, 0 if unknown)
     * moveInCost: 0
     * url: The full Redfin listing URL
   - Total number of listings found.
"""

    browser = Browser(
        headless=False,
        keep_alive=True,
    )

    llm = ChatBrowserUse()
    agent = Agent(
        task=task,
        llm=llm,
        browser=browser,
        use_vision=True,
    )
    bg_task = None
    if screenshot_loop:
        bg_task = asyncio.create_task(screenshot_loop(browser))
    try:
        result = await agent.run()
    finally:
        if bg_task:
            bg_task.cancel()
    return result


if __name__ == "__main__":
    asyncio.run(
        search_redfin_rentals(
            city="Sacramento",
            state="CA",
            max_rent=2000,
            max_move_in_cost=4000,
            min_bedrooms=2,
            min_bathrooms=1,
            max_results=5,
        )
    )
