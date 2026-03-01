"""
Skill: Order a U-Haul Truck

This skill navigates to uhaul.com, signs in, searches for a truck,
and proceeds through the reservation flow up to (but not including)
the payment / credit-card step.
"""

import asyncio
import os
from pathlib import Path
from browser_use import Agent, Browser, ChatBrowserUse
from dotenv import load_dotenv

load_dotenv()

UHAUL_EMAIL = os.getenv("AMAZON_EMAIL", "")
UHAUL_PASSWORD = os.getenv("AMAZON_PASSWORD", "")

# Persistent browser profile directory — preserves cookies/login state across runs
UHAUL_PROFILE_DIR = str(Path(__file__).resolve().parent.parent / "profiles" / "uhaul")


async def order_uhaul(
    pickup_location: str,
    dropoff_location: str,
    pickup_date: str,
    pickup_time: str = "10:00 AM",
    vehicle_type: str = "truck",
    num_workers: int = 0,
    loading_address: str = "",
    screenshot_loop=None,
):
    """
    Search for and reserve a U-Haul, stopping before payment.

    Args:
        pickup_location: Address or city/state for pickup (e.g. "El Dorado Hills, CA")
        dropoff_location: Address or city/state for drop-off (e.g. "Sacramento, CA")
        pickup_date: Desired pickup date (e.g. "03/15/2026")
        pickup_time: Desired pickup time (default: "10:00 AM")
        vehicle_type: Type of vehicle — "truck", "trailer", "cargo van", etc. (default: "truck")
        num_workers: Number of moving helpers to add via Moving Help (0 = skip). (default: 0)
        loading_address: Full street address where movers will load (e.g. "1234 Main St, El Dorado Hills, CA 95762").
                         Required when num_workers > 0. Falls back to pickup_location if empty.
    """
    # Build conditional sections before the main task string
    service_address = loading_address if loading_address else pickup_location
    if num_workers > 0:
        step4 = (
            "1. During the reservation flow, look for a \"Moving Help\" or \"Moving Labor\" section/page.\n"
            "   This typically appears as an add-on step where you can hire moving helpers.\n"
            "2. If the page asks for a loading/service address:\n"
            "   a. Clear any pre-filled value in the address field.\n"
            f"   b. Type the full address: {service_address}\n"
            "   c. Wait a moment for the autocomplete/suggestion dropdown to appear.\n"
            "   d. Select the matching address from the dropdown list. You MUST click one of the dropdown suggestions — do not just press Enter on the typed text.\n"
            "   e. If no dropdown appears, try re-typing the address more slowly or try a slightly different format.\n"
            "   f. Click \"Search\", \"Find Help\", or the equivalent button after the address is accepted.\n"
            "3. You should see a list of Moving Help service providers with prices, ratings, number of helpers, and hours.\n"
            f"4. Look for a provider offering {num_workers} helpers (workers/movers).\n"
            f"   - If no provider offers exactly {num_workers}, pick the closest match with at least {num_workers} workers.\n"
            "5. Among matching providers, select the one with the lowest price.\n"
            "6. Click \"Select\" or the equivalent button to add that Moving Help provider to the order.\n"
            "7. Continue to the next step."
        )
        step6_labor = "\n   - Moving Help provider selected, number of workers, hours, and cost"
    else:
        step4 = "1. If a Moving Help or Moving Labor add-on page appears, skip it — click Continue or Next to proceed without adding labor."
        step6_labor = ""

    task = f"""Two tabs are open: Tab 1 = uhaul.com, Tab 2 = Gmail (for OTP). Start on Tab 1.

STEP 1 — Sign in (skip if already signed in):
If you see a greeting or "My Account" in the header, skip to STEP 2.
Otherwise: click "Sign In", enter x_uhaul_email and x_uhaul_pass.
If OTP is required: switch to Tab 2 (Gmail), sign in with x_uhaul_email / x_uhaul_pass if needed, find the latest U-Haul email, copy the 6-digit code, switch back to Tab 1, enter the code and submit.

STEP 2 — Start a reservation:
On the homepage, fill the reservation form: One-Way (pickup/dropoff differ) or In-Town.
Picking Up: {pickup_location} | Dropping Off: {dropoff_location} | Date: {pickup_date} | Time: {pickup_time}
Click "Get Rates" / "Search".

STEP 3 — Choose a vehicle:
Select the cheapest {vehicle_type} and click "Reserve" / "Select".

STEP 4 — Moving Help:
{step4}

STEP 5 — Continue through remaining pages:
Decline all optional extras (coverage, protection, equipment, Safetrip). Click "Continue" / "Next" / "No Thanks" to advance. On the cart page click "Check Out".

STEP 6 — STOP before payment:
When you see a credit card / payment form, STOP. Do NOT enter payment info.
Report: vehicle selected, pickup location & date/time, drop-off location{step6_labor}, total estimated cost.
"""

    browser = Browser(
        headless=False,
        keep_alive=True,
        user_data_dir=UHAUL_PROFILE_DIR,
        enable_default_extensions=False,
        args=[
            "--disable-features=AutofillServerCommunication",
            "--disable-save-password-bubble",
            "--password-store=basic",
            "--disable-extensions",
            "--disable-background-networking",
            "--disable-sync",
            "--disable-translate",
            "--no-first-run",
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

    # Pre-open both tabs so pages load while the agent initializes
    uhaul_page = await browser.get_current_page()
    if uhaul_page:
        await uhaul_page.goto("https://www.uhaul.com")
    else:
        uhaul_page = await browser.new_page("https://www.uhaul.com")
    await browser.new_page("https://mail.google.com/")
    # Set agent focus back to the U-Haul tab
    browser.agent_focus_target_id = uhaul_page._target_id

    llm = ChatBrowserUse()
    agent = Agent(
        task=task,
        llm=llm,
        browser=browser,
        sensitive_data={
            "x_uhaul_email": UHAUL_EMAIL,
            "x_uhaul_pass": UHAUL_PASSWORD,
        },
        use_vision=True,
        max_actions_per_step=10,
        use_judge=False,
    )
    bg_task = None
    if screenshot_loop:
        bg_task = asyncio.create_task(screenshot_loop(browser))
    try:
        result = await agent.run(max_steps=40)
    finally:
        if bg_task:
            bg_task.cancel()
    return result


if __name__ == "__main__":
    asyncio.run(
        order_uhaul(
            pickup_location="El Dorado Hills, CA",
            dropoff_location="Sacramento, CA",
            pickup_date="03/15/2026",
            pickup_time="10:00 AM",
            vehicle_type="truck",
        )
    )
