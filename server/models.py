"""Pydantic models for request/response schemas."""

from typing import Any, List, Optional

from pydantic import BaseModel, Field


# ── Job tracking ──────────────────────────────────────────────────

class Job(BaseModel):
    id: str
    type: str
    status: str  # pending | running | completed | failed
    params: dict
    result: Optional[Any] = None
    error_message: Optional[str] = None


# ── Endpoint 1: Search Rentals ────────────────────────────────────

class SearchRentalsRequest(BaseModel):
    budget: int
    city: str
    state: str
    full_name: str
    phone: str
    move_in_date: str
    min_bedrooms: int = 1
    min_bathrooms: int = 1
    initial_address: str = ""


class RedfinApplication(BaseModel):
    address: str = ""
    monthly_rent_price: float = 0
    num_bedrooms: int = 0
    num_bathrooms: int = 0
    square_footage: int = 0
    move_in_cost: float = 0
    url: str = ""


# ── Endpoint 2: Moving Pipeline ──────────────────────────────────

class MovingPipelineRequest(BaseModel):
    destination_address: str
    date: str
    pickup_time: str = "10:00 AM"


class HouseAnalysis(BaseModel):
    house_description: str = ""
    estimated_bedrooms: int = 0
    estimated_square_footage: int = 0
    stuff_volume_estimate: str = ""
    recommended_truck_size: str = ""
    reasoning: str = ""
    recommended_workers: int = 0
    labor_reasoning: str = ""


class FurnitureItem(BaseModel):
    item_name: str
    room: str
    amazon_search_query: str
    priority: str = "essential"


class MovingPipelineResponse(BaseModel):
    analysis: HouseAnalysis
    furniture: List[FurnitureItem]
    uhaul_job_id: str


# ── Endpoint 3: Update Address ───────────────────────────────────

class UpdateAddressRequest(BaseModel):
    full_name: str
    street_address: str
    city: str
    state: str
    zip_code: str
    phone: str = ""


# ── Endpoint 4: Order Furniture ──────────────────────────────────

class UHaulInformation(BaseModel):
    vehicle: str = ""
    pickup_location: str = ""
    pickup_time: str = ""
    drop_off_location: str = ""
    moving_help_provider: str = ""
    num_workers: int = 0
    num_hours: int = 0
    total_cost: float = 0


class AmazonOrderSummary(BaseModel):
    summary: str = ""
