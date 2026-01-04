# CloudBee Robotics Learning Platform

This project provides a Vite + React frontend with a Flask backend for managing courses, lessons, classwork, and instructor workflows. It includes instructor-facing dashboards, upload management, and a Supabase-backed AI tutor function.

## Prerequisites

- Node.js 20+
- npm 10+
- Python 3.11+
- (Optional) Docker and Docker Compose if you prefer a containerized setup

## Environment Variables

Create a root `.env` file by copying `.env.example`:

```sh
cp .env.example .env
```

Populate the values for:
- `VITE_API_BASE_URL`: URL where the Flask API is reachable (defaults to `http://localhost:5000`).
- `VITE_RAZORPAY_KEY_ID`: Razorpay public key for client-side payments.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase project URL and anon key used by the AI tutor edge function.

For the backend, copy `backend/.env.example` to `backend/.env` and set your secrets:

```sh
cp backend/.env.example backend/.env
```

Key values include database connection (`DATABASE_URL`), JWT secret, and Razorpay credentials.

## Local Development

1. Install frontend dependencies:
   ```sh
   npm install
   ```
2. Install backend dependencies:
   ```sh
   cd backend
   pip install -r requirements.txt
   cd ..
   ```
3. Start the backend (from `backend/`):
   ```sh
   FLASK_APP=app flask run --host=0.0.0.0 --port=5000
   ```
4. In a new terminal, start the frontend (from repo root):
   ```sh
   npm run dev -- --host --port 5173
   ```
5. Open the app at [http://localhost:5173](http://localhost:5173).

## Docker Compose

You can run the full stack with Docker Compose (PostgreSQL, Flask API, and Vite dev server):

```sh
make compose-up
```

Services start on the following ports:
- Frontend: `http://localhost:5173`
- API: `http://localhost:5000`
- PostgreSQL: `localhost:5432`

## Additional Notes

- Architecture and environment details are documented in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
- Update the Supabase and Razorpay configuration to match your own accounts before deploying.
