# 00 — Architecture Overview

*Last updated 2026-10-25.*

## System context
The product is a **Progressive Web App** (installable, mobile-first, responsive). There is no native
mobile client (ADR 0001).
```
 Browser / installed PWA                     one public origin (HTTPS)
┌──────────────────────────┐            ┌──────────────────────────────────────────────┐
│ Next.js PWA (frontend/)  │  /api/v1/* │ Next.js server ──rewrite──▶ Django + DRF      │
│ - app shell (Serwist SW) │ ─────────▶ │                             (gunicorn)        │
│ - access token in memory │  Bearer +  │                               │   ▲           │
│ - refresh = httpOnly     │  refresh   │                 ┌─────────────┘   │           │
│   cookie (first-party)   │  cookie    │                 ▼                 │           │
└──────────────────────────┘            │  PostgreSQL 16 ◀── Celery worker ─┤           │
      │  ▲   ▲ web push                 │                    Celery beat ───┤  Redis 7  │
      │  │   └──────────────────────────│── (pywebpush, VAPID)              │  (broker, │
      ▼  │ ID token                     │                                   │  throttle │
┌──────────────────────────┐ verify ID  │  Google Gemini API ◀── worker     │  cache)   │
│ Google Identity Services │◀── token ──│  (summaries, AI flashcard suggestions)        │
└──────────────────────────┘            └──────────────────────────────────────────────┘
```
- Google sign-in: the PWA gets an ID token from Google and POSTs it to `/api/v1/auth/google/`. The API
  verifies it and issues its own JWTs (ADR 0002).
- Slow work (PDF parsing, AI calls, web push, reminders) runs in **Celery** (worker + beat). The request
  path only enqueues, inside `transaction.on_commit`.

## Systems / Django apps
| # | Spec | Django app | SRS ref | Status |
|---|------|-----------|---------|--------|
| 01 | [Authentication](01-authentication.md) | `apps.accounts` | §3.1, §4 Security | Ready · implemented (PATCH `me/` re-opened) |
| 02 | [Tasks & schedule](02-tasks.md) | `apps.tasks` | §3.2, §3.3 | Ready · implemented (Group 4 reminders/timezone open) |
| 03 | [PDF summary](03-pdf-summary.md) | `apps.documents` | §3.4 | Ready · implemented (Group 3 robustness open) |
| 04 | [Flashcards & Decks](04-flashcards.md) | `apps.flashcards` | §3.5 | **Ready · to implement** (rewritten 2026-10-25, ADR 0003) |
| 05 | [Quiz](05-quiz.md) | `apps.quizzes` | §3.6 | **Ready · to implement** (deck-based, rewritten 2026-10-25) |
| 06 | [Notifications](06-notifications.md) | `apps.notifications` | supports all | Ready · v1 subset (see its §0) |

Open work for every system is tracked in `/Code_Review.md`. Agent prompts are in
`docs/reviews/AGENT_PROMPTS.md`.

Dependencies: Quiz → Decks/Flashcards. AI flashcard suggestions → PDF summary. Everything → Notifications.

## API map (all under `/api/v1/`)
| Prefix | Namespace | Owner |
|---|---|---|
| `auth/` | `accounts` | 01 |
| `tasks/` | `tasks` | 02 |
| `documents/` | `documents` | 03 (+ legacy `generate-flashcards`) |
| `decks/` | `decks` | 04 (+ `start-quiz`, `generate-flashcards`) |
| `flashcards/` | `flashcards` | 04 |
| `quiz-sessions/` | `quizzes` | 05 |
| `notifications/`, `notification-preferences/`, `push-subscriptions/` | `notifications` | 06 |

## Backend layout
```
backend/
├── manage.py
├── conftest.py                  shared fixtures (api_client, user, auth_client, …)
├── pyproject.toml               ruff + pytest config (testpaths = ["apps"])
├── requirements/{base,dev}.txt
├── config/
│   ├── settings/{base,dev,test,prod}.py
│   ├── celery.py                Celery app (worker + beat schedule in settings)
│   ├── middleware.py            request body size limit
│   ├── urls.py                  /api/v1/<app>/ includes
│   └── exceptions.py            error-envelope exception handler
└── apps/
    └── <app>/
        ├── models.py  serializers.py  services.py  views.py  urls.py  admin.py  tasks.py
        └── tests/{factories.py, test_*.py}
```

## Frontend layout
```
frontend/src/
├── app/                       App Router routes
│   ├── (marketing) page.tsx   landing
│   ├── login, signup, verify-email, forgot-password, reset-password
│   ├── dashboard/layout.tsx   auth guard + sidebar + mobile nav
│   ├── dashboard/{tasks,documents,flashcards,flashcards/[deckId],quizzes,quizzes/[id],notifications,settings}
│   ├── manifest.ts, sw.ts (Serwist), offline/page.tsx
├── components/                UI (dashboard/, auth/, ui/ incl. Dialog, ConfirmDialog)
└── lib/                       axios-client (single-flight refresh), auth-context, dashboard-api,
                               use-dashboard-queries (TanStack Query), dates.ts, notification-types.ts
```

## Cross-cutting conventions
- **API versioning:** URL prefix `/api/v1/`.
- **Auth:** every endpoint requires JWT auth by default (`DEFAULT_PERMISSION_CLASSES = IsAuthenticated`).
  Public endpoints opt out explicitly with `AllowAny`.
- **Ownership:** all user data is scoped to `request.user`. Another user's object returns 404.
  Referenced objects in request bodies (e.g. `deck`, `document`) are validated with user-scoped querysets.
- **Pagination:** `PageNumberPagination`, `page_size=20`, response `{count, next, previous, results}`.
  The frontend must follow `next` (or use infinite queries). It never assumes one page is everything.
- **Errors:** `{detail, code, errors?}` envelope (see CLAUDE.md). User-visible messages never contain
  raw exception or provider text.
- **Timestamps:** every model has `created_at` / `updated_at`. The API uses ISO 8601 UTC. The frontend
  groups by the **local** date.
- **IDs:** UUID primary keys.
- **Throttling:** `ScopedRateThrottle` on sensitive or expensive endpoints. Rates are set in settings.
  `NUM_PROXIES` must match the deployment (SEC-03).
- **Performance (SRS §4):** synchronous endpoints respond in < 2 s. List endpoints use a fixed number of
  queries (tested with `django_assert_num_queries`). Long jobs run in Celery.
- **Background jobs:** enqueue in `transaction.on_commit`. Tasks are idempotent (`acks_late=True`) and
  have time limits (`CELERY_TASK_TIME_LIMIT=300`).

## Deployment (updated 2026-10-26: Vercel + Render free tiers)
- **One public HTTPS origin: Vercel.** Vercel serves the Next.js PWA and rewrites `/api/v1/*` to the Django
  API on Render (`https://sora-api.onrender.com`). The browser never calls Render directly, so the refresh
  cookie is first-party on the Vercel domain.
- **Render (free):** one Docker web service running gunicorn + `celery worker --beat` (they share the local
  disk for uploaded PDFs), Render Postgres and Render Key Value (Redis). Blueprint: `render.yaml`.
- **Email:** Brevo's HTTPS API via `django-anymail` (`BREVO_API_KEY`), because Render's free tier blocks
  outbound SMTP. `prod` refuses to start without `BREVO_API_KEY` or `EMAIL_HOST`.
- `NUM_PROXIES`: two platforms sit in front of Django; measure it from the `xff=` field in the API access
  log after deploying (`docs/deployment.md` §4). A self-hosted Next.js rewrite adds no entry (measured).
- Settings: `config.settings.prod` (`DEBUG=False`). `config.settings.demo` = prod + two flags for a laptop
  tunnel fallback. `config.settings.dev` is **never** exposed publicly.
- Free-tier trade-offs (sleep after 15 min, temporary PDF storage, 30-day Postgres) and the full checklist:
  `docs/deployment.md`.

## Spec template (use for every system)
```
# NN — <System>
Status: STUB | DRAFT | READY | DONE
## 1. Purpose
## 2. Requirements          (FR-x.y / NFR-x traced to SRS sections)
## 3. Data model            (fields, types, constraints, indexes)
## 4. API endpoints         (method, path, auth, request, responses + status codes, error codes)
## 5. Business rules
## 6. Security & permissions
## 7. Test plan             (ordered groups of checkbox items — the TDD backlog)
## 8. Out of scope
## 9. Open questions
```
