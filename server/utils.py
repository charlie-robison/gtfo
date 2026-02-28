"""
Agent output parsing utilities.

Uses GPT-4o to extract structured data from browser agent free-text output.
"""

import json

from openai import OpenAI

_client = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI()
    return _client


def parse_redfin_results(agent_result: str) -> list[dict]:
    """Extract structured listing data from the Redfin agent's free-text output.

    Returns a list of dicts, each with:
        address, monthlyRentPrice, numBedrooms, numBathrooms,
        squareFootage, moveInCost, url
    """
    response = _get_client().chat.completions.create(
        model="gpt-4o",
        max_tokens=2048,
        messages=[
            {
                "role": "system",
                "content": (
                    "You extract structured rental listing data from browser agent output. "
                    "Return ONLY a JSON array of objects. Each object must have exactly these keys: "
                    "address (string), monthlyRentPrice (number), numBedrooms (number), "
                    "numBathrooms (number), squareFootage (number), moveInCost (number), url (string). "
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
