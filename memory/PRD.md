# FlowCRM — Product Requirements & Progress

## Original problem statement
Build a CRM tool similar to monday.com, using the attached screenshots only as design inspiration (don't copy the branding). It should include companies (accounts), contacts, deals, sales pipelines with drag-and-drop stages, activity tracking (calls, meetings, tasks), and a basic dashboard showing revenue and deal progress. Users should be able to filter, customize columns, and view deals in both list and kanban layouts. Include simple automation rules (like when-then automation), such as creating a follow-up task when a deal moves to "closed won".

## User decisions (gathered at kick-off, 2026-05-23)
- **Auth**: JWT-based custom auth (email + password)
- **Seed data**: Yes — pre-populate with realistic demo accounts, contacts, deals
- **Automation scope**: All triggers (`deal_stage_changed`, `deal_created`, `contact_added_to_company`) + custom rule builder UI
- **Aesthetic**: Modern minimal SaaS — clean, lots of whitespace, restrained color, Manrope + IBM Plex Sans
- **Extras**: CSV import/export for contacts & deals

## Architecture
- **Backend**: FastAPI + Motor (MongoDB async). Files: `server.py`, `auth.py`, `automations.py`, `models.py`, `seed.py`
- **Frontend**: React 18 (CRA), Tailwind CSS, Recharts, @dnd-kit, sonner, lucide-react, papaparse-ready
- **DB**: MongoDB (`crm_db` database)
- **Routing**: `/` (landing), `/login`, `/register`, `/app/*` (protected)
- **Auth**: bcrypt password hash, JWT access (12h) + refresh (7d) — set as httpOnly cookies AND returned as `access_token` in body (frontend stores in localStorage and sends via `Authorization: Bearer` as a fallback)

## What's been implemented (2026-05-23 — MVP)
- ✅ Marketing landing page (hero, features grid, workflow showcase, stat band, footer CTA)
- ✅ JWT auth — register, login, /me, /logout, /refresh; idempotent admin seed
- ✅ Authenticated app shell (left sidebar nav + top bar with global search, notifications, user menu)
- ✅ **Dashboard**: 4 KPI cards (pipeline, won, open, win rate), bar chart by stage, line chart revenue trend, funnel visualization, upcoming activities, footer stats
- ✅ **Companies**: list with search + status + industry filters + column toggle + detail drawer (with linked contacts/deals) + create + delete
- ✅ **Contacts**: list with filters + column toggle + detail drawer + create + delete + CSV import + CSV export
- ✅ **Deals**: List view (with editable inline stage cell, full filter bar: search/stage/priority/owner/min-max value/columns) AND Kanban view with drag-and-drop across all 6 stages (uses @dnd-kit); detail drawer with activity timeline + stage changer; create + delete + CSV import/export
- ✅ **Activities**: 4 tabs (All/Calls/Meetings/Tasks) + status filter + status-toggle checkbox + create with deal/contact link + delete
- ✅ **Automations**: Visual when-then rule builder (trigger picker + target stage + action + due offset days), list of rules (active/paused toggle, edit, delete), recent-runs log panel
- ✅ **Settings**: profile, workspace, team demo users
- ✅ **Automation engine**: Fires on `deal_stage_changed`, `deal_created`, `contact_added_to_company`; creates linked task/call/meeting activities with configurable due offset; persists runs to `automation_logs`
- ✅ **Seeded demo data**: 16 companies, 48 contacts, 40 deals across all 6 stages, 70 activities, 4 automations, 4 team members
- ✅ **Tested**: 23/23 backend tests pass + all frontend smoke flows pass (testing agent iteration 1)

## Test credentials
See `/app/memory/test_credentials.md`.
- Admin: `admin@flowcrm.io` / `Admin@1234`
- Team: `sarah.kim@flowcrm.io`, `marcus.lee@flowcrm.io`, `elena.rossi@flowcrm.io`, `david.patel@flowcrm.io` / `Demo@1234`

## Backlog (P1)
- Multi-pipeline support (currently single default pipeline)
- Drag to reorder stages / custom stages per pipeline
- Bulk actions on deals/contacts (multi-select)
- Saved views / per-user view preferences
- Activity calendar view
- Notification center wired up to real events
- @-mentions and comments on deals
- Granular RBAC (read-only viewer role)

## Backlog (P2)
- Email integration (SendGrid / Gmail / Outlook)
- AI deal insights & next-best-action (Emergent LLM)
- Inbox / shared sales inbox
- Public sharable pipeline links
- Advanced reporting & exports (PDF/Excel)
- Webhooks for automations (call external URL action)

## Next tasks
- Wait for user feedback on MVP and iterate based on priorities
