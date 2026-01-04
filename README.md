# CloudBee Robotics Learning Platform

This repository contains everything you need to run the CloudBee learning platform: a web app for browsing courses, managing lessons and classwork, and experimenting with an AI tutor. The steps below are written for people with **zero coding experience**. If you can copy and paste commands, you can get the site running.

---

## What you need before starting

- A computer with **internet access**.
- **Node.js 20+** and **npm 10+** (install from [nodejs.org](https://nodejs.org/) – choose the LTS option). These let you run the website.
- **Python 3.11+** (already available on most systems) so the backend can start.
- **Docker + Docker Compose** (optional) if you prefer a one-command setup.

If you are unsure about any of these, follow the “Docker (easiest)” path below. It bundles everything for you.

---

## Quick start (choose one path)

### Path A: Docker (easiest)
1. Install **Docker Desktop** from [docker.com](https://www.docker.com/products/docker-desktop/) and open it so it keeps running.
2. Open a terminal (Command Prompt on Windows, Terminal on macOS/Linux) and move into the project folder:
   ```sh
   cd /path/to/mayur
   ```
3. Start everything (database, backend, and frontend) with one command:
   ```sh
   make compose-up
   ```
4. Wait until you see logs showing “backend” and “frontend” are ready. Then open your browser at **http://localhost:5173** to use the app.
5. When you’re done, stop all services with:
   ```sh
   make compose-down
   ```

### Path B: Manual setup (still simple)
1. **Install project tools** (run these in the project folder):
   ```sh
   npm install                # downloads website dependencies
   cd backend && pip install -r requirements.txt && cd ..  # downloads backend dependencies
   ```
2. **Create your settings files** by copying the templates:
   ```sh
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```
   - These files store connection details. The defaults already point to running everything on your own computer.
3. **Start the backend** (serves course data and uploads):
   ```sh
   cd backend
   FLASK_APP=app flask run --host=0.0.0.0 --port=5000
   ```
   Leave this terminal open—it keeps the backend alive.
4. **Start the website** in a new terminal window:
   ```sh
   cd /path/to/mayur
   npm run dev -- --host --port 5173
   ```
5. Open your browser at **http://localhost:5173**. Changes you make in the app will refresh automatically.

---

## Understanding the environment files (optional)

If you need to connect to external services, fill these values in the `.env` files you created:

- **Frontend (`.env`):**
  - `VITE_API_BASE_URL` — where the backend is reachable (default works for local setup).
  - `VITE_RAZORPAY_KEY_ID` — Razorpay public key if you enable payments.
  - `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` — keys for the AI tutor feature.
- **Backend (`backend/.env`):**
  - `DATABASE_URL`, `JWT_SECRET_KEY`, and Razorpay credentials. These stay on your machine.

You can leave these as-is for a local test drive; only adjust them when connecting to your own services.

---

## Using the app

- **Instructor dashboard:** manage courses, lessons, classwork, and file uploads in one place.
- **Course editor:** build or edit a course, attach lesson content, and link uploaded files.
- **Uploads:** add images, PDFs, or other files; the app automatically reuses the file URLs inside lessons and classwork.
- **AI tutor (Supabase):** if you provide Supabase keys, the tutor endpoint will be available for experiments.

Everything happens in your browser—no coding required once the servers are running.

---

## Troubleshooting

- If a command is not found, confirm you installed Node.js, Python, or Docker as listed above.
- If ports 5000 or 5173 are busy, stop other apps using those ports or change the port numbers in the start commands.
- To restart from scratch with Docker, run `make compose-down` and then `make compose-up` again.

---

## Want to explore the code later?

Architecture notes live in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) if you decide to dive deeper. For casual use, you can ignore the code and focus on the steps above.
