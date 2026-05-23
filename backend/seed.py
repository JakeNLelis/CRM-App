"""Seed rich demo data: users, companies, contacts, deals, activities, automations."""
import random
from datetime import datetime, timezone, timedelta
from bson import ObjectId

from auth import hash_password


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _iso_offset(days: int) -> str:
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


async def seed_all(db):
    """Idempotently seed all demo data. Skips if already seeded."""
    existing_companies = await db.companies.count_documents({})
    if existing_companies > 0:
        return  # already seeded

    # --- Users (sales team)
    team = [
        {"email": "sarah.kim@flowcrm.io", "name": "Sarah Kim", "role": "user", "avatar_color": "#0ea5e9"},
        {"email": "marcus.lee@flowcrm.io", "name": "Marcus Lee", "role": "user", "avatar_color": "#f59e0b"},
        {"email": "elena.rossi@flowcrm.io", "name": "Elena Rossi", "role": "user", "avatar_color": "#10b981"},
        {"email": "david.patel@flowcrm.io", "name": "David Patel", "role": "user", "avatar_color": "#8b5cf6"},
    ]
    user_ids = []
    for u in team:
        existing = await db.users.find_one({"email": u["email"]})
        if existing:
            user_ids.append(str(existing["_id"]))
            continue
        doc = {
            **u,
            "password_hash": hash_password("Demo@1234"),
            "created_at": datetime.now(timezone.utc),
        }
        res = await db.users.insert_one(doc)
        user_ids.append(str(res.inserted_id))

    industries = ["SaaS", "Fintech", "Healthcare", "E-commerce", "Logistics", "Manufacturing", "Media", "EdTech"]
    locations = ["San Francisco, CA", "New York, NY", "Austin, TX", "London, UK", "Berlin, DE", "Singapore", "Toronto, CA", "Sydney, AU"]
    company_names = [
        "Northwind Labs", "Pinecone Analytics", "Arcadia Robotics", "Mosaic Health",
        "Vertex Logistics", "Cobalt Studios", "Helix Biotech", "Lumen Ventures",
        "Atlas Manufacturing", "Quanta Fintech", "Sable Media", "Forge EdTech",
        "Stratos Cloud", "Halcyon Retail", "Indigo Mobility", "Kestrel Security",
    ]

    company_ids = []
    for i, name in enumerate(company_names):
        doc = {
            "name": name,
            "industry": random.choice(industries),
            "website": f"https://{name.lower().replace(' ', '')}.com",
            "employees": random.choice([12, 45, 120, 320, 780, 1800, 5400]),
            "location": random.choice(locations),
            "status": random.choice(["active", "active", "active", "prospect", "prospect", "churned"]),
            "annual_revenue": round(random.uniform(0.5, 50.0), 2) * 1_000_000,
            "notes": f"Strategic {random.choice(industries)} account. Last review on {_iso_offset(-random.randint(5, 60))[:10]}.",
            "owner_id": random.choice(user_ids),
            "created_at": _iso_offset(-random.randint(30, 400)),
        }
        res = await db.companies.insert_one(doc)
        company_ids.append((str(res.inserted_id), name))

    # --- Contacts
    first_names = ["Olivia", "Liam", "Emma", "Noah", "Ava", "Ethan", "Sophia", "Mason", "Isabella", "Logan",
                   "Mia", "Lucas", "Charlotte", "Aiden", "Amelia", "Jackson", "Harper", "Sebastian", "Evelyn", "Henry"]
    last_names = ["Anderson", "Brooks", "Carter", "Davis", "Edwards", "Foster", "Garcia", "Hughes", "Ingram", "Jones",
                  "Kennedy", "Lopez", "Mitchell", "Nguyen", "Owens", "Patel", "Quinn", "Reyes", "Singh", "Thompson"]
    titles = ["VP of Sales", "Head of Product", "CTO", "CEO", "Marketing Director", "Procurement Lead",
              "Operations Manager", "Finance Director", "Sales Manager", "Customer Success Lead"]

    contact_ids = []
    for i in range(48):
        fn = random.choice(first_names)
        ln = random.choice(last_names)
        c_id, c_name = random.choice(company_ids)
        doc = {
            "first_name": fn,
            "last_name": ln,
            "email": f"{fn.lower()}.{ln.lower()}@{c_name.lower().replace(' ', '')}.com",
            "phone": f"+1 415-{random.randint(200,899)}-{random.randint(1000,9999)}",
            "title": random.choice(titles),
            "company_id": c_id,
            "owner_id": random.choice(user_ids),
            "status": random.choice(["active", "active", "active", "lead", "inactive"]),
            "tags": random.sample(["VIP", "Newsletter", "Webinar", "Decision Maker", "Champion", "Cold"], k=random.randint(0, 2)),
            "notes": "",
            "created_at": _iso_offset(-random.randint(5, 300)),
        }
        res = await db.contacts.insert_one(doc)
        contact_ids.append((str(res.inserted_id), c_id, doc["owner_id"]))

    # --- Deals (across all stages)
    stages = ["new_lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]
    stage_weights = [6, 5, 4, 3, 4, 2]  # roughly realistic funnel
    deal_titles = [
        "Annual Enterprise License", "Onboarding Services Package", "Premium Support Renewal",
        "Q1 Expansion - 50 Seats", "Pilot Program", "Multi-year Contract", "API Tier Upgrade",
        "Custom Integration Build", "Training & Certification Bundle", "Strategic Partnership",
    ]

    deal_ids = []
    n_deals = 40
    for i in range(n_deals):
        company_id, company_name = random.choice(company_ids)
        # find any contact for this company
        company_contacts = [cid for (cid, comp, own) in contact_ids if comp == company_id]
        primary_contact = random.choice(company_contacts) if company_contacts else None
        stage = random.choices(stages, weights=stage_weights)[0]
        status = "open"
        if stage == "closed_won":
            status = "won"
        elif stage == "closed_lost":
            status = "lost"
        # value
        value = round(random.uniform(2.5, 220.0), 1) * 1000
        # closed deals have close date in past; open in future
        if status == "open":
            close_offset = random.randint(3, 75)
        else:
            close_offset = -random.randint(1, 60)
        doc = {
            "name": f"{company_name} – {random.choice(deal_titles)}",
            "value": float(value),
            "stage": stage,
            "pipeline_id": "default",
            "company_id": company_id,
            "primary_contact_id": primary_contact,
            "owner_id": random.choice(user_ids),
            "priority": random.choice(["low", "medium", "medium", "high"]),
            "probability": {"new_lead": 10, "qualified": 30, "proposal": 55, "negotiation": 75, "closed_won": 100, "closed_lost": 0}[stage],
            "expected_close_date": _iso_offset(close_offset),
            "status": status,
            "notes": "",
            "created_at": _iso_offset(-random.randint(2, 180)),
        }
        res = await db.deals.insert_one(doc)
        deal_ids.append((str(res.inserted_id), doc["owner_id"], company_id, primary_contact))

    # --- Activities
    activity_types = ["call", "meeting", "task"]
    activity_titles = {
        "call": ["Discovery call", "Follow-up call", "Pricing discussion", "Renewal check-in"],
        "meeting": ["Demo with stakeholders", "Quarterly review", "Onboarding kick-off", "Contract walkthrough"],
        "task": ["Send proposal", "Prepare contract", "Forward case study", "Update CRM notes", "Schedule onboarding"],
    }
    for i in range(70):
        atype = random.choice(activity_types)
        deal_id, owner_id, company_id, contact_id = random.choice(deal_ids)
        # past or future
        offset = random.randint(-20, 14)
        status = "done" if offset < 0 else random.choice(["pending", "pending", "done"])
        doc = {
            "type": atype,
            "title": random.choice(activity_titles[atype]),
            "description": "",
            "status": status,
            "due_date": _iso_offset(offset),
            "deal_id": deal_id,
            "contact_id": contact_id,
            "company_id": company_id,
            "owner_id": owner_id,
            "created_at": _iso_offset(-random.randint(0, 30)),
        }
        await db.activities.insert_one(doc)

    # --- Automations
    automations = [
        {
            "name": "Follow-up after Closed Won",
            "enabled": True,
            "trigger": {"type": "deal_stage_changed", "to_stage": "closed_won"},
            "conditions": [],
            "action": {"type": "create_task", "title": "Send thank-you & onboarding plan", "due_offset_days": 1},
            "created_at": _iso_now(),
        },
        {
            "name": "Welcome task on new deal",
            "enabled": True,
            "trigger": {"type": "deal_created"},
            "conditions": [],
            "action": {"type": "create_call", "title": "Intro discovery call", "due_offset_days": 2},
            "created_at": _iso_now(),
        },
        {
            "name": "Intro meeting when contact joins company",
            "enabled": False,
            "trigger": {"type": "contact_added_to_company"},
            "conditions": [],
            "action": {"type": "create_meeting", "title": "Introduction with new contact", "due_offset_days": 5},
            "created_at": _iso_now(),
        },
        {
            "name": "Lost-deal post-mortem task",
            "enabled": True,
            "trigger": {"type": "deal_stage_changed", "to_stage": "closed_lost"},
            "conditions": [],
            "action": {"type": "create_task", "title": "Schedule lost-deal post-mortem", "due_offset_days": 3},
            "created_at": _iso_now(),
        },
    ]
    for a in automations:
        await db.automations.insert_one(a)
