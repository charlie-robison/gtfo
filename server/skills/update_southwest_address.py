"""
Skill: Update Address on Southwest Airlines

This skill navigates to Southwest Airlines, logs in with username
and password, then updates the contact/address information in the
user's profile.

Flow:
  1. Username + Password login
  2. My Account -> Profile
  3. Scroll down, click "Edit Contact Info"
  4. Update address fields -> Save
"""

import asyncio
import os
from browser_use import Agent, Browser, ChatBrowserUse
from dotenv import load_dotenv

load_dotenv()

SOUTHWEST_USERNAME = os.getenv("SOUTHWEST_USERNAME", "")
SOUTHWEST_PASSWORD = os.getenv("AMAZON_PASSWORD", "")


async def update_southwest_address(
    street_address: str,
    city: str,
    state: str,
    zip_code: str,
    screenshot_loop=None,
):
    """
    Update the contact address on Southwest Airlines profile.

    Args:
        street_address: Street address line (e.g. "5122 Mertola Drive")
        city: City name (e.g. "El Dorado Hills")
        state: State abbreviation (e.g. "CA")
        zip_code: ZIP code (e.g. "95762")
        screenshot_loop: Optional async callable for periodic screenshot capture.
    """
    task = f"""
Go to https://www.southwest.com and do the following:

STEP 1 — Log in:
1. Look for a "Log In" link or button in the header area and click it.
2. Enter username x_southwest_user into the username / account number field.
3. Enter password x_southwest_pass into the password field.
4. Click "Log In" to submit.
5. If a security question or two-factor prompt appears, try to answer it
   or wait a moment. If you cannot proceed, report the issue.
6. Confirm you are logged in (look for a greeting or "My Account" link).

STEP 2 — Navigate to profile:
1. Click on "My Account" in the header/navigation area.
2. From the My Account page or dropdown, click on "My Profile"
   or "Personal Information" or "My Info".

STEP 3 — Edit contact information:
1. Scroll down the profile page to find the contact information section.
   This may be labelled "Contact Info", "Contact Information",
   "Address", or similar.
2. Click the "Edit" button next to the contact information / address section.
   The button may say "Edit Contact Info", "Edit", or have a pencil icon.

STEP 4 — Update the address:
1. Clear any existing address fields.
2. Fill in the new address:
   - Street address: {street_address}
   - City: {city}
   - State: {state}
   - ZIP Code: {zip_code}
3. Click "Save", "Update", or "Save Changes" to confirm.

STEP 5 — Confirm:
1. Verify the address was saved successfully (look for a confirmation
   message or check that the displayed address matches the new one).
2. Report that the address has been updated.
"""

    browser = Browser(
        headless=False,
        keep_alive=True,
        args=[
            "--disable-features=AutofillServerCommunication",
            "--disable-save-password-bubble",
            "--password-store=basic",
        ],
    )

    await browser.start()
    await browser._cdp_add_init_script("""
        navigator.credentials.get = () => Promise.reject('WebAuthn disabled');
        navigator.credentials.create = () => Promise.reject('WebAuthn disabled');
        if (window.PublicKeyCredential) {
            window.PublicKeyCredential.isConditionalMediationAvailable = () => Promise.resolve(false);
            window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = () => Promise.resolve(false);
        }
    """)

    llm = ChatBrowserUse()
    agent = Agent(
        task=task,
        llm=llm,
        browser=browser,
        sensitive_data={
            "x_southwest_user": SOUTHWEST_USERNAME,
            "x_southwest_pass": SOUTHWEST_PASSWORD,
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
        update_southwest_address(
            street_address="5122 Mertola Drive",
            city="El Dorado Hills",
            state="CA",
            zip_code="95762",
        )
    )
