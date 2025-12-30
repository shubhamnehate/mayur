# CloudBee Robotics Learning Platform

A Vite + React frontend with a Flask backend for managing courses, enrollments, and payments.

## Quick start

### Local development with npm
1. Install dependencies: `npm install`.
2. Run the frontend dev server: `npm run dev` (defaults to port 5173).

### Run everything with Docker Compose
1. Copy environment files:
   - `cp backend/.env.example backend/.env`
   - (Optional) create a `.env` at the repo root to override `VITE_API_BASE_URL` for the frontend container.
2. Start the stack:
   ```sh
   docker compose up --build
   ```
   - Frontend: http://localhost:5173
   - API: http://localhost:5000

## Environment variables

### Frontend
- `VITE_API_BASE_URL` – Base URL for API requests (defaults to `http://localhost:5000`).
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` – Legacy AI Tutor function host/key. Remove once the Supabase flow is retired.

### Backend (`backend/.env`)
- `FLASK_ENV` – Flask environment (e.g., `development`).
- `DATABASE_URL` – SQLAlchemy database URL (Postgres DSN).
- `JWT_SECRET` – Secret used by Flask-JWT-Extended to sign access tokens.
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` – Razorpay API credentials used when creating orders and validating signatures.

## Auth flow (JWT)
- Users register and login via `/api/auth/register` and `/api/auth/login`.
- Successful login returns a JWT access token containing `roles` and `user_id` claims. Clients send it as `Authorization: Bearer <token>`.
- `/api/auth/me` returns the authenticated user and claims; role-guarded endpoints rely on these claims (e.g., instructor-only routes).

## Payment flow (Razorpay)
- Create an order with `/api/payments/create-order` (or `/api/payments/checkout` for backward compatibility). Requires a `course_id` and user context; returns a Razorpay order payload plus the publishable key.
- Confirm payments with `/api/payments/verify`, which checks the Razorpay signature using `RAZORPAY_KEY_SECRET` and enrolls the learner.
- Razorpay webhooks can call `/api/payments/webhook` to finalize payment status idempotently.

## Instructor endpoints
Instructor-only routes (JWT with `role: instructor`) are namespaced under `/api/instructor`:
- `GET /api/instructor/courses` – List courses for the instructor.
- `POST /api/instructor/courses` – Create a course.
- `PUT/DELETE /api/instructor/courses/:course_id` – Update or delete a course.
- `POST /api/instructor/courses/:course_id/lessons` – Add a lesson.
- `PUT/DELETE /api/instructor/courses/:course_id/lessons/:lesson_id` – Update or delete a lesson.

## Testing
- End-to-end checkout: use Razorpay test keys (`RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`) and exercise the order ➜ payment ➜ verification flow against `/api/payments/create-order` and `/api/payments/verify`. Ensure enrollments are created after a successful signature.

## Legacy Supabase folder
The `supabase/` directory is kept for historical assets and is no longer part of the active deployment path. Treat it as read-only until it can be archived or removed.
