# CloudBee Robotics Learning Platform

This repository contains everything you need to run the CloudBee learning platform: a web app for browsing courses, managing lessons and classwork, and experimenting with an AI tutor. The steps below are written for people with **zero coding experience**. If you can copy and paste commands, you can get the site running.

---

## What you need before starting

- A computer with **internet access**.
- A way to download the project: either **Git** (recommended) or the **"Download ZIP"** button on GitHub.
- **Node.js 20+** and **npm 10+** (install from [nodejs.org](https://nodejs.org/) – choose the LTS option). These let you run the website.
- **Python 3.11+** (already available on most systems) so the backend can start.
- **Docker + Docker Compose** (optional) if you prefer a one-command setup.

If you are unsure about any of these, follow the “Docker (easiest)” path below. It bundles everything for you.

---

## Download the project (only once)

1. Open a terminal (Command Prompt on Windows, Terminal on macOS/Linux).
2. Choose one download method:
   - **Git (recommended):**
     ```sh
     git clone https://github.com/your-org/mayur.git
     cd mayur
     ```
   - **Download ZIP:** Click **Code → Download ZIP** on GitHub, unzip the file, then in the terminal run:
     ```sh
     cd path/to/unzipped/mayur
     ```

You only need to do this once. All later commands happen inside the `mayur` folder.

## Quick start (choose one path)

### Path A: Docker (easiest — one command after install)
1. Install **Docker Desktop** from [docker.com](https://www.docker.com/products/docker-desktop/). Open it and wait until Docker says it is running.
2. In your terminal, make sure you are inside the `mayur` folder:
   ```sh
   cd /path/to/mayur
   ```
   If you see files like `package.json` when you type `ls` (macOS/Linux) or `dir` (Windows), you are in the right place.
3. Start everything (database, backend, and frontend) with one command:
   ```sh
   make compose-up
   ```
   - The first run downloads images, so it can take a few minutes.
4. When logs show the backend and frontend are ready, open your browser at **http://localhost:5173**. You should see the CloudBee home page.
5. When you’re done, stop all services (in the same terminal):
   ```sh
   make compose-down
   ```

### Path B: Manual setup (step-by-step, no Docker)
1. **Confirm tools are installed** (these commands print versions):
   ```sh
   node -v
   npm -v
   python --version
   ```
   If any command fails, install the missing tool before continuing.
2. **Install project dependencies** (inside the `mayur` folder):
   ```sh
   npm install                                    # downloads website libraries
   cd backend && pip install -r requirements.txt   # downloads backend libraries
   cd ..                                          # return to project root
   ```
3. **Create your settings files** by copying the templates (still in `mayur`):
   ```sh
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```
   - Leave the default values for a local test run. You do not need to edit them unless you have your own API keys.
4. **Start the backend** (serves course data and uploads):
   ```sh
   cd backend
   FLASK_APP=app flask run --host=0.0.0.0 --port=5000
   ```
   - Keep this terminal window open; closing it stops the backend.
5. **Start the website** in a second terminal window:
   ```sh
   cd /path/to/mayur
   npm run dev -- --host --port 5173
   ```
   - Wait for the message that Vite is running. This terminal also needs to stay open.
6. Open your browser at **http://localhost:5173** to use the app. Refreshes happen automatically when files change.

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

## Tools
This project is a part of Vibe coding concept project with codex
