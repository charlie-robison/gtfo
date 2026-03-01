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

_CDP_DISABLE_WEBAUTHN = """\
navigator.credentials.get = () => Promise.reject('WebAuthn disabled');
navigator.credentials.create = () => Promise.reject('WebAuthn disabled');
if (window.PublicKeyCredential) {
    window.PublicKeyCredential.isConditionalMediationAvailable = () => Promise.resolve(false);
    window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = () => Promise.resolve(false);
}"""


async def amazon_furniture_cart(furniture_items: list[str], screenshot_loop=None) -> object:
    """
    Search for furniture items on Amazon, add each to cart, and proceed to checkout.

    Args:
        furniture_items: List of search terms (e.g. ["queen mattress", "6-drawer dresser", "bookshelf"])
    """
    numbered_items = "\n".join(
        f"   {i}. {item}" for i, item in enumerate(furniture_items, 1)
    )

    task = f"""\
Go to amazon.com. Sign in with email x_amazon_email / password x_amazon_pass if prompted.

For each item below, search Amazon, pick the first well-reviewed Prime-eligible result, \
click "Add to Cart", then search for the next item.

Items:
{numbered_items}

After all items are added, click the cart icon, click "Proceed to checkout", then STOP. \
Do NOT enter payment or place the order. Report a summary of cart items and total price."""

    browser = Browser(
        headless=False,
        keep_alive=True,
        args=[
            "--disable-features=AutofillServerCommunication",
            "--disable-save-password-bubble",
            "--password-store=basic",
            "--disable-extensions",
            "--disable-default-apps",
            "--no-first-run",
            "--disable-translate",
            "--disable-background-networking",
            "--disable-sync",
        ],
    )

    # Start browser and disable WebAuthn/passkey API via CDP
    # This prevents the iCloud Keychain "Use a saved passkey" dialog
    await browser.start()
    await browser._cdp_add_init_script(_CDP_DISABLE_WEBAUTHN)

    agent = Agent(
        task=task,
        llm=ChatBrowserUse(),
        browser=browser,
        sensitive_data={
            "x_amazon_email": AMAZON_EMAIL,
            "x_amazon_pass": AMAZON_PASSWORD,
        },
        use_vision=True,
        max_actions_per_step=5,
    )
    return await agent.run()


if __name__ == "__main__":
    asyncio.run(
        amazon_furniture_cart(
            furniture_items=[
                "queen mattress",
                "6-drawer dresser",
                "bookshelf",
            ]
        )
    )
