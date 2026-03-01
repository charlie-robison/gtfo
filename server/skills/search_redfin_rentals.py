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
    zipcode: str = "",
) -> str | None:
    """
    Build a pre-filtered Redfin rentals URL.

    If a zipcode is provided (from the form), uses /zipcode/{zip}/apartments-for-rent/filter/...
    which loads instantly without any API lookup.

    Falls back to Redfin autocomplete API (usually blocked by WAF from server-side).

    Returns None if all strategies fail (caller builds a browser-based fallback).
    """
    price = _format_price(max_rent)
    filters = f"max-price={price},min-beds={min_bedrooms},min-baths={min_bathrooms}"

    # Strategy 1: zipcode from form (instant, no API call)
    if zipcode:
        return f"https://www.redfin.com/zipcode/{zipcode}/apartments-for-rent/filter/{filters}"

    # Strategy 2: Redfin autocomplete (usually returns 403 from server-side)
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


def _build_extract_listings_js(max_results: int, city: str) -> str:
    """JavaScript that scrapes Redfin rental listing cards from the DOM."""
    return """
    (() => {
        const cards = document.querySelectorAll(
            '.HomeCardContainer, .MapHomeCardReact, .RentalHomeCard, [data-rf-test-id="mapHomeCard"]'
        );
        const results = [];
        const seenUrls = new Set();
        for (const card of cards) {
            if (results.length >= """ + str(max_results) + """) break;
            const linkEl = card.querySelector('a[href*="/rental/"], a[href*="/apartment/"], a.link-and-anchor');
            const href = linkEl ? linkEl.getAttribute('href') : '';
            const url = href.startsWith('http') ? href : (href ? 'https://www.redfin.com' + href : '');
            if (!url || seenUrls.has(url)) continue;
            seenUrls.add(url);

            const priceEl = card.querySelector('.homecardV2Price, .HomeCardContainer--price, [data-rf-test-id="homecard-price"]');
            const priceText = priceEl ? priceEl.textContent.replace(/[^0-9]/g, '') : '0';

            const statsEls = card.querySelectorAll('.HomeStatsV2 .stats, .HomeCardContainer--stat, .HomeStatsV2 div');
            let beds = 0, baths = 0, sqft = 0;
            for (const s of statsEls) {
                const t = s.textContent.toLowerCase();
                if (t.includes('bed')) beds = parseInt(t) || 0;
                else if (t.includes('bath')) baths = parseInt(t) || 0;
                else if (t.includes('sq')) sqft = parseInt(t.replace(/,/g, '')) || 0;
            }

            const imgEl = card.querySelector('img[src*="ssl.cdn-redfin"], img[src*="redfin"], img.HomeCard__Photo--image');
            const imageUrl = imgEl ? imgEl.getAttribute('src') : '';

            const addrEl = card.querySelector('.homeAddressV2, .link-and-anchor, .HomeCardContainer--address');
            const address = addrEl ? addrEl.textContent.trim() : '';

            const descParts = [];
            if (beds) descParts.push(beds + ' bed');
            if (baths) descParts.push(baths + ' bath');
            if (sqft) descParts.push(sqft + ' sqft');

            results.push({
                name: address || 'Rental Listing',
                address: address,
                city: '""" + city + """',
                description: descParts.join(', '),
                imageUrl: imageUrl,
                monthlyRentPrice: parseInt(priceText) || 0,
                numBedrooms: beds,
                numBathrooms: baths,
                squareFootage: sqft,
                moveInCost: 0,
                url: url,
            });
        }
        return JSON.stringify(results);
    })()
    """


async def _fast_scrape(
    url: str,
    max_results: int,
    city: str,
    screenshot_loop=None,
) -> list[dict]:
    """Navigate directly via CDP and extract listings with JS — no LLM needed."""
    extract_js = _build_extract_listings_js(max_results, city)

    browser = Browser(headless=False, keep_alive=True, enable_default_extensions=False)
    bg_task = None
    if screenshot_loop:
        bg_task = asyncio.create_task(screenshot_loop(browser))
    try:
        await browser.start()
        await browser.navigate_to(url)
        # Wait for listing cards to render
        await asyncio.sleep(3)

        # Run JS extraction via CDP Runtime.evaluate
        cdp_session = await browser.get_or_create_cdp_session()
        result = await cdp_session.cdp_client.send.Runtime.evaluate(
            params={"expression": extract_js, "returnByValue": True, "awaitPromise": True},
            session_id=cdp_session.session_id,
        )

        raw = result.get("result", {}).get("value", "[]")
        listings = json.loads(raw) if isinstance(raw, str) else raw
        return listings if isinstance(listings, list) else []
    finally:
        if bg_task:
            bg_task.cancel()
        await browser.stop()


async def search_redfin_rentals(
    city: str,
    state: str,
    max_rent: int,
    max_move_in_cost: int = 0,
    min_bedrooms: int = 1,
    min_bathrooms: int = 1,
    max_results: int = 10,
    zipcode: str = "",
    screenshot_loop=None,
):
    # ── Try to build direct URL (uses zipcode from form if available) ──
    direct_url = _get_redfin_search_url(city, state, max_rent, min_bedrooms, min_bathrooms, zipcode)

    # ── FAST PATH: direct CDP, zero LLM calls ──
    if direct_url:
        listings = await _fast_scrape(direct_url, max_results, city, screenshot_loop)
        return {"__fast_listings": listings}

    # ── SLOW PATH: LLM agent navigates manually ──
    price_slug = _format_price(max_rent)
    filters = f"max-price={price_slug},min-beds={min_bedrooms},min-baths={min_bathrooms}"
    extract_js = _build_extract_listings_js(max_results, city)

    autocomplete_js = _build_autocomplete_js(city, state)
    initial_actions = [
        {"navigate": {"url": "https://www.redfin.com", "new_tab": False}},
    ]
    task = f"""You are on redfin.com. First, run this JavaScript using evaluate to resolve the city URL:
```js
{autocomplete_js}
```
The JS returns a path like "/city/16409/CA/Sacramento". Then navigate to:
  https://www.redfin.com{{that_path}}/rentals/filter/{filters}
If the JS returned empty string, use the search bar to search "{city}, {state}" and apply filters: max ${max_rent:,}, {min_bedrooms}+ beds, {min_bathrooms}+ baths.
Once on the listings page, wait 2 seconds then run this JavaScript to extract listings:
```js
{extract_js}
```
The JS returns a JSON array. If empty, visually read up to {max_results} listings instead.
Return the final result as the JSON array. Do NOT open individual listing pages."""

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
        result = await agent.run(max_steps=6)
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
