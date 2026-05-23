"""Pydantic models for CRM."""
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# --- Auth ---
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str = "user"
    avatar_color: Optional[str] = None
    created_at: str


# --- Company ---
class CompanyIn(BaseModel):
    name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    employees: Optional[int] = None
    location: Optional[str] = None
    status: Optional[str] = "active"  # active | prospect | churned
    annual_revenue: Optional[float] = None
    notes: Optional[str] = None
    owner_id: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    employees: Optional[int] = None
    location: Optional[str] = None
    status: Optional[str] = None
    annual_revenue: Optional[float] = None
    notes: Optional[str] = None
    owner_id: Optional[str] = None


# --- Contact ---
class ContactIn(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    title: Optional[str] = None
    company_id: Optional[str] = None
    owner_id: Optional[str] = None
    status: Optional[str] = "active"
    tags: Optional[List[str]] = []
    notes: Optional[str] = None


class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    title: Optional[str] = None
    company_id: Optional[str] = None
    owner_id: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None


# --- Deal ---
class DealIn(BaseModel):
    name: str
    value: float = 0
    stage: str  # stage id (e.g. "new_lead", "qualified", ...)
    pipeline_id: Optional[str] = "default"
    company_id: Optional[str] = None
    primary_contact_id: Optional[str] = None
    owner_id: Optional[str] = None
    priority: Optional[str] = "medium"  # low | medium | high
    expected_close_date: Optional[str] = None
    probability: Optional[int] = 50
    status: Optional[str] = "open"  # open | won | lost
    notes: Optional[str] = None


class DealUpdate(BaseModel):
    name: Optional[str] = None
    value: Optional[float] = None
    stage: Optional[str] = None
    pipeline_id: Optional[str] = None
    company_id: Optional[str] = None
    primary_contact_id: Optional[str] = None
    owner_id: Optional[str] = None
    priority: Optional[str] = None
    expected_close_date: Optional[str] = None
    probability: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None


# --- Activity ---
class ActivityIn(BaseModel):
    type: str  # call | meeting | task
    title: str
    description: Optional[str] = None
    status: Optional[str] = "pending"  # pending | done
    due_date: Optional[str] = None
    deal_id: Optional[str] = None
    contact_id: Optional[str] = None
    company_id: Optional[str] = None
    owner_id: Optional[str] = None


class ActivityUpdate(BaseModel):
    type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[str] = None
    deal_id: Optional[str] = None
    contact_id: Optional[str] = None
    company_id: Optional[str] = None
    owner_id: Optional[str] = None


# --- Automation ---
class AutomationIn(BaseModel):
    name: str
    enabled: bool = True
    trigger: Dict[str, Any]  # {"type": "deal_stage_changed", "to_stage": "closed_won"} | {"type":"deal_created"} | {"type":"contact_added_to_company"}
    conditions: Optional[List[Dict[str, Any]]] = []
    action: Dict[str, Any]  # {"type":"create_task","title":"Follow up","due_offset_days":3}


class AutomationUpdate(BaseModel):
    name: Optional[str] = None
    enabled: Optional[bool] = None
    trigger: Optional[Dict[str, Any]] = None
    conditions: Optional[List[Dict[str, Any]]] = None
    action: Optional[Dict[str, Any]] = None


# --- Pipelines (static for MVP) ---
DEFAULT_PIPELINE = {
    "id": "default",
    "name": "Sales Pipeline",
    "stages": [
        {"id": "new_lead", "name": "New Lead", "order": 1, "color": "slate"},
        {"id": "qualified", "name": "Qualified", "order": 2, "color": "blue"},
        {"id": "proposal", "name": "Proposal Sent", "order": 3, "color": "amber"},
        {"id": "negotiation", "name": "Negotiation", "order": 4, "color": "violet"},
        {"id": "closed_won", "name": "Closed Won", "order": 5, "color": "emerald"},
        {"id": "closed_lost", "name": "Closed Lost", "order": 6, "color": "rose"},
    ],
}
