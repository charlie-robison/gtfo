"""
Skill: Update Delivery Address on Amazon

This skill navigates to Amazon's address management page and updates
the default delivery address with the provided details.
"""

import asyncio
import os
from browser_use import Agent, Browser, ChatBrowserUse
from dotenv import load_dotenv

load_dotenv()

AMAZON_EMAIL = os.getenv("AMAZON_EMAIL", "")
AMAZON_PASSWORD = os.getenv("AMAZON_PASSWORD", "")


async def update_amazon_address(
    full_name: str,
    street_address: str,
    city: str,
    state: str,
    zip_code: str,
    country: str = "United States",
    phone: str = "",
    is_default: bool = True,
    screenshot_loop=None,
):
    """
    Update the delivery address on Amazon.

    Args:
        full_name: Full name for the address (e.g. "Charlie Robison")
        street_address: Street address line (e.g. "123 Main St, Apt 4")
        city: City name
        state: State or province
        zip_code: ZIP or postal code
        country: Country (default: "United States")
        phone: Phone number (optional)
        is_default: Whether to set as default address (default: True)
    """
    task = f"""
Go to https://www.amazon.com/a/addresses and do the following:

1. If prompted to sign in, enter email x_amazon_email and password x_amazon_pass to log in.
2. Click "Add address" to add a new address.
3. Fill in the address form with:
   - Full name: {full_name}
   - Street address: {street_address}
   - City: {city}
   - State: {state}
   - ZIP Code: {zip_code}
   - Country: {country}
   {"- Phone number: " + phone if phone else ""}
4. Click "Add address" to save.
{"5. After saving, set this address as the default delivery address." if is_default else ""}
6. Confirm the address was saved successfully.
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

    # Start browser and disable WebAuthn/passkey API via CDP
    # This prevents the iCloud Keychain "Use a saved passkey" dialog
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
            "x_amazon_email": AMAZON_EMAIL,
            "x_amazon_pass": AMAZON_PASSWORD,
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
    # Example usage — fill in your details below
    asyncio.run(
        update_amazon_address(
            full_name="Brycen Mcormick",
            street_address="5122 Mertola Drive",
            city="El Dorado Hills",
            state="CA",
            zip_code="95762",
            phone="808-352-0499",
        )
    )
