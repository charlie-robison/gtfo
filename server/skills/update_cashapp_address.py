"""
Skill: Update Delivery Address on Cash App

This skill navigates to Cash App's web interface, logs in via email
verification code + custom PIN, then updates the delivery address.

Flow:
  1. Email login
  2. Pull verification code from email inbox
  3. Enter custom PIN as final security step
  4. Navigate to Account -> Address
  5. Click Edit -> Enter new address -> Save
"""

import asyncio
import os
from browser_use import Agent, Browser, ChatBrowserUse
from dotenv import load_dotenv
from server.skills import disable_crashy_watchdogs

load_dotenv()

CASHAPP_EMAIL = os.getenv("AMAZON_EMAIL", "")
CASHAPP_PASSWORD = os.getenv("AMAZON_PASSWORD", "")
CASHAPP_PIN = os.getenv("CASHAPP_PIN", "")


async def update_cashapp_address(
    street_address: str,
    city: str,
    state: str,
    zip_code: str,
    screenshot_loop=None,
):
    """
    Update the delivery/mailing address on Cash App.

    Args:
        street_address: Street address line (e.g. "5122 Mertola Drive")
        city: City name (e.g. "El Dorado Hills")
        state: State abbreviation (e.g. "CA")
        zip_code: ZIP code (e.g. "95762")
        screenshot_loop: Optional async callable for periodic screenshot capture.
    """
    task = f"""
Go to https://cash.app/login and do the following:

STEP 1 — Log in with email:
1. You should see a login page. Enter the email x_cashapp_email into the email/phone field.
2. Click "Next" or the equivalent button to proceed.
3. Cash App will send a verification code to the email address.

STEP 2 — Retrieve verification code from email:
1. Open a NEW TAB and go to https://mail.google.com/
2. If prompted to sign in to Gmail, enter email x_cashapp_email, click Next.
   If a password is needed, enter x_cashapp_pass and click Next.
3. Once in the inbox, look for the most recent email from Cash App
   (sender may contain "cash", "square", or "Cash App").
4. Open the email and find the verification code / sign-in code.
   It is usually a 6-digit number or a short alphanumeric code.
5. Copy or remember that code.
6. Switch back to the Cash App tab (the first tab).
7. Enter the verification code into the field and submit it.

STEP 3 — Enter PIN:
1. After email verification, Cash App will ask for your PIN.
2. Enter the PIN: x_cashapp_pin
3. Submit / confirm the PIN.
4. You should now be logged in to Cash App.

STEP 4 — Navigate to address settings:
1. Look for your profile icon, account settings, or a menu/hamburger icon.
2. Navigate to Account or Settings.
3. Find the "Address" or "Personal Information" section.
4. Click "Edit" next to the current address.

STEP 5 — Update the address:
1. Clear any existing address fields.
2. Fill in the new address:
   - Street address: {street_address}
   - City: {city}
   - State: {state}
   - ZIP Code: {zip_code}
3. Click "Save" or "Update" to confirm the new address.

STEP 6 — Confirm:
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
    disable_crashy_watchdogs(browser)
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
            "x_cashapp_email": CASHAPP_EMAIL,
            "x_cashapp_pass": CASHAPP_PASSWORD,
            "x_cashapp_pin": CASHAPP_PIN,
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
        update_cashapp_address(
            street_address="5122 Mertola Drive",
            city="El Dorado Hills",
            state="CA",
            zip_code="95762",
        )
    )
