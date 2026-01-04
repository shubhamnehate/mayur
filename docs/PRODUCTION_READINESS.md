# Production Readiness & Operations Guide

This document covers the hardening steps added for production, how to run the platform safely, and how to operate alternative payment/enrollment paths (manual transfers). It assumes the stack in this repo: React (Vite) frontend, Flask API, PostgreSQL.

## Security controls in the Flask API
- **JWT-only privileged actions**: course authoring, uploads, payments, and instructor/teacher/admin flows are guarded by `@require_roles`. Admin-only operations (manual payments, creating teacher accounts) explicitly check for the `admin` role.
- **Input validation**: all sensitive endpoints now use `require_json` to enforce JSON payloads and payload size limits. Critical string/decimal fields are validated and trimmed via `sanitize_string`/`validate_decimal`; passwords must meet minimum length via `validate_password`.
- **Role expansion**: a `teacher` role now exists alongside `student`, `instructor`, and `admin`. Teacher accounts can create/update course content just like instructors.
- **Payment integrity**: payment records carry a `method` column (`razorpay` or `manual`) plus audit fields for who recorded the payment. Razorpay verification still checks HMAC signatures; manual payments bypass gateways but are admin-only and always recorded as `paid` with an enrollment created.
- **Upload hygiene**: upload signing validates filename/storage/content type, limits JSON body size, and records who initiated the upload.

## Database and migrations
- **New migration** `20250208_01_manual_payments_and_teacher.py` adds:
  - `teacher` role constraint updates and seed entry in `roles` table.
  - `payment_orders` table (if missing) to align with the ORM model.
  - `payments.method`, `payments.notes`, `payments.recorded_by_user_id`, and `payments.order_id` columns plus integrity constraints and FK wiring.
- Run migrations for production databases:
  ```bash
  cd db
  alembic upgrade head
  ```
- Local development can still rely on `db.create_all()` for SQLite, but production should always run Alembic migrations to keep constraints consistent.

## Running locally and in production
- **Local (Docker Compose)**: `docker compose up --build` spins up Postgres, Flask API on `:5000`, and Vite on `:5173`. Bind `VITE_API_BASE_URL=http://localhost:5000`.
- **Environment essentials**:
  - Backend: `BACKEND_DATABASE_URL`, `BACKEND_JWT_SECRET`, `BACKEND_RAZORPAY_KEY_ID`, `BACKEND_RAZORPAY_SECRET`, `BACKEND_CORS_ORIGINS`.
  - Frontend: `VITE_API_BASE_URL`, `VITE_RAZORPAY_KEY_ID`, `VITE_GOOGLE_CLIENT_ID`.
- **Health checks**: API exposes `/health`. Database health is covered by the Compose healthcheck.

## Payment flows
- **Razorpay (default)**: `/api/payments/create-order` → Razorpay Checkout → `/api/payments/verify` (signature check) → enrollment created. Webhooks accepted at `/api/payments/webhook` for reconciliation.
- **Manual transfers (admin-only)**: `/api/payments/manual-record`
  - Request body: `course_id`, `user_id` *or* `email`+`name`, optional `amount`, `currency`, `provider_order_id`, `provider_payment_id`, `notes`.
  - Behavior: creates/links `payment_orders` + `payments` with `method=manual`, records who submitted the request, and ensures enrollment is active.
  - Use cases: wire/NEFT transfers, cash, or other off-platform settlements.

## Google Sign-In
- Configure OAuth in Google Cloud Console and obtain a Web client ID (use **OAuth Client ID – Web** for Vite).
- Set environment variables:
  - Backend: `GOOGLE_CLIENT_ID` (or `BACKEND_GOOGLE_CLIENT_ID` if you prefer prefixing), to validate ID tokens.
  - Frontend: `VITE_GOOGLE_CLIENT_ID`, to initialize Google Identity Services.
- Flow: the frontend obtains a Google ID token via the Google Identity button; it POSTs to `/api/auth/google` with `id_token`; the backend verifies signature/audience and returns a JWT plus a local user record (auto-creates a student if the email does not exist).
- Verification safeguards: email must be present and `email_verified` must be true; invalid or mismatched tokens return 400 and do not create users.

## Account management
- **Teacher accounts**: admins can create via `POST /api/auth/admin/create-teacher` with `name`, `email`, and `password`. Teachers can perform instructor actions (course/lesson/classwork CRUD).
- **Self-signup**: restricted from creating admin accounts; allowed roles are `student`, `teacher`, or `instructor`.

## Operational checklists
- Before deployment: set strong `BACKEND_JWT_SECRET`; populate Razorpay keys; run `alembic upgrade head` against production DB; rotate any default passwords.
- Monitoring: log payment status transitions (`created` → `paid`/`failed`), monitor enrollment counts, and audit manual payment usage by `recorded_by_user_id`.
- Backup/restore: back up PostgreSQL regularly; `payment_orders`, `payments`, and `enrollments` should be included in PITR/backup plans to preserve financial/audit history.

## Manual remediation playbook
- **Payment succeeded but verify failed**: use `/api/payments/manual-record` with the Razorpay `order_id`/`payment_id` in `provider_*` fields to attach audit details and force enrollment.
- **User paid offline**: same endpoint with `notes` describing the channel (cash/NEFT). If the user does not exist, provide `email` + `name`; a student account is auto-created with a generated password hash (user should reset via your UI flow).
- **Teacher change**: if you need a new teacher, create via the admin endpoint; if you need to reassign course ownership, update `instructor_id` directly in the DB or extend the instructor routes to support reassignment with admin checks.
