# Ethara Inventory System

Ethara Inventory System is a simplified, high-performance inventory and order management system featuring a **FastAPI** backend, **Supabase PostgreSQL** database, and a **Vite + React** frontend containerized using **Docker** and **Docker Compose**.

## Features

- **Dashboard Panel**: Displays real-time metrics (Total Products, Customers, Orders, Revenue) and reactive low-stock alert warnings (items with 5 or fewer units).
- **Products Inventory**: Full CRUD operations with instant inline stock adjustments, automatic SKU unique constraints validation, and positive price/stock check constraints.
- **Customers Registry**: Client contact directory management with unique email address validations.
- **Transactional Orders**: An interactive order checkout interface allowing customer selections and multi-product selections.
  - **Atomic Stock Checks**: Validates stock availability for every line item in real-time. If stock is insufficient, the checkout rejects with details.
  - **Pessimistic Row-Locking**: Utilizes `SELECT ... FOR UPDATE` on product rows inside a database transaction to prevent concurrency conflicts (Lost Updates / Oversells).
  - **Cancel & Restock**: Canceling a confirmed order automatically replenishes stock; re-confirming a cancelled order reserves it back.
- **Responsive Theme**: High-end dark-mode interface styled with clean glassmorphic components, neon indigo/cyan highlights, and active status micro-animations.

---

## Technical Stack

| Layer | Choice |
|---|---|
| **Backend Framework** | FastAPI (Python 3.10+) |
| **Database ORM** | SQLAlchemy 2.0 |
| **Migrations Handler** | Alembic |
| **Database** | PostgreSQL via Supabase |
| **Frontend Framework** | React (Vite, JavaScript) |
| **Styling** | Custom Vanilla CSS (Design system variables) |
| **Containerization** | Docker, Docker Compose (Multi-stage Nginx) |

---

## Directory Structure

```
├── backend/
│   ├── app/
│   │   ├── app/config.py      # Pydantic environment configurations
│   │   ├── app/database.py    # SQLAlchemy engine and session setup
│   │   ├── app/models.py      # SQLAlchemy schemas with check constraints
│   │   ├── app/schemas.py     # Pydantic request/response validator schemas
│   │   ├── app/crud.py        # Database operations & locking logic
│   │   ├── app/main.py        # FastAPI app, middleware & health routing
│   │   └── app/routers/       # Products, Customers, Orders routers
│   ├── alembic/               # Alembic database migration scripts
│   ├── tests/                 # Pytest integration tests suite
│   ├── Dockerfile             # Backend container setup
│   ├── alembic.ini            # Alembic configuration
│   └── requirements.txt       # Python dependencies list
├── frontend/
│   ├── src/
│   │   ├── src/components/    # Dashboard, Products, Customers, Orders views
│   │   ├── src/api.js         # API Fetch service integration
│   │   ├── src/App.jsx        # Navigation structure & health status ping
│   │   └── src/index.css      # Core glassmorphic design system
│   ├── nginx.conf             # Nginx configuration for React SPA routing
│   ├── index.html             # Base layout index with SEO meta tags
│   └── Dockerfile             # Multi-stage frontend container build
├── docker-compose.yml         # Container coordinator
└── README.md                  # System documentation
```

---

## Environment Variables Configuration

Copy `.env.example` to a new file named `.env` at the root of the project:

```bash
cp .env.example .env
```

Define the configuration variables inside `.env`:

```env
# Database connection string to Supabase PostgreSQL
DATABASE_URL=postgresql://postgres.[username]:[password]@db.[project-id].supabase.co:5432/postgres

# CORS allowed origins (comma-separated frontend clients)
CORS_ORIGINS=http://localhost,http://localhost:5173,http://127.0.0.1:5173

# Environment mode
ENVIRONMENT=development

# Frontend-only settings (tells Vite which backend URL to call)
VITE_API_BASE_URL=http://localhost:8000
```

---

## Running the Application

### Option 1: Running with Docker Compose (Recommended)

Spins up both the backend API and frontend React client inside isolated containers, connected to your external Supabase PostgreSQL database:

```bash
# Build and run containers
docker compose up --build
```

- **Frontend Client**: Accessible at `http://localhost` (or port mapped in compose file)
- **Backend API**: Accessible at `http://localhost:8000`
- **Swagger Documentation**: Accessible at `http://localhost:8000/docs`

---

### Option 2: Running Locally for Development

#### 1. Backend API (FastAPI)

Navigate to the `backend/` directory:

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run migrations (Optional: API creates tables on startup automatically)
alembic upgrade head

# Run local development server
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend React Client (Vite)

Navigate to the `frontend/` directory:

```bash
cd ../frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

The frontend will start at `http://localhost:5173`.

---

## Database Migrations (Alembic)

To track schemas on your Supabase PostgreSQL instance:

```bash
cd backend

# Create a migration revision
alembic revision --autogenerate -m "Create initial schema"

# Apply migrations to database
alembic upgrade head
```

---

## Verification & Testing

We have built a test suite validating check constraints, unique validations, and transactional stock deductions (running against a safe in-memory SQLite configuration to avoid database contamination):

```bash
cd backend

# Run testing suite
python -m pytest
```

---

## Assessment Submission Details

- **GitHub Repository Link (Frontend + Backend)**: [https://github.com/Mohd-Ayan26/Ethara-IMS.git](https://github.com/Mohd-Ayan26/Ethara-IMS.git)
- **Backend Docker Hub Image Link**: [https://hub.docker.com/r/ayan2004/ethara-backend](https://hub.docker.com/r/ayan2004/ethara-backend)
- **Frontend Hosted URL**: `*`
- **Backend API Hosted URL**: `*`
