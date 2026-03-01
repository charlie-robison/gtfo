"""
Skill: Search Redfin for Rental Listings (Search Only)

This skill uses browser-use to navigate redfin.com, search for rental
properties matching given criteria, and collect detailed listing information
including images, descriptions, and URLs.

Applying to listings is handled separately by apply_redfin_listing.py —
one browser session per listing, each with its own job ID and screenshots.
"""

import asyncio
import json
import requests as _requests
from browser_use import Agent, Browser, ChatBrowserUse
from dotenv import load_dotenv

load_dotenv()


def _format_price(price: int) -> str:
    """Format price for Redfin URL filter (e.g. 2000 -> '2k', 1500 -> '1500')."""
    if price % 1000 == 0:
        return f"{price // 1000}k"
    return str(price)


def _get_redfin_search_url(
    city: str,
    state: str,
    max_rent: int,
    min_bedrooms: int,
    min_bathrooms: int,
) -> str | None:
    """
    Build a pre-filtered Redfin rentals URL by hitting the autocomplete API
    to resolve the city slug, then appending filter parameters.

    Returns None if autocomplete fails (caller builds a fallback prompt).
    """
    try:
        resp = _requests.get(
            "https://www.redfin.com/stingray/do/location-autocomplete",
            params={"location": f"{city}, {state}", "v": "2"},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=10,
        )
        if resp.status_code != 200:
            return None
        raw = resp.text.lstrip("{}& \n")
        data = json.loads(raw)

        sections = data.get("payload", {}).get("sections", [])
        for section in sections:
            for item in section.get("rows", []):
                item_url = item.get("url", "")
                if "/city/" in item_url or "/neighborhood/" in item_url:
                    price = _format_price(max_rent)
                    filters = f"max-price={price},min-beds={min_bedrooms},min-baths={min_bathrooms}"
                    return f"https://www.redfin.com{item_url}/rentals/filter/{filters}"
    except Exception:
        pass

    return None


def _build_autocomplete_js(city: str, state: str) -> str:
    """Return JavaScript that calls the Redfin autocomplete API from the browser
    (same-origin, bypasses WAF) and stores the city URL path in window.__cityPath."""
    return f"""
    (async () => {{
        try {{
            const resp = await fetch(
                '/stingray/do/location-autocomplete?location='
                + encodeURIComponent('{city}, {state}') + '&v=2'
            );
            const text = await resp.text();
            const json = JSON.parse(text.replace(/^{{}}&&/, ''));
            const sections = json.payload?.sections || [];
            for (const sec of sections) {{
                for (const row of (sec.rows || [])) {{
                    if (row.url && (row.url.includes('/city/') || row.url.includes('/neighborhood/'))) {{
                        window.__cityPath = row.url;
                        return row.url;
                    }}
                }}
            }}
        }} catch (e) {{}}
        window.__cityPath = '';
        return '';
    }})()
    """


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
    # """
    # Search Redfin for rental listings and collect detailed information.

    # This skill only searches and collects data — it does NOT fill contact
    # forms. Each listing is applied to separately via apply_redfin_listing.

    # Args:
    #     city: City to search in (e.g. "Sacramento")
    #     state: State abbreviation (e.g. "CA")
    #     max_rent: Maximum monthly rent budget in dollars (e.g. 2000)
    #     max_move_in_cost: Maximum move-in cost budget in dollars. Set to 0 to skip.
    #     min_bedrooms: Minimum number of bedrooms (default: 1)
    #     min_bathrooms: Minimum number of bathrooms (default: 1)
    #     max_results: Maximum number of listings to collect (default: 10)
    # """

    # ── Try to build direct URL from Python first ──
    direct_url = _get_redfin_search_url(city, state, max_rent, min_bedrooms, min_bathrooms)

    price_slug = _format_price(max_rent)
    filters = f"max-price={price_slug},min-beds={min_bedrooms},min-baths={min_bathrooms}"

    # ── Build initial_actions to skip LLM navigation steps ──
    # NOTE: navigate and evaluate both have terminates_sequence=True in
    # browser-use, so only ONE action per initial_actions list actually runs.
    if direct_url:
        # Python autocomplete worked — navigate straight to filtered results
        initial_actions = [
            {"navigate": {"url": direct_url, "new_tab": False}},
        ]
        max_steps = 5
        task = f"""You are on a Redfin rental listings page. Extract up to {max_results} listings from the cards visible on the page.
For each listing provide:
  - name: property name or address
  - address: full street address
  - city: "{city}"
  - description: beds/baths/sqft from the card
  - imageUrl: the listing photo URL (img src on card)
  - monthlyRentPrice: rent in dollars (number only)
  - numBedrooms / numBathrooms / squareFootage (0 if unknown)
  - moveInCost: 0
  - url: the Redfin listing URL (href on card)
Do NOT open individual listing pages."""
    else:
        # Python autocomplete blocked — navigate to redfin.com, then the LLM
        # runs the autocomplete JS from the browser (same-origin bypasses WAF).
        autocomplete_js = _build_autocomplete_js(city, state)
        initial_actions = [
            {"navigate": {"url": "https://www.redfin.com", "new_tab": False}},
        ]
        max_steps = 10
        task = f"""You are on redfin.com. First, run this JavaScript using evaluate to resolve the city URL:
```js
{autocomplete_js}
```
The JS returns a path like "/city/16409/CA/Sacramento". Then navigate to:
  https://www.redfin.com{{that_path}}/rentals/filter/{filters}
If the JS returned empty string, use the search bar to search "{city}, {state}" and apply filters: max ${max_rent:,}, {min_bedrooms}+ beds, {min_bathrooms}+ baths.
Once on the listings page, extract up to {max_results} listings.
For each listing provide:
  - name: property name or address
  - address: full street address
  - city: "{city}"
  - description: beds/baths/sqft from the card
  - imageUrl: the listing photo URL (img src on card)
  - monthlyRentPrice: rent in dollars (number only)
  - numBedrooms / numBathrooms / squareFootage (0 if unknown)
  - moveInCost: 0
  - url: the Redfin listing URL (href on card)
Do NOT open individual listing pages."""

    browser = Browser(
        headless=False,
        keep_alive=True,
        enable_default_extensions=False,
    )

    llm = ChatBrowserUse()
    agent = Agent(
        task=task,
        llm=llm,
        browser=browser,
        initial_actions=initial_actions,
        use_vision=True,
        max_actions_per_step=10,
        use_judge=False,
    )
    bg_task = None
    if screenshot_loop:
        bg_task = asyncio.create_task(screenshot_loop(browser))
    try:
        result = await agent.run(max_steps=max_steps)
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
            min_bedrooms=2,
            min_bathrooms=1,
            max_results=5,
        )
    )
