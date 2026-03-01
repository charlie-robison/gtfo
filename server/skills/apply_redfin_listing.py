"""
Skill: Apply to a Single Redfin Rental Listing (Demo)

This skill uses browser-use to navigate to a specific Redfin listing URL
and fill out the contact/application form — in a single browser session.

DEMO MODE — contact forms are filled out but the agent explicitly stops
before clicking the final submit button.
"""

import asyncio
import os
from browser_use import Agent, ChatBrowserUse
from dotenv import load_dotenv
from server.utils import create_skill_browser

load_dotenv()

AMAZON_EMAIL = os.getenv("AMAZON_EMAIL", "")
AMAZON_PASSWORD = os.getenv("AMAZON_PASSWORD", "")


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

    initial_actions = [
        {"navigate": {"url": listing_url, "new_tab": False}},
    ]

    task = f"""You are on a Redfin rental listing page. Do the following:

1. Close any overlays/modals (sign-up popups, cookie banners) if present.
2. Click the contact button ("Send Message", "Contact Property",
   "Request a Tour", "Email", "Contact Agent", "Apply", or similar)
   to open the full contact form BEFORE filling anything.
3. Once the contact form/modal is open, fill ALL fields in one go:
   - First Name: {full_name.split()[0]}
   - Last Name: {full_name.split()[-1]}
   - Email: use x_amazon_email
   - Phone: {phone}
   - Move-in date: {move_in_date}
   - Message: {message}
   - Fill any other required fields with reasonable info.
4. *** STOP — DO NOT click submit/send. This is a DEMO. ***
5. Report: whether the form was filled, any issues, the listing address and price.

If you see a CAPTCHA, wait 10 seconds then attempt to solve it.
"""

    browser = await create_skill_browser()

    llm = ChatBrowserUse()
    agent = Agent(
        task=task,
        llm=llm,
        browser=browser,
        initial_actions=initial_actions,
        sensitive_data={
            "x_amazon_email": AMAZON_EMAIL,
            "x_amazon_pass": AMAZON_PASSWORD,
        },
        use_vision=False,
        max_actions_per_step=10,
        use_judge=False,
    )
    bg_task = None
    if screenshot_loop:
        bg_task = asyncio.create_task(screenshot_loop(browser))
    try:
        result = await agent.run(max_steps=8)
    finally:
        if bg_task:
            bg_task.cancel()
    return result
