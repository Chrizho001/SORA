# CLAUDE.md — Study Assistant (PWA)

Final-year project. A study assistant that helps students manage tasks, summarise PDFs, and study with flashcards and quizzes.

Read `PROJECT_GOAL.md` first; open review findings are in `docs/reviews/`.

## Platform (read first)
This is a **Progressive Web App (PWA)**, not a native mobile app. It is an installable, mobile-first,
responsive web app (Next.js) talking to a Django REST API. `Study_Assistant_SRS.md` (v1.1) is the
source of requirements. Never introduce native-mobile assumptions (app stores, React Native,
device-only APIs). See `architecture/adr/0001-mobile-to-pwa.md`.

Authentication supports **email/password and Google sign-in**
(see `architecture/adr/0002-google-sign-in.md`).

## Where things live
```
CLAUDE.md                     ← this file: project-wide rules
Study_Assistant_SRS.md        ← original requirements (source of FR/NFR IDs)
architecture/                 ← one spec per system; THE source of truth for building it
  00-overview.md              ← system context, app map, cross-cutting conventions
  01-authentication.md        ← auth spec (status: ready)
  02-tasks.md … 05-quiz.md    ← stubs until specced
  adr/                        ← architecture decision records
docs/design-inspiration/      ← UI mood references for the frontend
backend/                      ← Django + DRF API
frontend/                     ← Next.js PWA (not scaffolded yet)
```

## Stack
- **Backend:** Python 3.12, Django 5.x, Django REST Framework, djangorestframework-simplejwt (with
  `token_blacklist`), django-cors-headers, django-environ, psycopg 3, argon2-cffi,
  google-auth (verifies Google ID tokens).
- **Database:** PostgreSQL 16 (via `docker-compose.yml`). Tests also run against Postgres.
- **Testing:** pytest, pytest-django, factory_boy, pytest-cov, freezegun.
- **Lint/format:** ruff.
- **Frontend:** Next.js (App Router, TypeScript), Serwist for service worker/PWA manifest.

## Workflow — spec-first, test-driven
1. **Read the spec** in `architecture/<NN>-<system>.md` before touching code for that system.
   If a stub is marked `Status: STUB`, write the full spec (using the template in
   `00-overview.md`) and get it reviewed **before** writing any code.
2. If the request conflicts with the spec, **update the spec first**, then the code.
3. Follow **TDD strictly**:
   - **Red:** write a test from the spec's *Test plan* and run it — confirm it fails for the right reason.
   - **Green:** write the minimum production code to pass.
   - **Refactor:** clean up with tests green.
   - No production code without a failing test that demands it. Never delete or skip a test to get green.
4. Work through the Test plan **one group at a time**, in order. Tick items off in the spec as they pass.
5. A system is **done** only when: all tests pass, coverage for that app is ≥ 90%,
   `ruff check` is clean, and every spec Test-plan item has a test.

## Backend conventions
- Project package: `backend/config/`. Settings split: `config/settings/{base,dev,test,prod}.py`.
  `DJANGO_SETTINGS_MODULE` defaults to `config.settings.dev`; pytest uses `config.settings.test`.
- Apps live in `backend/apps/<name>/` and are registered as `apps.<name>`.
- All endpoints are under **`/api/v1/`**; each app owns its `urls.py`, included from `config/urls.py`.
- **Thin views.** Views handle HTTP only. Business logic goes in `services.py` (plain functions);
  validation goes in serializers. Query helpers go in `selectors.py` if needed.
- Every user-owned model has an `owner`/`user` FK, and every queryset is scoped to `request.user`.
  Accessing someone else's object returns **404**, not 403.
- Primary keys are UUIDs for public models.
- **Error envelope** (custom DRF exception handler in `config/exceptions.py`):
  ```json
  { "detail": "Human readable message", "code": "machine_code", "errors": { "field": ["msg"] } }
  ```
  `errors` appears only for validation errors.
- Tests live in `apps/<name>/tests/`: `factories.py`, `test_models.py`, `test_services.py`,
  `test_api_<feature>.py`. Shared fixtures live in `backend/conftest.py`.
- Use `reverse("<app>:<name>")` in tests. Never hard-code URLs.
- Emails: console backend in dev, locmem in tests (assert through `django.core.mail.outbox`).
- Time-dependent tests use `freezegun`.
- **No network calls in tests.** Third-party services (Google token verification, AI summariser)
  sit behind a small wrapper module that tests patch (e.g. `apps.accounts.google.verify_google_id_token`).

## Commands
```bash
docker compose up -d db                       # start Postgres
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements/dev.txt
python manage.py migrate
python manage.py runserver                    # http://localhost:8000
pytest                                        # full suite
pytest apps/accounts -x -q                    # one app, stop on first failure
pytest --cov=apps --cov-report=term-missing   # coverage
ruff check . && ruff format .
```

## Rules / don'ts
- Never commit secrets. Only `.env.example` is in the repo; real values go in `.env`.
- The frontend must **never** store tokens in `localStorage`/`sessionStorage`. The access token
  lives in memory; the refresh token is an httpOnly cookie (see `01-authentication.md`).
- Don't change the custom user model's identity fields without a migration plan.
- Don't add a dependency without adding it to `requirements/*.txt` and noting why in the PR/commit.
- Keep responses within the SRS NFR budget (≤ 2–3 s). Long-running work (e.g. PDF summarisation)
  must be asynchronous. It is specced in `03-pdf-summary.md`.
