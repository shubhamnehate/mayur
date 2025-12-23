# Architecture and Environment Reference

This project uses a Vite-powered React frontend and a Flask backend. The backend can run with either SQLite (default) or PostgreSQL via Docker Compose.

## Services and Ports

- **Frontend (Vite):** runs on port **5173** (configured in Docker to bind `5173:5173`).
- **Backend (Flask):** runs on port **5000** (`flask --app app run --host=0.0.0.0 --port=5000`).
- **PostgreSQL:** runs on port **5432** (Docker binding `5432:5432`).

## Environment Variables

Frontend (Vite variables are prefixed with `VITE_`):
- `VITE_API_BASE_URL`: Base URL the frontend uses to reach the backend API.
- `VITE_RAZORPAY_KEY_ID`: Public Razorpay key exposed to the browser.

Backend:
- `BACKEND_JWT_SECRET`: Secret used to sign and verify JWTs.
- `BACKEND_DATABASE_URL`: Database connection string (e.g., `postgresql://postgres:postgres@localhost:5432/app_db` or `sqlite:///app.db`).
- `BACKEND_RAZORPAY_KEY_ID`: Razorpay key ID used by the backend to create/verify payments.
- `BACKEND_RAZORPAY_SECRET`: Razorpay secret used by the backend to create/verify payments.
- `BACKEND_CORS_ORIGINS`: Comma-separated list of allowed origins for CORS (e.g., `http://localhost:5173`).

## Local Development Notes

- Docker Compose mounts the `backend` and `db` directories into the backend service for live reloading.
- Postgres data persists in the `postgres_data` Docker volume by default; if you bind it locally, place it under `postgres-data/` (ignored in version control).
