# FlowCRM

FlowCRM is a modern, minimal SaaS CRM tool inspired by leading productivity platforms like monday.com. It is designed to help teams track companies, contacts, and deals with intuitive drag-and-drop pipelines and automated workflows. 

## Features
- **Dashboard:** At-a-glance KPIs, pipeline value, win rate, and visual charts (funnel, revenue trends).
- **Deals & Pipelines:** Manage sales pipelines with a drag-and-drop Kanban board or a detailed list view.
- **Companies & Contacts:** Track all your accounts and contacts with filtering, CSV imports, and detail drawers.
- **Activities:** Log calls, meetings, and tasks directly linked to deals or contacts.
- **Automations:** A visual "when-then" engine to trigger tasks automatically (e.g., when a deal stage changes to "closed won").
- **Authentication:** Custom JWT-based authentication.

## Tech Stack
- **Frontend:** React 18, Tailwind CSS, Recharts, dnd-kit for drag-and-drop, Lucide React.
- **Backend:** Python, FastAPI, Motor (async MongoDB).
- **Database:** MongoDB.

## Demo Credentials
If you are exploring a deployed version of this app with seeded data, you can use the following dummy accounts to log in:

**Admin Account:**
- **Email:** `admin@flowcrm.io`
- **Password:** `Admin@1234`

**Team Member Accounts (Password: `Demo@1234` for all):**
- `sarah.kim@flowcrm.io`
- `marcus.lee@flowcrm.io`
- `elena.rossi@flowcrm.io`
- `david.patel@flowcrm.io`

## Local Setup

### 1. Prerequisites
- [Node.js](https://nodejs.org/)
- [Python 3.9+](https://www.python.org/)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas cluster)

### 2. Backend Configuration
Navigate to the `backend` folder and set up a virtual environment:

```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Mac/Linux
source venv/bin/activate
```

Install the dependencies:
```bash
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory based on your MongoDB cluster:
```env
MONGO_URL="mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority"
DB_NAME="crm_db"
JWT_SECRET="your_secret_key"
```

Start the backend server:
```bash
uvicorn server:app --reload
```

### 3. Frontend Configuration
Open a new terminal and navigate to the `frontend` folder.

Create a `.env` file in the `frontend` directory:
```env
REACT_APP_BACKEND_URL=http://localhost:8000
```

Install packages and run the React app:
```bash
cd frontend
npm install
npm start
```
The app will be available at [http://localhost:3000](http://localhost:3000).
