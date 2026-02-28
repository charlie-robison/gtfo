"""
Skill: Search Redfin for Rental Listings & Contact (Demo)

This skill uses browser-use to navigate redfin.com, search for rental
properties matching given criteria, and fill out the contact form for each
qualifying listing — all in a single browser session.

Redfin has lighter anti-bot measures than Zillow, so no heavy CAPTCHA solver
is needed. Instead the agent uses human-like pacing (natural scrolling,
randomised waits between actions) to stay under the radar.

DEMO MODE — contact forms are filled out but the agent explicitly stops
before clicking the final submit button.
"""

import asyncio
import os
from browser_use import Agent, Browser, ChatBrowserUse
from dotenv import load_dotenv

load_dotenv()

REDFIN_EMAIL = os.getenv("REDFIN_EMAIL", "")


async def search_and_contact_redfin_rentals(
    city: str,
    state: str,
    max_rent: int,
    full_name: str,
    phone: str,
    move_in_date: str,
    message: str = "",
    max_move_in_cost: int = 0,
    min_bedrooms: int = 1,
    min_bathrooms: int = 1,
    max_results: int = 10,
):
    """
    Search Redfin for rental listings and fill out the contact form for each
    qualifying listing in a single browser session (DEMO — does NOT submit).

    Args:
        city: City to search in (e.g. "Sacramento")
        state: State abbreviation (e.g. "CA")
        max_rent: Maximum monthly rent budget in dollars (e.g. 2000)
        full_name: Applicant's full name (e.g. "Charlie Robison")
        phone: Applicant's phone number
        move_in_date: Desired move-in date (e.g. "04/01/2026")
        message: Custom message to include when contacting landlords.
            If empty, a default introduction message will be generated.
        max_move_in_cost: Maximum move-in cost budget in dollars — includes
            first month rent + security deposit. Set to 0 to skip this filter.
        min_bedrooms: Minimum number of bedrooms (default: 1)
        min_bathrooms: Minimum number of bathrooms (default: 1)
        max_results: Maximum number of listings to collect (default: 10)
    """
    if not message:
        message = (
            f"Hello, my name is {full_name}. I am interested in renting "
            f"this property and would love to schedule a viewing. "
            f"My desired move-in date is {move_in_date}. "
            f"Please let me know if the unit is still available. Thank you!"
        )

    move_in_filter = ""
    if max_move_in_cost > 0:
        move_in_filter = f"""
STEP 4 — Filter by move-in cost:
1. For each listing you collected, check if the listing mentions a security deposit or move-in cost.
2. Estimate the total move-in cost as: first month's rent + security deposit (if listed).
   - If no deposit info is shown, assume the deposit equals one month's rent.
3. Exclude any listing where the estimated move-in cost exceeds ${max_move_in_cost:,}.
"""

    task = f"""
Go to https://www.redfin.com and do the following:

IMPORTANT — Human-like pacing (applies throughout the ENTIRE session):
Redfin does not use heavy CAPTCHAs, but you must still behave like a real
human to avoid triggering rate-limits or bot detection:
  - Wait 5–15 seconds between major navigation actions (searching, opening
    a listing, clicking "Contact").
  - Wait 2–3 seconds between filling individual form fields.
  - Scroll naturally — do not jump straight to elements. Scroll down the
    page in small increments, pausing briefly as you go.
  - If you see any CAPTCHA or "are you a robot?" challenge, wait 10 seconds
    and then attempt to solve it normally.

SESSION WARMING (do this FIRST):
1. Navigate to https://www.redfin.com and wait 5 seconds for the page to
   fully load. Do NOT immediately interact with the search bar.
2. Scroll down slowly about 30% of the page, then scroll back up. Wait 3
   seconds.
3. Once the Redfin homepage is visible, proceed.

STEP 1 — Navigate to rentals & search:
1. Look for a "Rent" tab/link near the top of the page and click it to
   switch to the rental search mode. This may take you to redfin.com/rentals
   or similar.
2. Find the search bar.
3. Type "{city}, {state}" into the search bar.
4. Wait 2–3 seconds for the autocomplete suggestions to appear.
5. Select the correct city/state suggestion from the dropdown (click it).
6. Wait for the rental search results to load (5–10 seconds).

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
4. Wait 5 seconds for the filtered results to update.

STEP 3 — Collect listings:
1. Browse the search results list.
2. For up to {max_results} listings, collect the following information for each:
   - Full address
   - Monthly rent price
   - Number of bedrooms and bathrooms
   - Square footage (if shown)
   - Security deposit or move-in cost (if shown)
   - The Redfin listing URL (the link to the individual listing page)
3. If the first page does not have enough results, go to page 2 if available.
{move_in_filter}
STEP 5 — Fill contact form for EACH listing (DEMO — DO NOT SUBMIT):
For each listing you collected above, do the following:

  5a. Navigate to the listing URL.
  5b. Wait 5–10 seconds for the page to fully load. Scroll down slowly to
      view the listing details.
  5c. Look for a button or link that says "Send Message", "Contact Property",
      "Request a Tour", "Email", "Contact Agent", or similar.
  5d. Click the most relevant contact button.
  5e. If a form or modal appears, fill in the fields with human-like pacing
      (2–3 seconds between each field):
      - Name / First Name / Last Name: {full_name}
      - Email: use x_redfin_email
      - Phone: {phone}
      - Move-in date: {move_in_date}
      - Message: {message}
      - Fill in any other required fields with reasonable information.
  5f. *** STOP HERE — DO NOT click the final submit / send button. ***
      This is a DEMO. Confirm the form is filled correctly and note that
      the form was filled but NOT submitted.
  5g. Wait 5 seconds, then move on to the next listing.

STEP 6 — Final report:
After processing all listings, summarize:
   - For each listing: address, rent, bedrooms/bathrooms, square footage,
     estimated move-in cost, listing URL, and contact status
     (form filled — not submitted, no contact button found, etc.).
   - Total number of listings found and total forms filled.
   - Any listings that could not be processed and why.
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
        sensitive_data={
            "x_redfin_email": REDFIN_EMAIL,
        },
        use_vision=True,
    )
    result = await agent.run()
    return result


if __name__ == "__main__":
    asyncio.run(
        search_and_contact_redfin_rentals(
            city="Sacramento",
            state="CA",
            max_rent=2000,
            full_name="Charlie Robison",
            phone="555-123-4567",
            move_in_date="04/01/2026",
            max_move_in_cost=4000,
            min_bedrooms=2,
            min_bathrooms=1,
            max_results=10,
        )
    )
