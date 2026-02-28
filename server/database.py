"""
MongoDB connection and collection accessors.

Collections mirror the original Convex schema:
  - steps
  - jobs
  - search_constraints
  - current_house_information
  - redfin_applications
  - uhaul_information
  - recommended_furniture
  - amazon_order_summary
"""

import os
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "automovers")

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


def get_db() -> AsyncIOMotorDatabase:
    global _client, _db
    if _db is None:
        _client = AsyncIOMotorClient(MONGO_URL)
        _db = _client[DB_NAME]
    return _db


# ── Collection accessors ─────────────────────────────────────────

def steps_col():
    return get_db()["steps"]

def jobs_col():
    return get_db()["jobs"]

def search_constraints_col():
    return get_db()["search_constraints"]

def current_house_information_col():
    return get_db()["current_house_information"]

def redfin_applications_col():
    return get_db()["redfin_applications"]

def uhaul_information_col():
    return get_db()["uhaul_information"]

def recommended_furniture_col():
    return get_db()["recommended_furniture"]

def amazon_order_summary_col():
    return get_db()["amazon_order_summary"]
