# FlowCRM Auth Testing Playbook

## Step 1: MongoDB Verification
```
mongosh
use crm_db
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {password_hash: 1})
```
Verify: bcrypt hash starts with `$2b$`, index exists on `users.email` (unique).

## Step 2: API Smoke Test
```
# Login (cookie-based)
curl -c /tmp/cookies.txt -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@flowcrm.io","password":"Admin@1234"}'

# Use cookies for /me
curl -b /tmp/cookies.txt http://localhost:8001/api/auth/me
```

Expected:
- `/login` returns `200` with user JSON and sets `access_token` + `refresh_token` cookies.
- `/me` returns the same user using those cookies.
- Invalid creds → `401`.

## Step 3: Core CRM CRUD smoke
With cookies in `/tmp/cookies.txt`:
```
curl -b /tmp/cookies.txt http://localhost:8001/api/companies     # ≥ 16
curl -b /tmp/cookies.txt http://localhost:8001/api/contacts      # ≥ 48
curl -b /tmp/cookies.txt http://localhost:8001/api/deals         # ≥ 40
curl -b /tmp/cookies.txt http://localhost:8001/api/activities    # ≥ 70
curl -b /tmp/cookies.txt http://localhost:8001/api/automations   # ≥ 4
curl -b /tmp/cookies.txt http://localhost:8001/api/dashboard/stats
```

## Step 4: Automation E2E
1. List deals, pick one that is NOT `closed_won`.
2. PATCH `/api/deals/{id}` body `{"stage":"closed_won"}`.
3. GET `/api/activities` — there should be a new pending task titled `Send thank-you & onboarding plan` linked to that deal.
4. GET `/api/automation-logs` — a new entry should appear.

## Step 5: CSV import/export
- `GET /api/contacts/export/csv` → 200, content-type `text/csv`, non-empty body.
- `POST /api/contacts/import/csv` with a file upload (FormData `file=...`) returns `{ imported: N }`.
- Same for `/api/deals/export/csv` and `/api/deals/import/csv`.
