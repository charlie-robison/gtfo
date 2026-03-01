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

    task = f"""
You have two tabs already open:
  - Tab 1: https://www.uhaul.com (U-Haul homepage)
  - Tab 2: https://mail.google.com/ (Gmail — for OTP codes if needed)

Start on Tab 1 (the U-Haul tab).

STEP 1 — Sign in (skip if already signed in):
1. First, check if you are ALREADY signed in — look for a greeting, account icon, "My Account", or your name in the header.
   - If you ARE already signed in, skip directly to STEP 2.
2. If NOT signed in, look for a "Sign In" link or button (usually in the top-right header area) and click it.
3. Enter email x_uhaul_email and password x_uhaul_pass to sign in.
4. If a CAPTCHA or verification appears that you cannot solve, wait a moment and try again.
5. If a One-Time Password (OTP) / verification code screen appears, do the following:
   a. Switch to Tab 2 (Gmail tab — it should already be open).
   b. If prompted to sign in to Gmail, enter email x_uhaul_email, click Next, then enter password x_uhaul_pass, and click Next.
   c. Once in the inbox, look for the most recent email from U-Haul (sender may contain "uhaul" or "U-Haul"). Open it.
   d. Find the one-time password / verification code in the email body. It is usually a 6-digit number.
   e. Copy or remember that code.
   f. Switch back to Tab 1 (the U-Haul tab).
   g. Enter the OTP code into the verification field and submit it.
6. Confirm you are signed in (look for a greeting, account icon, or "My Account" link).

STEP 2 — Start a reservation:
1. On the homepage (or navigate back to it), find the reservation / quote form.
2. Select the moving type. Choose "One-Way" if the pickup and drop-off locations are different, otherwise choose "In-Town".
3. Fill in the form fields. IMPORTANT: Each field may already contain a pre-filled address from the account. You MUST fully clear it before typing the new value. Never leave old text in the field.
   - Picking Up: Click the field. Triple-click to select all text, then press Backspace/Delete to remove it. Verify the field is completely empty. Then type {pickup_location}. Wait for the autocomplete dropdown and select the matching suggestion.
   - Dropping Off: Click the field. Triple-click to select all text, then press Backspace/Delete to remove it. Verify the field is completely empty. Then type {dropoff_location}. Wait for the autocomplete dropdown and select the matching suggestion.
   - Pick-Up Date: Clear any pre-filled date first, then enter {pickup_date}.
   - Pick-Up Time: Clear any pre-filled time first, then enter {pickup_time}.
4. Click "Get Rates" or the equivalent search / submit button.

STEP 3 — Choose a vehicle:
1. On the results page, browse the available vehicles.
2. Look for a {vehicle_type}. Pick the cheapest option that matches "{vehicle_type}" (e.g. a 10' truck if truck is requested and it is the cheapest).
3. Click the "Reserve" or "Add to Order" button for that vehicle.

STEP 4 — Add Moving Help (labor package):
{step4}

STEP 5 — Proceed through the reservation flow:
1. Continue through any remaining pages (coverage/protection options, equipment add-ons, etc.).
   - You may skip or decline optional extras unless they are required.
2. Keep clicking "Continue", "Next", or the equivalent button to advance.

STEP 6 — STOP before payment:
1. As soon as you reach a page that asks for credit card or payment information, STOP.
2. Do NOT enter any payment details. Do NOT click any "Complete Reservation" or "Place Order" button.
3. Report back that the reservation is ready for payment and summarize:
   - Vehicle selected
   - Pickup location & date/time
   - Drop-off location{step6_labor}
   - Total estimated cost shown on the page
"""

    browser = Browser(
        headless=False,
        keep_alive=True,
        user_data_dir=UHAUL_PROFILE_DIR,
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
        order_uhaul(
            pickup_location="El Dorado Hills, CA",
            dropoff_location="Sacramento, CA",
            pickup_date="03/15/2026",
            pickup_time="10:00 AM",
            vehicle_type="truck",
        )
    )
