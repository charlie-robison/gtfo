"""
Skill: Amazon Furniture Cart

This skill searches for a list of furniture items on Amazon,
adds each to the cart, then proceeds to checkout and stops
before placing the order (demo mode).
"""

import asyncio
import os
from browser_use import Agent, Browser, ChatBrowserUse
from dotenv import load_dotenv

load_dotenv()

AMAZON_EMAIL = os.getenv("AMAZON_EMAIL", "")
AMAZON_PASSWORD = os.getenv("AMAZON_PASSWORD", "")


async def amazon_furniture_cart(furniture_items: list[str], screenshot_loop=None) -> object:
    """
    Search for furniture items on Amazon, add each to cart, and proceed to checkout.

    Args:
        furniture_items: List of search terms (e.g. ["queen mattress", "6-drawer dresser", "bookshelf"])
    """
    numbered_items = "\n".join(
        f"   {i}. {item}" for i, item in enumerate(furniture_items, 1)
    )

    task = f"""
Go to https://www.amazon.com and do the following:

1. If prompted to sign in, enter email x_amazon_email and password x_amazon_pass to log in.

2. For each item in the following list, search for it using the Amazon search bar,
   pick the first reasonable and well-reviewed result (prioritize Prime-eligible items),
   click "Add to Cart", then return to the Amazon homepage or search bar for the next item.

   Items to add:
{numbered_items}

3. After ALL items above have been added to the cart, click on the cart icon
   and then click "Proceed to checkout".

4. STOP once the checkout/payment page loads. Do NOT enter any payment information
   and do NOT place the order.

5. Report a summary of all items in the cart and the total price.
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
    # Example usage — sample furniture list for a move
    asyncio.run(
        amazon_furniture_cart(
            furniture_items=[
                "queen mattress",
                "6-drawer dresser",
                "bookshelf",
            ]
        )
    )
