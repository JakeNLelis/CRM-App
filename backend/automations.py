"""Automation rule engine. Triggers fire on backend events:
- deal_stage_changed (with target stage match)
- deal_created
- contact_added_to_company

Actions:
- create_task / create_call / create_meeting
"""
from datetime import datetime, timezone, timedelta
from typing import Optional


def _due_iso(days_offset: int) -> str:
    d = datetime.now(timezone.utc) + timedelta(days=int(days_offset or 0))
    return d.isoformat()


async def _run_action(db, rule: dict, ctx: dict):
    action = rule.get("action") or {}
    a_type = action.get("type")
    activity_type_map = {
        "create_task": "task",
        "create_call": "call",
        "create_meeting": "meeting",
    }
    if a_type in activity_type_map:
        activity = {
            "type": activity_type_map[a_type],
            "title": action.get("title") or f"Auto: {rule.get('name', 'rule')}",
            "description": action.get("description") or f"Created by automation '{rule.get('name')}'",
            "status": "pending",
            "due_date": _due_iso(action.get("due_offset_days", 3)),
            "deal_id": ctx.get("deal_id"),
            "contact_id": ctx.get("contact_id"),
            "company_id": ctx.get("company_id"),
            "owner_id": ctx.get("owner_id"),
            "automation_id": str(rule.get("_id")),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        result = await db.activities.insert_one(activity)
        # log execution
        await db.automation_logs.insert_one({
            "automation_id": str(rule["_id"]),
            "name": rule.get("name"),
            "trigger_event": ctx.get("event"),
            "action_taken": f"Created {activity['type']}: {activity['title']}",
            "context": {k: v for k, v in ctx.items() if k != "event"},
            "created_activity_id": str(result.inserted_id),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })


def _conditions_match(conditions: list, ctx: dict) -> bool:
    if not conditions:
        return True
    for cond in conditions:
        field = cond.get("field")
        op = cond.get("op", "eq")
        val = cond.get("value")
        actual = ctx.get(field)
        if op == "eq" and actual != val:
            return False
        if op == "neq" and actual == val:
            return False
        if op == "gt":
            try:
                if not (float(actual) > float(val)):
                    return False
            except Exception:
                return False
        if op == "lt":
            try:
                if not (float(actual) < float(val)):
                    return False
            except Exception:
                return False
    return True


async def fire_event(db, event: str, ctx: dict):
    """Run all enabled rules whose trigger matches the event + context."""
    rules = await db.automations.find({"enabled": True}).to_list(length=500)
    for rule in rules:
        trigger = rule.get("trigger") or {}
        if trigger.get("type") != event:
            continue
        # event-specific match
        if event == "deal_stage_changed":
            target = trigger.get("to_stage")
            if target and ctx.get("to_stage") != target:
                continue
        if not _conditions_match(rule.get("conditions") or [], ctx):
            continue
        ctx_with_event = {**ctx, "event": event}
        await _run_action(db, rule, ctx_with_event)
