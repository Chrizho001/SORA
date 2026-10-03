# 00 — Architecture Overview

## System context
The product is a **Progressive Web App** (installable, mobile-first, responsive). There is no native
mobile client (ADR 0001).
```
┌──────────────────────────┐   HTTPS / JSON    ┌───────────────────────────┐
│  Next.js PWA (frontend/) │ ────────────────▶ │ Django + DRF (backend/)   │
│  - app shell (SW cache)  │  Bearer access    │  /api/v1/...              │
│  - access token in memory│  + refresh cookie │                           │
└──────────────────────────┘ ◀──────────────── │  ┌─────────────────────┐  │
      │  ▲                                     │  │ PostgreSQL 16       │  │
      │  │ ID token                            │  └─────────────────────┘  │
      ▼  │                                     │  ┌─────────────────────┐  │
┌──────────────────────────┐  verify ID token  │  │ AI summarisation API│  │ (third party, SRS §2.1)
│ Google Identity Services │ ◀──(public keys)──│  └─────────────────────┘  │
└──────────────────────────┘                   └───────────────────────────┘
```
Google sign-in: the PWA gets an ID token from Google and POSTs it to `/api/v1/auth/google/`. The API
verifies it and issues its own JWTs (ADR 0002).

## Systems / Django apps
| # | Spec | Django app | SRS ref | Status |
|---|------|-----------|---------|--------|
| 01 | [Authentication](01-authentication.md) | `apps.accounts` | §3.1, §4 Security | **Ready** |
| 02 | [Tasks & schedule](02-tasks.md) | `apps.tasks` | §3.2, §3.3 | Stub |
| 03 | [PDF summary](03-pdf-summary.md) | `apps.documents` | §3.4 | Stub |
| 04 | [Flashcards](04-flashcards.md) | `apps.flashcards` | §3.5 | Stub |
| 05 | [Quiz](05-quiz.md) | `apps.quizzes` | §3.6 | Stub |

Build order: 01 → 02 → 04 → 05 → 03. PDF summary comes last because it depends on a third-party AI
service and async processing. Quiz depends on flashcards (questions come from a subject's cards).

## Backend layout
```
backend/
├── manage.py
├── conftest.py                  shared fixtures (api_client, user, auth_client, …)
├── pytest.ini
├── pyproject.toml               ruff config
├── requirements/{base,dev}.txt
├── config/
│   ├── settings/{base,dev,test,prod}.py
│   ├── urls.py                  /api/v1/<app>/ includes
│   └── exceptions.py            error-envelope exception handler
└── apps/
    └── <app>/
        ├── models.py  serializers.py  services.py  views.py  urls.py  admin.py
        └── tests/{factories.py, test_*.py}
```

## Cross-cutting conventions
- **API versioning:** URL prefix `/api/v1/`.
- **Auth:** every endpoint requires JWT auth by default (`DEFAULT_PERMISSION_CLASSES = IsAuthenticated`).
  Public endpoints opt out explicitly with `AllowAny`.
- **Ownership:** all user data is scoped to `request.user`. Another user's object returns 404.
- **Pagination:** `PageNumberPagination`, `page_size=20`, response `{count, next, previous, results}`.
- **Errors:** `{detail, code, errors?}` envelope (see CLAUDE.md).
- **Timestamps:** every model has `created_at` / `updated_at`. The API uses ISO 8601 UTC.
- **IDs:** UUID primary keys.
- **Throttling:** `ScopedRateThrottle` on sensitive or expensive endpoints. Rates are set in settings.
- **Performance (SRS §4):** synchronous endpoints respond in < 2 s. Long jobs run asynchronously.

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
