# HopeMind

HopeMind is a postpartum wellness platform that brings maternal mental-health screening, daily mood tracking, supportive conversation, and care-team coordination into one private workspace.

> **Important:** HopeMind is an educational and research-oriented project. It is not a medical device, diagnosis, emergency service, or replacement for a licensed clinician. If someone is in immediate danger, contact local emergency services.

## Highlights

- Responsive React and TypeScript frontend with role-based routing.
- Mother workspace with:
  - EPDS-style ten-question screening flow.
  - Assessment history and mood trends.
  - Daily mood, sleep, energy, tags, and journal check-ins.
  - HopeBot conversation UI with visible user and assistant messages.
  - Privacy settings and emergency support links.
- Doctor and administrator workspaces with platform metrics, patient views, and audit information.
- Flask REST API with JWT authentication, SQLite by default, PostgreSQL-compatible configuration, and CORS support.
- Optional machine-learning risk estimate with an explicit research disclaimer.
- Automated backend API tests.
- Indigo and coral visual theme with accessible focus states and responsive layouts.

## Repository layout

```text
hopemind/
├── backend/
│   ├── app/
│   │   ├── models/       SQLAlchemy models
│   │   ├── routes/       Flask API blueprints
│   │   ├── security/     RBAC and safety filtering
│   │   └── services/     EPDS, chat, NLP, ML, and audit services
│   ├── tests/            Backend API tests
│   ├── config.py         Environment-driven configuration
│   ├── run.py            Development server entry point
│   └── seed.py           Demo database seeder
├── frontend/
│   ├── src/components/   Auth, mother, staff, and shared UI
│   ├── src/context/      Authentication state
│   ├── src/services/     Typed API clients
│   └── src/types/        Shared frontend types
├── ml/                   Optional model artifacts and related files
└── README.md
```

## Requirements

- Python 3.10 or newer
- Node.js 20 or newer
- npm

## Quick start

### 1. Clone and configure

```powershell
git clone https://github.com/aksHayk2255/Hopemind.git
cd Hopemind
```

Copy the backend environment template and replace the development secrets before using the app outside a local demo:

```powershell
Copy-Item backend\.env.example backend\.env
```

### 2. Start the backend

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt

python backend\seed.py
python backend\run.py
```

The API runs at `http://127.0.0.1:5000`. Verify it with:

```powershell
curl http://127.0.0.1:5000/api/health
```

### 3. Start the frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

The Vite development server proxies `/api` requests to the backend at port `5000`. Start the backend before testing login, screening, mood, or chat features.

## Demo accounts

The seeded database contains these local demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Mother | `priya@example.com` | `Password123!` |
| Mother | `ananya@example.com` | `Password123!` |
| Doctor | `doctor.sharma@example.com` | `Password123!` |
| Admin | `admin@hopemind.org` | `AdminPass123!` |

These credentials are for local development only. Never use them in a deployed environment.

## Frontend routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Product landing page |
| `/login` | Public | Sign in |
| `/register` | Public | Create a mother account |
| `/mother` | Mother | Dashboard |
| `/mother/assessment` | Mother | EPDS screening |
| `/mother/history` | Mother | Assessment history |
| `/mother/mood` | Mother | Daily mood check-in |
| `/mother/trends` | Mother | Mood trends |
| `/mother/chat` | Mother | HopeBot chat |
| `/mother/settings` | Mother | Privacy settings |
| `/doctor` | Doctor | Clinical workspace |
| `/admin` | Admin | Administration workspace |

## API overview

The API is mounted under `/api`:

- `/api/auth` - registration, login, and password actions
- `/api/assessment` - screening questions, submissions, and history
- `/api/mood` - mood entries and summaries
- `/api/chat` - conversations and messages
- `/api/doctor` - doctor dashboard and patient data
- `/api/admin` - administration and audit data
- `/api/ml` - research risk-estimate endpoint
- `/api/user` - profile and privacy settings
- `/api/notifications` - user notifications
- `/api/health` - service health check

Protected requests use a JWT bearer token. The frontend API client adds the token automatically after login.

## Testing and validation

Backend tests:

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests\test_api.py -q
```

Frontend type-check and production build:

```powershell
cd frontend
npm run build
```

Frontend lint:

```powershell
npm run lint
```

The lint command may report warnings from dependency or generated files in some local installations. The build command is the release gate and must pass.

## Configuration

Backend configuration is documented in [backend/.env.example](backend/.env.example). Important values include:

- `SECRET_KEY` and `JWT_SECRET_KEY`
- `DATABASE_URL`
- `CORS_ORIGINS`
- `OPENAI_API_KEY` and `OPENAI_MODEL`
- `PORT`
- `FLASK_ENV`

The default local database is `backend/hopemind.db`, which is intentionally ignored by Git. Use `python backend\seed.py` to recreate demo data.

## Deployment notes

1. Set strong, unique production secrets.
2. Use PostgreSQL or another managed database instead of the local SQLite file.
3. Restrict `CORS_ORIGINS` to the deployed frontend origin.
4. Serve the frontend over HTTPS and configure the API base/proxy for the deployed backend.
5. Do not commit `.env` files, model credentials, database files, user data, or logs.
6. Review emergency contacts for the country and service area before any real-world use.
7. Perform clinical, privacy, accessibility, and security review before handling real patient information.

## Privacy and safety

HopeMind handles sensitive wellness information. This repository is a demonstration and is not a compliance certification. Before production use, add a formal privacy notice, retention policy, consent workflow, access review, encrypted infrastructure, incident response plan, and jurisdiction-specific legal review.

For security concerns, follow [SECURITY.md](SECURITY.md) rather than opening a public issue with sensitive details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow and pull-request expectations.
