"""FlowCRM backend — FastAPI app with auth and CRM resources."""
from dotenv import load_dotenv
load_dotenv()

import csv
import io
import os
from datetime import datetime, timezone
from typing import Optional, List

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import FastAPI, HTTPException, Request, Response, Depends, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    set_auth_cookies,
    clear_auth_cookies,
    get_current_user,
    get_jwt_secret,
)
from models import (
    RegisterRequest,
    LoginRequest,
    CompanyIn,
    CompanyUpdate,
    ContactIn,
    ContactUpdate,
    DealIn,
    DealUpdate,
    ActivityIn,
    ActivityUpdate,
    AutomationIn,
    AutomationUpdate,
    DEFAULT_PIPELINE,
)
from automations import fire_event

# --- Mongo ---
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="FlowCRM API")

frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# --- Helpers ---
def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail=f"Invalid id: {id_str}")


def _doc(d: Optional[dict]) -> Optional[dict]:
    if d is None:
        return None
    d["id"] = str(d.pop("_id"))
    for k, v in list(d.items()):
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    d.pop("password_hash", None)
    return d


def _docs(items: List[dict]) -> List[dict]:
    return [_doc(it) for it in items]


# --- Startup ---
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.companies.create_index("name")
    await db.contacts.create_index("email")
    await db.deals.create_index("stage")
    await db.activities.create_index("due_date")

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@flowcrm.io")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@1234")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "avatar_color": "#0f172a",
            "created_at": datetime.now(timezone.utc),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )


# === AUTH ROUTES ============================================================
@app.post("/api/auth/register")
async def register(payload: RegisterRequest, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "role": "user",
        "avatar_color": "#0ea5e9",
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.users.insert_one(user_doc)
    user_id = str(res.inserted_id)
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return {
        "id": user_id,
        "email": email,
        "name": payload.name,
        "role": "user",
        "avatar_color": user_doc["avatar_color"],
        "created_at": user_doc["created_at"].isoformat(),
        "access_token": access,
    }


@app.post("/api/auth/login")
async def login(payload: LoginRequest, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    user_id = str(user["_id"])
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return {
        "id": user_id,
        "email": email,
        "name": user.get("name", ""),
        "role": user.get("role", "user"),
        "avatar_color": user.get("avatar_color"),
        "created_at": user.get("created_at").isoformat() if isinstance(user.get("created_at"), datetime) else user.get("created_at"),
        "access_token": access,
    }


@app.post("/api/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}


@app.get("/api/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@app.post("/api/auth/refresh")
async def refresh(request: Request, response: Response):
    import jwt as pyjwt
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = pyjwt.decode(token, get_jwt_secret(), algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = payload["sub"]
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(user_id, user["email"])
        new_refresh = create_refresh_token(user_id)
        set_auth_cookies(response, access, new_refresh)
        return {"ok": True}
    except pyjwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# === USERS (for owner picker) ===============================================
@app.get("/api/users")
async def list_users(user: dict = Depends(get_current_user)):
    users = await db.users.find({}, {"password_hash": 0}).to_list(length=200)
    return _docs(users)


# === COMPANIES ==============================================================
@app.get("/api/companies")
async def list_companies(
    q: Optional[str] = None,
    status: Optional[str] = None,
    industry: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    query = {}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    if status:
        query["status"] = status
    if industry:
        query["industry"] = industry
    items = await db.companies.find(query).sort("created_at", -1).to_list(length=1000)
    return _docs(items)


@app.post("/api/companies")
async def create_company(payload: CompanyIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    if not doc.get("owner_id"):
        doc["owner_id"] = user["id"]
    res = await db.companies.insert_one(doc)
    return _doc(await db.companies.find_one({"_id": res.inserted_id}))


@app.get("/api/companies/{cid}")
async def get_company(cid: str, user: dict = Depends(get_current_user)):
    doc = await db.companies.find_one({"_id": _oid(cid)})
    if not doc:
        raise HTTPException(status_code=404, detail="Company not found")
    return _doc(doc)


@app.patch("/api/companies/{cid}")
async def update_company(cid: str, payload: CompanyUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.companies.update_one({"_id": _oid(cid)}, {"$set": update})
    return _doc(await db.companies.find_one({"_id": _oid(cid)}))


@app.delete("/api/companies/{cid}")
async def delete_company(cid: str, user: dict = Depends(get_current_user)):
    await db.companies.delete_one({"_id": _oid(cid)})
    return {"ok": True}


# === CONTACTS ===============================================================
@app.get("/api/contacts")
async def list_contacts(
    q: Optional[str] = None,
    company_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    query = {}
    if q:
        query["$or"] = [
            {"first_name": {"$regex": q, "$options": "i"}},
            {"last_name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
        ]
    if company_id:
        query["company_id"] = company_id
    if status:
        query["status"] = status
    items = await db.contacts.find(query).sort("created_at", -1).to_list(length=2000)
    return _docs(items)


@app.post("/api/contacts")
async def create_contact(payload: ContactIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    if not doc.get("owner_id"):
        doc["owner_id"] = user["id"]
    res = await db.contacts.insert_one(doc)
    new = await db.contacts.find_one({"_id": res.inserted_id})
    # Trigger automation
    await fire_event(db, "contact_added_to_company", {
        "contact_id": str(res.inserted_id),
        "company_id": doc.get("company_id"),
        "owner_id": doc.get("owner_id"),
    })
    return _doc(new)


@app.get("/api/contacts/{cid}")
async def get_contact(cid: str, user: dict = Depends(get_current_user)):
    doc = await db.contacts.find_one({"_id": _oid(cid)})
    if not doc:
        raise HTTPException(status_code=404, detail="Contact not found")
    return _doc(doc)


@app.patch("/api/contacts/{cid}")
async def update_contact(cid: str, payload: ContactUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.contacts.update_one({"_id": _oid(cid)}, {"$set": update})
    return _doc(await db.contacts.find_one({"_id": _oid(cid)}))


@app.delete("/api/contacts/{cid}")
async def delete_contact(cid: str, user: dict = Depends(get_current_user)):
    await db.contacts.delete_one({"_id": _oid(cid)})
    return {"ok": True}


@app.get("/api/contacts/export/csv")
async def export_contacts_csv(user: dict = Depends(get_current_user)):
    items = await db.contacts.find({}).to_list(length=5000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["first_name", "last_name", "email", "phone", "title", "status", "company_id", "tags"])
    for it in items:
        writer.writerow([
            it.get("first_name", ""),
            it.get("last_name", ""),
            it.get("email", ""),
            it.get("phone", ""),
            it.get("title", ""),
            it.get("status", ""),
            it.get("company_id", ""),
            ",".join(it.get("tags") or []),
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=contacts.csv"},
    )


@app.post("/api/contacts/import/csv")
async def import_contacts_csv(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    content = (await file.read()).decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))
    imported = 0
    for row in reader:
        if not row.get("first_name") and not row.get("last_name") and not row.get("email"):
            continue
        doc = {
            "first_name": (row.get("first_name") or "").strip(),
            "last_name": (row.get("last_name") or "").strip(),
            "email": (row.get("email") or "").strip().lower() or None,
            "phone": (row.get("phone") or "").strip() or None,
            "title": (row.get("title") or "").strip() or None,
            "status": (row.get("status") or "active").strip() or "active",
            "company_id": (row.get("company_id") or "").strip() or None,
            "tags": [t.strip() for t in (row.get("tags") or "").split(",") if t.strip()],
            "owner_id": user["id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.contacts.insert_one(doc)
        imported += 1
    return {"imported": imported}


# === DEALS ==================================================================
@app.get("/api/deals")
async def list_deals(
    q: Optional[str] = None,
    stage: Optional[str] = None,
    status: Optional[str] = None,
    owner_id: Optional[str] = None,
    priority: Optional[str] = None,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    user: dict = Depends(get_current_user),
):
    query = {}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    if stage:
        query["stage"] = stage
    if status:
        query["status"] = status
    if owner_id:
        query["owner_id"] = owner_id
    if priority:
        query["priority"] = priority
    if min_value is not None or max_value is not None:
        rng = {}
        if min_value is not None:
            rng["$gte"] = min_value
        if max_value is not None:
            rng["$lte"] = max_value
        query["value"] = rng
    items = await db.deals.find(query).sort("created_at", -1).to_list(length=2000)
    return _docs(items)


@app.post("/api/deals")
async def create_deal(payload: DealIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    if not doc.get("owner_id"):
        doc["owner_id"] = user["id"]
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.deals.insert_one(doc)
    new = await db.deals.find_one({"_id": res.inserted_id})
    # Fire automations
    await fire_event(db, "deal_created", {
        "deal_id": str(res.inserted_id),
        "company_id": doc.get("company_id"),
        "contact_id": doc.get("primary_contact_id"),
        "owner_id": doc.get("owner_id"),
        "stage": doc.get("stage"),
        "value": doc.get("value"),
    })
    return _doc(new)


@app.get("/api/deals/{did}")
async def get_deal(did: str, user: dict = Depends(get_current_user)):
    doc = await db.deals.find_one({"_id": _oid(did)})
    if not doc:
        raise HTTPException(status_code=404, detail="Deal not found")
    return _doc(doc)


@app.patch("/api/deals/{did}")
async def update_deal(did: str, payload: DealUpdate, user: dict = Depends(get_current_user)):
    existing = await db.deals.find_one({"_id": _oid(did)})
    if not existing:
        raise HTTPException(status_code=404, detail="Deal not found")
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    # if stage changed to closed_won/lost, also flip status automatically
    if "stage" in update:
        new_stage = update["stage"]
        if new_stage == "closed_won":
            update.setdefault("status", "won")
            update.setdefault("probability", 100)
        elif new_stage == "closed_lost":
            update.setdefault("status", "lost")
            update.setdefault("probability", 0)
        elif existing.get("status") in ("won", "lost"):
            update.setdefault("status", "open")
    await db.deals.update_one({"_id": _oid(did)}, {"$set": update})
    updated = await db.deals.find_one({"_id": _oid(did)})
    # Fire automation if stage changed
    if "stage" in update and update["stage"] != existing.get("stage"):
        await fire_event(db, "deal_stage_changed", {
            "deal_id": did,
            "company_id": updated.get("company_id"),
            "contact_id": updated.get("primary_contact_id"),
            "owner_id": updated.get("owner_id"),
            "from_stage": existing.get("stage"),
            "to_stage": update["stage"],
            "value": updated.get("value"),
        })
    return _doc(updated)


@app.delete("/api/deals/{did}")
async def delete_deal(did: str, user: dict = Depends(get_current_user)):
    await db.deals.delete_one({"_id": _oid(did)})
    return {"ok": True}


@app.get("/api/deals/export/csv")
async def export_deals_csv(user: dict = Depends(get_current_user)):
    items = await db.deals.find({}).to_list(length=5000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["name", "value", "stage", "status", "priority", "probability", "expected_close_date", "company_id", "primary_contact_id", "owner_id"])
    for it in items:
        writer.writerow([
            it.get("name", ""),
            it.get("value", 0),
            it.get("stage", ""),
            it.get("status", ""),
            it.get("priority", ""),
            it.get("probability", 0),
            it.get("expected_close_date", ""),
            it.get("company_id", ""),
            it.get("primary_contact_id", ""),
            it.get("owner_id", ""),
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=deals.csv"},
    )


@app.post("/api/deals/import/csv")
async def import_deals_csv(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    content = (await file.read()).decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))
    imported = 0
    for row in reader:
        if not row.get("name"):
            continue
        try:
            value = float(row.get("value") or 0)
        except ValueError:
            value = 0
        try:
            probability = int(row.get("probability") or 50)
        except ValueError:
            probability = 50
        doc = {
            "name": row.get("name", "").strip(),
            "value": value,
            "stage": (row.get("stage") or "new_lead").strip(),
            "status": (row.get("status") or "open").strip(),
            "priority": (row.get("priority") or "medium").strip(),
            "probability": probability,
            "expected_close_date": (row.get("expected_close_date") or "").strip() or None,
            "company_id": (row.get("company_id") or "").strip() or None,
            "primary_contact_id": (row.get("primary_contact_id") or "").strip() or None,
            "owner_id": (row.get("owner_id") or "").strip() or user["id"],
            "pipeline_id": "default",
            "notes": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.deals.insert_one(doc)
        imported += 1
    return {"imported": imported}


# === PIPELINES ==============================================================
@app.get("/api/pipelines")
async def list_pipelines(user: dict = Depends(get_current_user)):
    return [DEFAULT_PIPELINE]


# === ACTIVITIES =============================================================
@app.get("/api/activities")
async def list_activities(
    type: Optional[str] = None,
    status: Optional[str] = None,
    deal_id: Optional[str] = None,
    contact_id: Optional[str] = None,
    company_id: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    query = {}
    if type:
        query["type"] = type
    if status:
        query["status"] = status
    if deal_id:
        query["deal_id"] = deal_id
    if contact_id:
        query["contact_id"] = contact_id
    if company_id:
        query["company_id"] = company_id
    items = await db.activities.find(query).sort("due_date", -1).to_list(length=2000)
    return _docs(items)


@app.post("/api/activities")
async def create_activity(payload: ActivityIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    if not doc.get("owner_id"):
        doc["owner_id"] = user["id"]
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.activities.insert_one(doc)
    return _doc(await db.activities.find_one({"_id": res.inserted_id}))


@app.get("/api/activities/{aid}")
async def get_activity(aid: str, user: dict = Depends(get_current_user)):
    doc = await db.activities.find_one({"_id": _oid(aid)})
    if not doc:
        raise HTTPException(status_code=404, detail="Activity not found")
    return _doc(doc)


@app.patch("/api/activities/{aid}")
async def update_activity(aid: str, payload: ActivityUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.activities.update_one({"_id": _oid(aid)}, {"$set": update})
    return _doc(await db.activities.find_one({"_id": _oid(aid)}))


@app.delete("/api/activities/{aid}")
async def delete_activity(aid: str, user: dict = Depends(get_current_user)):
    await db.activities.delete_one({"_id": _oid(aid)})
    return {"ok": True}


# === AUTOMATIONS ============================================================
@app.get("/api/automations")
async def list_automations(user: dict = Depends(get_current_user)):
    items = await db.automations.find({}).sort("created_at", -1).to_list(length=500)
    return _docs(items)


@app.post("/api/automations")
async def create_automation(payload: AutomationIn, user: dict = Depends(get_current_user)):
    doc = payload.model_dump()
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.automations.insert_one(doc)
    return _doc(await db.automations.find_one({"_id": res.inserted_id}))


@app.get("/api/automations/{aid}")
async def get_automation(aid: str, user: dict = Depends(get_current_user)):
    doc = await db.automations.find_one({"_id": _oid(aid)})
    if not doc:
        raise HTTPException(status_code=404, detail="Automation not found")
    return _doc(doc)


@app.patch("/api/automations/{aid}")
async def update_automation(aid: str, payload: AutomationUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.automations.update_one({"_id": _oid(aid)}, {"$set": update})
    return _doc(await db.automations.find_one({"_id": _oid(aid)}))


@app.delete("/api/automations/{aid}")
async def delete_automation(aid: str, user: dict = Depends(get_current_user)):
    await db.automations.delete_one({"_id": _oid(aid)})
    return {"ok": True}


@app.get("/api/automation-logs")
async def list_automation_logs(user: dict = Depends(get_current_user)):
    items = await db.automation_logs.find({}).sort("created_at", -1).limit(50).to_list(length=50)
    return _docs(items)


# === DASHBOARD ==============================================================
@app.get("/api/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    deals = await db.deals.find({}).to_list(length=5000)
    total_pipeline = sum(d.get("value", 0) for d in deals if d.get("status") == "open")
    open_count = sum(1 for d in deals if d.get("status") == "open")
    won = [d for d in deals if d.get("status") == "won"]
    lost = [d for d in deals if d.get("status") == "lost"]
    won_value = sum(d.get("value", 0) for d in won)
    win_rate = (len(won) / (len(won) + len(lost))) * 100 if (won or lost) else 0

    # By stage
    by_stage = {}
    for d in deals:
        s = d.get("stage", "unknown")
        by_stage.setdefault(s, {"count": 0, "value": 0.0})
        by_stage[s]["count"] += 1
        by_stage[s]["value"] += float(d.get("value", 0))

    # Revenue by month (last 6 months) — based on expected_close_date for won deals
    revenue_by_month = {}
    for d in won:
        ecd = d.get("expected_close_date") or d.get("created_at")
        if not ecd:
            continue
        try:
            dt = datetime.fromisoformat(str(ecd).replace("Z", "+00:00"))
        except Exception:
            continue
        key = dt.strftime("%Y-%m")
        revenue_by_month[key] = revenue_by_month.get(key, 0) + float(d.get("value", 0))

    # Activities upcoming
    upcoming_count = await db.activities.count_documents({"status": "pending"})
    overdue_count = 0
    now_iso = datetime.now(timezone.utc).isoformat()
    overdue_count = await db.activities.count_documents({"status": "pending", "due_date": {"$lt": now_iso}})

    return {
        "total_pipeline_value": total_pipeline,
        "open_deals": open_count,
        "won_value": won_value,
        "won_count": len(won),
        "lost_count": len(lost),
        "win_rate": round(win_rate, 1),
        "by_stage": by_stage,
        "revenue_by_month": revenue_by_month,
        "upcoming_activities": upcoming_count,
        "overdue_activities": overdue_count,
        "total_companies": await db.companies.count_documents({}),
        "total_contacts": await db.contacts.count_documents({}),
    }


@app.get("/api/health")
async def health():
    return {"status": "ok"}
