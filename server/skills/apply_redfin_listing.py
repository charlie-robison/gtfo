"""
Skill: Apply to a Single Redfin Rental Listing (Demo)

This skill uses browser-use to navigate to a specific Redfin listing URL
and fill out the contact/application form — in a single browser session.

DEMO MODE — contact forms are filled out but the agent explicitly stops
before clicking the final submit button.
"""

import asyncio
import os
from browser_use import Agent, Browser, ChatBrowserUse
from dotenv import load_dotenv

load_dotenv()

REDFIN_EMAIL = os.getenv("REDFIN_EMAIL", "")


async def apply_redfin_listing(
    listing_url: str,
    full_name: str,
    phone: str,
    move_in_date: str,
    message: str = "",
    screenshot_loop=None,
):
    """
    Navigate to a single Redfin listing and fill out the contact form.

    Args:
        listing_url: Direct URL to the Redfin listing page
        full_name: Applicant's full name
        phone: Applicant's phone number
        move_in_date: Desired move-in date (e.g. "04/01/2026")
        message: Custom message to include when contacting landlords.
        screenshot_loop: Optional async function for periodic screenshot capture.
    """
    if not message:
        message = (
            f"Hello, my name is {full_name}. I am interested in renting "
            f"this property and would love to schedule a viewing. "
            f"My desired move-in date is {move_in_date}. "
            f"Please let me know if the unit is still available. Thank you!"
        )

    task = f"""
Go to {listing_url} and do the following:

IMPORTANT — Human-like pacing (applies throughout the ENTIRE session):
  - Wait 2–4 seconds between major navigation actions.
  - Wait 1–2 seconds between filling individual form fields.
  - If you see any CAPTCHA or "are you a robot?" challenge, wait 10 seconds
    and then attempt to solve it normally.

STEP 1 — Navigate to the listing:
1. Navigate to {listing_url} and wait 3–5 seconds for the page to fully load.
2. Confirm the listing page has loaded (you should see property details,
   photos, price, etc.).

STEP 2 — Find and open the contact form:
1. Look for a button or link that says "Send Message", "Contact Property",
   "Request a Tour", "Email", "Contact Agent", "Apply", or similar.
2. Click the most relevant contact button.
3. Wait 2–3 seconds for any form or modal to appear.

STEP 3 — Fill out the contact form (DEMO — DO NOT SUBMIT):
1. Fill in the fields (1–2 seconds between fields):
   - Name / First Name / Last Name: {full_name}
   - Email: use x_redfin_email
   - Phone: {phone}
   - Move-in date: {move_in_date}
   - Message: {message}
   - Fill in any other required fields with reasonable information.
2. *** STOP HERE — DO NOT click the final submit / send button. ***
   This is a DEMO. Confirm the form is filled correctly and note that
   the form was filled but NOT submitted.

STEP 4 — Report:
Summarize:
  - Whether the contact form was found and filled successfully
  - Any issues encountered (no contact button, CAPTCHA, etc.)
  - The listing address and price shown on the page
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
    bg_task = None
    if screenshot_loop:
        bg_task = asyncio.create_task(screenshot_loop(browser))
    try:
        result = await agent.run()
    finally:
        if bg_task:
            bg_task.cancel()
    return result
