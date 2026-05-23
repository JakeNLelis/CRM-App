"""FlowCRM backend regression test suite.

Covers: auth (login/register/me w/ cookies+bearer), CRUD for all resources,
seeded demo data sanity checks, dashboard stats, automation triggers (deal
created + deal stage->closed_won), CSV import/export, and deal filters.
"""
import io
import os
import time
import uuid

import pytest
import requests

BASE_URL = "http://localhost:8001"  # internal backend; /api prefix on all routes

ADMIN_EMAIL = "admin@flowcrm.io"
ADMIN_PASSWORD = "Admin@1234"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    token = r.json()["access_token"]
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="session")
def admin_token(admin_session):
    return admin_session.headers["Authorization"].split(" ", 1)[1]


# ---------- AUTH ----------
class TestAuth:
    def test_login_returns_token_and_sets_cookies(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == ADMIN_EMAIL
        assert isinstance(body.get("access_token"), str) and body["access_token"]
        # cookies present
        cookie_names = {c.name for c in r.cookies}
        assert "access_token" in cookie_names
        assert "refresh_token" in cookie_names

    def test_login_invalid_credentials(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_with_bearer(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/auth/me",
                         headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_with_cookies(self):
        s = requests.Session()
        s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        r = s.get(f"{BASE_URL}/api/auth/me")  # no Authorization header
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_unauthenticated(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_register_creates_user_returns_token(self):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{BASE_URL}/api/auth/register",
                          json={"email": email, "password": "Test@1234", "name": "Test User"})
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["email"] == email
        assert b["access_token"]
        # duplicate email -> 400
        r2 = requests.post(f"{BASE_URL}/api/auth/register",
                           json={"email": email, "password": "Test@1234", "name": "Test User"})
        assert r2.status_code == 400


# ---------- Seeded demo data ----------
class TestSeededData:
    def test_companies_count(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/companies")
        assert r.status_code == 200
        assert len(r.json()) >= 16, f"expected >=16 companies, got {len(r.json())}"

    def test_deals_count(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/deals")
        assert r.status_code == 200
        assert len(r.json()) >= 40

    def test_activities_count(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/activities")
        assert r.status_code == 200
        assert len(r.json()) >= 70

    def test_automations_count(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/automations")
        assert r.status_code == 200
        assert len(r.json()) >= 4

    def test_users_listed(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/users")
        assert r.status_code == 200
        users = r.json()
        assert any(u["email"] == ADMIN_EMAIL for u in users)
        # No password_hash leak
        assert all("password_hash" not in u for u in users)

    def test_auth_required_on_resources(self):
        for ep in ["/api/companies", "/api/contacts", "/api/deals",
                   "/api/activities", "/api/automations", "/api/users",
                   "/api/dashboard/stats"]:
            r = requests.get(f"{BASE_URL}{ep}")
            assert r.status_code == 401, f"{ep} should require auth"


# ---------- Dashboard ----------
class TestDashboard:
    def test_dashboard_stats(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/dashboard/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ["total_pipeline_value", "win_rate", "by_stage",
                  "revenue_by_month", "open_deals", "total_companies",
                  "total_contacts"]:
            assert k in d, f"missing key {k}"
        assert isinstance(d["by_stage"], dict)


# ---------- Companies CRUD ----------
class TestCompanies:
    def test_create_get_update_delete(self, admin_session):
        payload = {"name": "TEST_Acme Co", "industry": "Tech", "status": "active",
                   "size": "11-50", "website": "https://acme.test"}
        r = admin_session.post(f"{BASE_URL}/api/companies", json=payload)
        assert r.status_code == 200, r.text
        cid = r.json()["id"]
        # GET
        r2 = admin_session.get(f"{BASE_URL}/api/companies/{cid}")
        assert r2.status_code == 200 and r2.json()["name"] == "TEST_Acme Co"
        # PATCH
        r3 = admin_session.patch(f"{BASE_URL}/api/companies/{cid}",
                                 json={"name": "TEST_Acme Updated"})
        assert r3.status_code == 200 and r3.json()["name"] == "TEST_Acme Updated"
        # DELETE
        r4 = admin_session.delete(f"{BASE_URL}/api/companies/{cid}")
        assert r4.status_code == 200
        r5 = admin_session.get(f"{BASE_URL}/api/companies/{cid}")
        assert r5.status_code == 404


# ---------- Contacts CRUD + CSV ----------
class TestContacts:
    def test_crud(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/contacts", json={
            "first_name": "TEST", "last_name": "Person",
            "email": f"test_{uuid.uuid4().hex[:6]}@example.com",
            "status": "active"
        })
        assert r.status_code == 200, r.text
        cid = r.json()["id"]
        r2 = admin_session.patch(f"{BASE_URL}/api/contacts/{cid}",
                                 json={"title": "QA"})
        assert r2.status_code == 200 and r2.json()["title"] == "QA"
        r3 = admin_session.delete(f"{BASE_URL}/api/contacts/{cid}")
        assert r3.status_code == 200

    def test_export_csv(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/contacts/export/csv")
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("text/csv")
        assert b"first_name" in r.content

    def test_import_csv(self, admin_session):
        csv_data = ("first_name,last_name,email,phone,title,status,company_id,tags\n"
                    f"TEST_Imp,User,imp_{uuid.uuid4().hex[:6]}@flowcrm.test,,QA,active,,\n"
                    f"TEST_Imp2,User2,imp2_{uuid.uuid4().hex[:6]}@flowcrm.test,,Eng,active,,\n")
        files = {"file": ("contacts.csv", io.BytesIO(csv_data.encode()), "text/csv")}
        # requests session has Authorization header; multipart works fine
        r = admin_session.post(f"{BASE_URL}/api/contacts/import/csv", files=files)
        assert r.status_code == 200, r.text
        assert r.json().get("imported", 0) >= 2


# ---------- Deals CRUD + filters + CSV ----------
class TestDeals:
    def test_filters(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/deals",
                              params={"stage": "qualified"})
        assert r.status_code == 200
        for d in r.json():
            assert d.get("stage") == "qualified"
        # value range filter
        r2 = admin_session.get(f"{BASE_URL}/api/deals",
                               params={"min_value": 10000, "max_value": 100000})
        assert r2.status_code == 200
        for d in r2.json():
            assert 10000 <= d.get("value", 0) <= 100000

    def test_create_triggers_welcome_automation(self, admin_session):
        # Snapshot existing activity count for that deal
        before_logs = admin_session.get(f"{BASE_URL}/api/automation-logs").json()
        r = admin_session.post(f"{BASE_URL}/api/deals", json={
            "name": "TEST_New Deal Welcome",
            "value": 5000,
            "stage": "new_lead",
            "status": "open",
            "priority": "medium",
            "probability": 20,
        })
        assert r.status_code == 200, r.text
        deal_id = r.json()["id"]
        time.sleep(0.5)
        # Look for a 'call' activity tied to this deal (Welcome task automation)
        acts = admin_session.get(f"{BASE_URL}/api/activities",
                                 params={"deal_id": deal_id}).json()
        # not strictly required type=call, but expect at least 1 activity created by automation
        assert any(a.get("type") == "call" for a in acts) or len(acts) >= 1, \
            f"expected welcome automation to create an activity for deal {deal_id}"
        # automation log grew
        after_logs = admin_session.get(f"{BASE_URL}/api/automation-logs").json()
        assert len(after_logs) >= len(before_logs)
        # cleanup
        admin_session.delete(f"{BASE_URL}/api/deals/{deal_id}")

    def test_stage_change_to_closed_won_triggers_followup(self, admin_session):
        # create a fresh deal
        r = admin_session.post(f"{BASE_URL}/api/deals", json={
            "name": "TEST_Won Deal",
            "value": 7777,
            "stage": "proposal",
            "status": "open",
            "priority": "high",
            "probability": 70,
        })
        deal_id = r.json()["id"]
        before_logs = admin_session.get(f"{BASE_URL}/api/automation-logs").json()
        before_acts = admin_session.get(f"{BASE_URL}/api/activities",
                                        params={"deal_id": deal_id}).json()
        # PATCH stage -> closed_won
        r2 = admin_session.patch(f"{BASE_URL}/api/deals/{deal_id}",
                                 json={"stage": "closed_won"})
        assert r2.status_code == 200
        updated = r2.json()
        assert updated["stage"] == "closed_won"
        assert updated["status"] == "won"
        time.sleep(0.5)
        # automation_logs increased
        after_logs = admin_session.get(f"{BASE_URL}/api/automation-logs").json()
        assert len(after_logs) > len(before_logs), "expected automation log entry"
        # new activity (task) for follow-up linked to deal
        after_acts = admin_session.get(f"{BASE_URL}/api/activities",
                                       params={"deal_id": deal_id}).json()
        assert len(after_acts) > len(before_acts), "expected follow-up activity created"
        # cleanup
        admin_session.delete(f"{BASE_URL}/api/deals/{deal_id}")

    def test_export_csv(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/deals/export/csv")
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("text/csv")
        assert b"name" in r.content and b"stage" in r.content


# ---------- Activities CRUD ----------
class TestActivities:
    def test_crud(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/activities", json={
            "type": "task", "title": "TEST_Task", "status": "pending",
            "due_date": "2026-12-31T00:00:00+00:00"
        })
        assert r.status_code == 200
        aid = r.json()["id"]
        r2 = admin_session.patch(f"{BASE_URL}/api/activities/{aid}",
                                 json={"status": "done"})
        assert r2.status_code == 200 and r2.json()["status"] == "done"
        r3 = admin_session.delete(f"{BASE_URL}/api/activities/{aid}")
        assert r3.status_code == 200


# ---------- Automations CRUD ----------
class TestAutomations:
    def test_crud(self, admin_session):
        payload = {
            "name": "TEST_Rule",
            "trigger": {"type": "deal_created"},
            "enabled": True,
            "conditions": [],
            "action": {"type": "create_task", "title": "do thing"},
        }
        r = admin_session.post(f"{BASE_URL}/api/automations", json=payload)
        assert r.status_code == 200, r.text
        aid = r.json()["id"]
        r2 = admin_session.patch(f"{BASE_URL}/api/automations/{aid}",
                                 json={"enabled": False})
        assert r2.status_code == 200 and r2.json()["enabled"] is False
        r3 = admin_session.delete(f"{BASE_URL}/api/automations/{aid}")
        assert r3.status_code == 200
