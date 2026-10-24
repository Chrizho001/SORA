# SORA — Multimodal AI Academic Study Companion & Exam Readiness Engine

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.4.2-black?style=for-the-badge&logo=next.js&logoColor=white)
![Turbopack](https://img.shields.io/badge/Turbopack-Enabled-blueviolet?style=for-the-badge&logo=vercel)
![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)
<br/>
![Django](https://img.shields.io/badge/Django-5.2-092e20?style=for-the-badge&logo=django&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.12-3776ab?style=for-the-badge&logo=python&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-5.6-37814a?style=for-the-badge&logo=celery&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-dc382d?style=for-the-badge&logo=redis&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-3.5_Flash-4285f4?style=for-the-badge&logo=google&logoColor=white)
![Tests](https://img.shields.io/badge/Tests-171%20Passed%20(100%25)-success?style=for-the-badge)

<p align="center">
  <strong>Transform dense lecture slides, textbooks, and course readings into high-yield summaries, active-recall flashcard decks, speed quizzes, and structured daily study plans.</strong>
</p>

</div>

---

## 📌 Table of Contents
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Prerequisites](#-prerequisites)
- [Step-by-Step Installation & Setup](#-step-by-step-installation--setup)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Start Database & Redis (Docker)](#2-start-database--redis-docker)
  - [3. Backend Configuration & Setup](#3-backend-configuration--setup)
  - [4. Start Celery Asynchronous Worker](#4-start-celery-asynchronous-worker)
  - [5. Start Django Development Server](#5-start-django-development-server)
  - [6. Frontend Configuration & Setup](#6-frontend-configuration--setup)
- [Environment Variables Guide](#-environment-variables-guide)
  - [Backend (.env)](#backend-env)
  - [Frontend (.env.local)](#frontend-envlocal)
- [Running Automated Tests](#-running-automated-tests)
- [Live Logging & Monitoring](#-live-logging--monitoring)
- [Security Architecture](#-security-architecture)
- [Troubleshooting & FAQ](#-troubleshooting--faq)
- [License](#-license)

---

## 💡 Overview

University students, researchers, and professional learners are inundated with hundreds of pages of lecture slides, textbook chapters, and technical readings each semester. Traditional passive reading leads to low retention and exam anxiety.

**SORA** solves this through a unified academic workflow:
1. **Multimodal Document Ingestion**: Upload course PDFs (lecture slides, papers, or scanned notes).
2. **AI Multimodal Vision Parsing**: Google Gemini AI reads both digital text and visual diagrams, charts, schemas, and handwritten equations.
3. **Executive Study Guides**: Automatically generates clean Markdown summaries with core concepts, exam takeaways, and formatted comparison tables.
4. **Active-Recall Flashcards**: Automatically extracts high-yield Q&A pairs for daily spaced repetition practice with interactive 3D flip cards.
5. **Speed Quizzes & Exam Drills**: Benchmarks retention with timed multiple-choice quizzes and immediate scoring.
6. **Integrated Daily Study Planner**: Organizes study tasks, assignments, and review sessions on an interactive calendar.
7. **Zero Silent Failures**: Deep error reporting, inline one-click retries, and automatic background session refresh.

---

## ✨ Key Features

- **👁️ Native Multimodal PDF Vision**:
  - Direct processing of raw PDF bytes via `inline_data: application/pdf` to Google Gemini.
  - Understands presentation slides, architecture diagrams, data flowcharts, mathematical logic notation, and image-only scanned PDFs without separate OCR software.
- **📖 Human-Readable Structured Summaries**:
  - Rendered with GitHub Flavored Markdown (`react-markdown` + `remark-gfm`).
  - Formatted responsive tables, clean section headings, accented bullet points, and syntax-highlighted code.
  - Pre-sanitized to eliminate raw HTML tags (`<br>`, `<b>`, `<div>`) and unparsed pipe characters.
- **⚡ 1-Click Spaced Repetition Flashcards**:
  - Automatically synthesizes 5 high-yield flashcards per document.
  - Interactive 3D flip cards with question/answer views, deck filtering, and shuffle modes.
- **🎯 Speed Quiz Exam Simulator**:
  - Generates timed multiple-choice quizzes to measure recall speed and topic mastery.
  - Real-time score feedback and performance breakdown.
- **📅 Interactive Study Schedule & Activity Charts**:
  - Daily schedule board with priority badges and completion checkboxes.
  - Visual Study Hours Activity Chart powered by Recharts.
  - Interactive mini-calendar with task indicator dots.
- **🦉 Cheerful Sora Mascot Companion**:
  - Animated mascot offering dynamic emotional states, section tips, and onboarding guidance.
- **🛡️ Bulletproof Error Resilience**:
  - Deep error normalizer extracts DRF validation errors and status codes into clear human messages.
  - One-click **"Retry AI Analysis"** and **"Retry Flashcards"** buttons directly on document cards.
  - Transparent silent token refresh on 401 Unauthorized prevents session lockouts.
- **📱 Mobile-First Responsive PWA**:
  - Crafted for mobile phones, tablets, laptops, and ultra-wide desktops.
  - Built-in PWA installation modal with clear instructions for iOS and Android.

---

## 🏗️ Architecture & Tech Stack

```mermaid
graph TD
    Client["Next.js 16 Frontend (React 19 + Tailwind v4 + TanStack Query)"]
    API["Django 5 REST API (SimpleJWT + CORS + Argon2)"]
    Celery["Celery Task Worker (Solo Pool)"]
    Redis[("Redis 7 (Broker & Cache)")]
    DB[("PostgreSQL 16 Database")]
    Gemini["Google Gemini 3.5 Flash (Multimodal Vision & JSON Flashcards)"]

    Client -->|REST & HttpOnly Cookies| API
    API -->|Read / Write| DB
    API -->|Queue Tasks| Redis
    Redis -->|Dispatch Jobs| Celery
    Celery -->|Multimodal PDF / Vision API| Gemini
    Celery -->|Store Summary & Cards| DB
    Celery -->|Web Push Notifications| Client
```

### Technology Breakdown

| Layer | Technologies |
|---|---|
| **Frontend Framework** | Next.js 16.4 (App Router, Turbopack, Partial Prerendering) |
| **Frontend UI & Styling** | React 19, Tailwind CSS v4, Framer Motion, Lucide Icons |
| **Data Fetching & State** | TanStack React Query v5, Axios (with Token Refresh Interceptor) |
| **Markdown Rendering** | `react-markdown`, `remark-gfm` |
| **Data Visualization** | Recharts 3.x |
| **Backend Framework** | Django 5.2, Django REST Framework 3.15 |
| **Authentication** | Django SimpleJWT (Argon2 Password Hashing, HttpOnly Refresh Cookies) |
| **Task Queue & Cache** | Celery 5.6, Redis 7 |
| **Database** | PostgreSQL 16 |
| **AI Model Providers** | Google Gemini 3.5 Flash (`gemini-3.5-flash`), Groq API, Mock Provider (for offline tests) |
| **PDF Processing** | PyPDF 6.x & Native Base64 Inline Multimodal Encoding |
| **Testing** | Pytest 8, Pytest-Django, Factory-Boy, Next.js Production Build Suite |

---

## 📂 Project Directory Structure

```text
SORA/
├── docker-compose.yml          # PostgreSQL 16 & Redis 7 container configuration
├── .gitignore                  # Production-hardened git ignore (strictly zero secrets)
├── README.md                   # Project documentation
│
├── backend/                    # Django 5 REST Framework Application
│   ├── manage.py
│   ├── config/                 # Settings (base.py, dev.py, prod.py, test.py), routing, celery
│   ├── apps/
│   │   ├── accounts/           # User authentication, Google OAuth, JWT tokens, profile
│   │   ├── documents/          # PDF upload, PyPDF extraction, Gemini vision summarizer, retry
│   │   ├── flashcards/         # Flashcard generation, spaced repetition, JSON schema output
│   │   ├── quizzes/            # Speed quiz sessions, answer evaluation, scoring
│   │   └── notifications/      # Real-time web push notifications & email service
│   ├── requirements/           # base.txt, dev.txt
│   ├── logs/                   # celery.log, django.log (ignored from git)
│   └── .env.example            # Backend environment template
│
└── frontend/                   # Next.js 16 App Router Application
    ├── package.json
    ├── next.config.ts
    ├── src/
    │   ├── app/                # / (landing), /dashboard, /login, /signup, /verify-email, etc.
    │   ├── components/
    │   │   ├── auth/           # SoraMascot, ToastProvider, GoogleAuthButton
    │   │   └── dashboard/      # FormattedSummary, ActiveStudyMaterials, MiniCalendar,
    │   │                       # StudyActivityChart, DailySchedule, TaskModal, UploadModal,
    │   │                       # views (DashboardHomeView, DocumentsView, FlashcardsView, QuizzesView)
    │   └── lib/                # axios-client, auth-context, dashboard-api, use-dashboard-queries
    └── .env.example            # Frontend environment template
```

---

## 📋 Prerequisites

Ensure the following dependencies are installed on your workstation:
- **Node.js**: `v20.x` or `v22.x` ([Download Node.js](https://nodejs.org/))
- **Python**: `3.12+` ([Download Python](https://www.python.org/))
- **Docker & Docker Compose**: ([Get Docker](https://docs.docker.com/get-docker/))
- **Google AI Studio API Key**: Free API key from [Google AI Studio](https://aistudio.google.com/) for Gemini multimodal features.

---

## 🚀 Step-by-Step Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/Chrizho001/SORA.git
cd SORA
```

---

### 2. Start Database & Redis (Docker)
Start the PostgreSQL 16 database and Redis 7 broker using Docker Compose:
```bash
docker compose up -d
```
Verify the containers are healthy:
```bash
docker compose ps
```
*(PostgreSQL will listen on port `5432`, and Redis on port `6379`)*.

---

### 3. Backend Configuration & Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a Python virtual environment**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements/dev.txt
   ```

4. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   Open `backend/.env` in your editor and configure your secrets:
   ```ini
   SECRET_KEY=your-secure-random-secret-key-32-chars-min
   DEBUG=True
   DATABASE_URL=postgres://study_user:study_pass@localhost:5432/study_assistant
   FRONTEND_URL=http://localhost:3000

   # AI Configuration
   AI_PROVIDER=gemini
   AI_API_KEY=your-google-ai-studio-gemini-key
   AI_MODEL_NAME=gemini-3.5-flash
   ```

5. **Apply database migrations**:
   ```bash
   python manage.py migrate
   ```

6. **Create an administrative superuser (optional)**:
   ```bash
   python manage.py createsuperuser
   ```

---

### 4. Start Celery Asynchronous Worker
Celery processes PDF uploads, extracts document text, and communicates with Google Gemini in the background:
```bash
# In backend/ with active virtualenv:
mkdir -p logs
celery -A config worker -l info -P solo --logfile=logs/celery.log
```
*(In a separate terminal or background tab)*.

---

### 5. Start Django Development Server
```bash
# In backend/ with active virtualenv:
python manage.py runserver 0.0.0.0:8000
```
Django API will be accessible at: `http://localhost:8000/api/v1/`

---

### 6. Frontend Configuration & Setup

1. **Open a new terminal and navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node.js packages**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Verify `frontend/.env.local` contains:
   ```ini
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1/auth
   NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000/api/v1
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   ```

4. **Start the Next.js development server**:
   ```bash
   npm run dev
   ```

5. **Access the application**:
   Open **`http://localhost:3000`** in your browser. Register an account, log in, and begin uploading your course materials!

---

## ⚙️ Environment Variables Guide

### Backend (`backend/.env`)

| Variable | Description | Default / Example |
|---|---|---|
| `SECRET_KEY` | Django cryptographic signing key | `django-insecure-change-me` |
| `DEBUG` | Enable Django debug mode | `True` |
| `ALLOWED_HOSTS` | Comma-separated allowed hostnames | `localhost,127.0.0.1` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://study_user:study_pass@localhost:5432/study_assistant` |
| `FRONTEND_URL` | CORS and link generation origin | `http://localhost:3000` |
| `AI_PROVIDER` | AI service (`gemini`, `groq`, `mock`) | `gemini` |
| `AI_API_KEY` | Google Gemini or Groq API Key | `your-api-key-here` |
| `AI_MODEL_NAME` | Target LLM model name | `gemini-3.5-flash` |
| `CELERY_BROKER_URL`| Redis broker URL for Celery | `redis://localhost:6379/0` |
| `GOOGLE_CLIENT_ID`| Google OAuth 2.0 Web Client ID | `your-id.apps.googleusercontent.com` |
| `RESEND_API_KEY` | Resend email service key (optional) | `re_...` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Default / Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Authentication endpoint prefix | `http://localhost:8000/api/v1/auth` |
| `NEXT_PUBLIC_BACKEND_API_URL` | Main API prefix (documents, quizzes) | `http://localhost:8000/api/v1` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Public Google OAuth 2.0 Web Client ID | `your-id.apps.googleusercontent.com` |

---

## 🧪 Running Automated Tests

### Backend Test Suite (Pytest)
The backend includes 171 automated tests verifying authentication, Google token verification, JWT issuance, document parsing, Celery task failures, quiz algorithms, and rate limiting:
```bash
cd backend
source .venv/bin/activate
pytest -v
```
*(Automated tests automatically use `AI_PROVIDER = "mock"` from `config/settings/test.py` to ensure fast, deterministic offline execution)*.

### Frontend Quality & Production Build Check
```bash
cd frontend
npm run lint
npm run build
```

---

## 📊 Live Logging & Monitoring

Real-time symlinks and logs are maintained in `backend/logs/`:
```bash
# View Celery background task processing live:
tail -f backend/logs/celery.log

# View Django HTTP requests live:
tail -f backend/logs/django.log
```

---

## 🔒 Security Architecture

1. **Zero Hardcoded Secrets**: All keys, passwords, and tokens are read exclusively through environment variables.
2. **Double-Cookie JWT Architecture**:
   - Short-lived Access Tokens (held strictly in-memory by React; never in `localStorage` or `sessionStorage` to mitigate XSS).
   - Long-lived Refresh Tokens stored in `HttpOnly`, `SameSite=Lax`, encrypted cookies.
3. **Argon2 Password Hashing**: State-of-the-art password derivation resistant to GPU/ASIC cracking.
4. **Transparent Token Refresh**: When access tokens expire, Axios interceptors silently issue a refresh request and replay the failed call without user disruption.
5. **AI Rate Limiting**: Built-in Django Rest Framework scoping prevents runaway token consumption or abuse.

---

## ❓ Troubleshooting & FAQ

#### Q: "My PDF has no text (only scanned images). Will it summarize?"
**Yes.** With `AI_PROVIDER=gemini` and `gemini-3.5-flash`, SORA passes raw PDF bytes natively via inline base64 multimodal encoding. Gemini's visual neural network inspects each page as an image to read slides, charts, and scanned text.

#### Q: "Why is my document stuck in 'PROCESSING'?"
Make sure your Celery worker is running:
```bash
celery -A config worker -l info -P solo
```
Also verify that Redis is running on port 6379 (`docker compose ps`).

#### Q: "Can I use Groq instead of Gemini?"
**Yes.** Set `AI_PROVIDER=groq`, `AI_API_KEY=gsk_...`, and `AI_MODEL_NAME=llama-3.3-70b-versatile` in `backend/.env`. Note that Groq free tier has an 8,000 TPM limit and does not support image-based PDFs without digital text.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
Created with ❤️ by **[Christopher Friday](https://github.com/Chrizho001)**.
