"""
Skill: Update Delivery Address on DoorDash

This skill navigates to DoorDash, logs in via Google authentication,
then updates the delivery address by clicking on the address element
in the top-right corner.

Flow:
  1. Google Login
  2. Click the address display at the top of the page
  3. Enter the new address
  4. Select/save the address
"""

import asyncio
import os
from browser_use import Agent, ChatBrowserUse
from dotenv import load_dotenv
from server.utils import create_skill_browser

load_dotenv()

GOOGLE_EMAIL = os.getenv("AMAZON_EMAIL", "")
GOOGLE_PASSWORD = os.getenv("AMAZON_PASSWORD", "")


async def update_doordash_address(
    street_address: str,
    city: str,
    state: str,
    zip_code: str,
    screenshot_loop=None,
):
    """
    Update the delivery address on DoorDash via Google login.

    Args:
        street_address: Street address line (e.g. "5122 Mertola Drive")
        city: City name (e.g. "El Dorado Hills")
        state: State abbreviation (e.g. "CA")
        zip_code: ZIP code (e.g. "95762")
        screenshot_loop: Optional async callable for periodic screenshot capture.
    """
    full_address = f"{street_address}, {city}, {state} {zip_code}"

    task = f"""
Go to https://www.doordash.com and do the following:

STEP 1 — Log in with Google:
1. Look for a "Sign In" or "Log In" button and click it.
2. On the sign-in page, look for a "Continue with Google" or
   "Sign in with Google" button and click it.
3. A Google sign-in popup or page will appear.
4. Enter email x_google_email and click "Next".
5. Enter password x_google_pass and click "Next".
6. If a two-factor authentication or consent screen appears,
   handle it accordingly.
7. You should be redirected back to DoorDash and logged in.

STEP 2 — Update delivery address:
1. Look at the top area of the DoorDash page. There should be an
   address or location display (usually near the top-left or top-right,
   it might show the current delivery address or say something like
   "Enter your delivery address").
2. Click on that address element.
3. A search/address input field should appear (either a modal, dropdown,
   or inline input).
4. Clear any existing address text.
5. Type the new address: {full_address}
6. Wait 2-3 seconds for autocomplete suggestions to appear.
7. Select the correct matching address from the dropdown suggestions.
   You MUST click one of the suggested addresses — do not just press Enter.
8. If asked to confirm the address or add apartment/suite details, confirm
   or skip as appropriate.

STEP 3 — Confirm:
1. Verify the address was updated (the top of the page should now show
   the new delivery address).
2. Report that the address has been updated.
"""

    browser = await create_skill_browser(
        extra_args=[
            "--disable-features=AutofillServerCommunication",
            "--disable-save-password-bubble",
            "--password-store=basic",
        ],
    )

    llm = ChatBrowserUse()
    agent = Agent(
        task=task,
        llm=llm,
        browser=browser,
        sensitive_data={
            "x_google_email": GOOGLE_EMAIL,
            "x_google_pass": GOOGLE_PASSWORD,
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


if __name__ == "__main__":
    asyncio.run(
        update_doordash_address(
            street_address="5122 Mertola Drive",
            city="El Dorado Hills",
            state="CA",
            zip_code="95762",
        )
    )
