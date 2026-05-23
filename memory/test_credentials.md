# FlowCRM — Test Credentials

## Admin (recommended for testing)
- **Email**: `admin@flowcrm.io`
- **Password**: `Admin@1234`
- **Role**: `admin`

## Demo team users (also valid logins)
All share the same demo password.
- **Email**: `sarah.kim@flowcrm.io` | Name: Sarah Kim
- **Email**: `marcus.lee@flowcrm.io` | Name: Marcus Lee
- **Email**: `elena.rossi@flowcrm.io` | Name: Elena Rossi
- **Email**: `david.patel@flowcrm.io` | Name: David Patel
- **Password (all)**: `Demo@1234`

## Auth endpoint paths
- `POST /api/auth/register` — body: `{ email, password, name }`
- `POST /api/auth/login` — body: `{ email, password }` — sets `access_token` + `refresh_token` cookies AND returns `access_token` in body for `Authorization: Bearer` use
- `POST /api/auth/logout` — auth required
- `GET  /api/auth/me` — auth required
- `POST /api/auth/refresh` — uses `refresh_token` cookie

## Notes for testers
- Auth uses both httpOnly cookies (preferred) and `Authorization: Bearer <token>` (fallback). Either works; use cookies via `withCredentials: true` / `credentials: "include"`.
- Demo data is auto-seeded on first backend start (companies, contacts, deals across all stages, activities, automations).
- The frontend pre-fills the admin credentials on the login screen for convenience.
