"""
Agent output parsing utilities and shared browser helpers.

Uses GPT-4o to extract structured data from browser agent free-text output.
Provides create_skill_browser() for resilient browser automation sessions.
"""

from __future__ import annotations

import json

from openai import OpenAI


async def create_skill_browser(
    headless: bool = False,
    keep_alive: bool = True,
    disable_webauthn: bool = True,
    extra_args: list[str] | None = None,
    user_data_dir: str | None = None,
) -> "BrowserSession":
    """Create and start a browser session optimized for skill automation.

    Disables watchdogs that cause cascading errors when CDP targets detach
    (StorageStateWatchdog, PopupsWatchdog, SecurityWatchdog).
    """
    from browser_use import Browser

    kwargs: dict = dict(
        headless=headless,
        keep_alive=keep_alive,
        enable_default_extensions=False,
        args=list(extra_args or []),
    )
    if user_data_dir is not None:
        kwargs["user_data_dir"] = user_data_dir

    browser = Browser(**kwargs)
    await browser.start()

    # Disable StorageStateWatchdog — its periodic cookie-save triggers
    # cascading errors when targets detach, and we don't need persistence
    if getattr(browser, "_storage_state_watchdog", None) is not None:
        wd = browser._storage_state_watchdog
        if getattr(wd, "_monitoring_task", None) and not wd._monitoring_task.done():
            wd._monitoring_task.cancel()
        browser._storage_state_watchdog = None

    # Disable PopupsWatchdog — sites like Redfin open tabs that the
    # watchdog considers "disallowed" and closes, which detaches targets
    if getattr(browser, "_popups_watchdog", None) is not None:
        browser._popups_watchdog = None

    # Disable SecurityWatchdog
    if getattr(browser, "_security_watchdog", None) is not None:
        browser._security_watchdog = None

    # Remove watchdog handlers from the event bus
    event_bus = getattr(browser, "event_bus", None)
    if event_bus is not None:
        handlers_dict = getattr(event_bus, "handlers", {})
        watchdog_tags = ("SecurityWatchdog", "StorageStateWatchdog", "PopupsWatchdog")
        for _event_name, handler_list in handlers_dict.items():
            handler_list[:] = [
                h
                for h in handler_list
                if not any(tag in getattr(h, "__name__", "") for tag in watchdog_tags)
            ]

    # Optionally disable WebAuthn/passkey API to prevent iCloud Keychain dialogs
    if disable_webauthn:
        await browser._cdp_add_init_script("""
            navigator.credentials.get = () => Promise.reject('WebAuthn disabled');
            navigator.credentials.create = () => Promise.reject('WebAuthn disabled');
            if (window.PublicKeyCredential) {
                window.PublicKeyCredential.isConditionalMediationAvailable = () => Promise.resolve(false);
                window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = () => Promise.resolve(false);
            }
        """)

    return browser

_client = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI()
    return _client


def parse_redfin_results(agent_result: str) -> list[dict]:
    """Extract structured listing data from the Redfin agent's free-text output.

    Returns a list of dicts, each with:
        name, address, city, description, imageUrl,
        monthlyRentPrice, numBedrooms, numBathrooms,
        squareFootage, moveInCost, url
    """
    response = _get_client().chat.completions.create(
        model="gpt-4o",
        max_tokens=4096,
        messages=[
            {
                "role": "system",
                "content": (
                    "You extract structured rental listing data from browser agent output. "
                    "Return ONLY a JSON array of objects. Each object must have exactly these keys: "
                    "name (string - property name/title), "
                    "address (string - full street address), "
                    "city (string - city name), "
                    "description (string - property description, first 500 chars), "
                    "imageUrl (string - URL of the main listing photo), "
                    "monthlyRentPrice (number), numBedrooms (number), "
                    "numBathrooms (number), squareFootage (number), moveInCost (number), "
                    "url (string - full Redfin listing URL). "
                    "If a value is unknown, use 0 for numbers and empty string for strings. "
                    "No markdown fences, no extra text."
                ),
            },
            {
                "role": "user",
                "content": f"Extract the rental listings from this agent output:\n\n{agent_result}",
            },
        ],
    )

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        lines = raw.splitlines()
        lines = [l for l in lines if not l.strip().startswith("```")]
        raw = "\n".join(lines)

    return json.loads(raw)


def parse_uhaul_result(agent_result: str) -> dict:
    """Extract UHaul reservation details from the agent's free-text output.

    Returns a dict with:
        vehicle, pickupLocation, pickupTime, dropOffLocation,
        movingHelpProvider, numWorkers, numHours, totalCost
    """
    response = _get_client().chat.completions.create(
        model="gpt-4o",
        max_tokens=1024,
        messages=[
            {
                "role": "system",
                "content": (
                    "You extract structured U-Haul reservation data from browser agent output. "
                    "Return ONLY a JSON object with exactly these keys: "
                    "vehicle (string), pickupLocation (string), pickupTime (string), "
                    "dropOffLocation (string), movingHelpProvider (string), numWorkers (number), "
                    "numHours (number), totalCost (number). "
                    "If a value is unknown, use 0 for numbers and empty string for strings. "
                    "No markdown fences, no extra text."
                ),
            },
            {
                "role": "user",
                "content": f"Extract the U-Haul reservation details from this agent output:\n\n{agent_result}",
            },
        ],
    )

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        lines = raw.splitlines()
        lines = [l for l in lines if not l.strip().startswith("```")]
        raw = "\n".join(lines)

    return json.loads(raw)
