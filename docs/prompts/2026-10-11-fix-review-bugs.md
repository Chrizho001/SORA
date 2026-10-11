# Task: Fix the open bugs from the backend review (TDD, backend only)

## Read first, in this order
1. `PROJECT_GOAL.md`: the project goal and quality bar.
2. `CLAUDE.md`: workflow rules (spec-first, strict TDD, conventions).
3. `docs/reviews/2026-10-08-backend-review.md`, especially the **"Re-verification: 2026-10-11"** section.
   Each finding there has a location, evidence and a suggested fix. Treat the suggested fixes as guidance, not
   as code to paste blindly. Check them against the current code.

## Development context (do NOT treat these as bugs)
- **No AI API access exists yet.** Do not integrate a real AI provider, add API keys, or make network calls.
  AI-dependent features run on an explicit mock provider (see NEW-6).
- **No Google OAuth credentials exist yet.** Live Google sign-in will be wired up after the frontend is built.
  Do not ask for credentials or try to make the live flow work. Google **code paths are still in scope**
  and must be tested with mocks: patch `google.oauth2.id_token.verify_oauth2_token`, never the wrapper.
- There is no frontend yet. Backend only.

## Scope: fix these, in this order
**Group 1: regressions (highest priority)**
- **NEW-1:** quiz submit claims the session before validating the body, so one malformed submit locks the quiz.
  Validate first, then claim atomically. Move the logic into `apps/quizzes/services.py`.
- **NEW-3:** the Google race path returns 500 (`TransactionManagementError`). Use a nested `transaction.atomic()` savepoint.
- **NEW-4:** `send_due_task_reminders` crashes (`NotificationType.TASK_REMINDER` doesn't exist). Use `TASK_DUE_SOON`, add
  deduplication (e.g. `Task.reminder_sent_at`), `select_related("user")`, and `from datetime import timedelta`.
- **NEW-2:** the "New login" notification is sent twice per password login and never for normal Google logins. Emit exactly one,
  from a single shared helper used by both login paths.
- **NEW-10:** known PDF failures (encrypted / too many pages / no text) no longer send `PDF_SUMMARY_FAILED`. Notify on every failure path.
- **NEW-5:** the beat schedule points to a missing `apps.accounts.tasks.flush_expired_tokens`. Create it (it calls `flushexpiredtokens`).

**Group 2: repo consistency**
- **NEW-7:** create the missing `documents` migration for `PENDING` → `NOT_STARTED`, plus a data migration that updates
  existing rows. Afterwards, `python manage.py makemigrations --check --dry-run` must report no changes.
- **NEW-9:** tests publish real Celery messages to the local Redis. In `config/settings/test.py`, set
  `CELERY_TASK_ALWAYS_EAGER = True`, `CELERY_TASK_EAGER_PROPAGATES = True` and `CELERY_BROKER_URL = "memory://"`.
  The suite must pass with Redis stopped.
- Add a `redis` service to `docker-compose.yml` (dev now needs it for the cache and the broker).

**Group 3: finish the partial fixes**
- **NEW-8 / BUG-3:** flashcard generation can get stuck in `GENERATING` forever. Reset the status if queuing fails, and allow
  re-claiming a `GENERATING` job older than ~10 minutes (add a `flashcard_generation_started_at` field).
- **SEC-7:** revoke the push subscription on logout. Logout accepts an optional `push_endpoint` and revokes it.
- **API-1:** `start-quiz` (`apps/documents/views.py:75`) still returns `{"error": ...}`. Use the standard `{detail, code}`
  envelope. Move quiz creation into `apps/quizzes/services.py`.
- **SEC-5 (rest):** cap the extracted text (`DOCUMENT_MAX_CHARS` setting); build the text with `"\n".join(...)`; pin
  `pypdf>=6.19,<7.0`; add `pip-audit` to `requirements/dev.txt`.
- **BUG-1 (rest):** set `SocialAccount.email`, `extra_data` (selected claims only, never tokens) and `last_login_at`.
- **TEST-1:** change the Google tests to patch `google.oauth2.id_token.verify_oauth2_token` so the wrapper's error mapping is tested.

**Group 4: explicit mock AI (no real provider)**
- **NEW-6:** add `AI_PROVIDER = env("AI_PROVIDER", default="mock")`.
  - With `mock`, use dedicated `MockSummarizer`/`MockFlashcardGenerator` classes and record `ai_model_used="mock"`.
  - `prod.py` must refuse to start with `AI_PROVIDER == "mock"` (raise `ImproperlyConfigured`).
  - Remove the silent "no API key → fake output" fallback.
  - Validate AI flashcard output (a list of 1–N items with non-empty string `question`/`answer`); otherwise fail with a
    user-safe message. Never save junk cards. Keep the existing OpenAI client code but unused until a key exists.

## Out of scope (don't touch unless needed for a fix above)
Performance items (PERF-*), the bulk ruff cleanup of untouched files (QUAL-1), spec-drift items (SPEC-*), manual
flashcard creation (SPEC-4, a separate feature task), any real AI or Google integration, and the frontend.

## How to work (non-negotiable)
- **Strict TDD for every item:** write the failing test first and run it to confirm it fails *for the right reason*. Then
  write the minimum fix, then refactor. The review's "Evidence" column describes each test.
- One group at a time. Run the full suite after each group, and don't start the next group while anything is red.
- Never skip, weaken or delete a test to get green. If an existing test encodes buggy behaviour, say so explicitly
  before changing it.
- Follow `CLAUDE.md` conventions: logic in `services.py`, thin views, the error envelope, imports at module top,
  `logger = logging.getLogger(__name__)` with %-style logging (no f-strings), no emails or PII in logs.
- **No network calls in tests.** Patch at the lowest third-party boundary.
- Every file you create or modify must pass `ruff check` and `ruff format --check`.
- Don't commit. Leave the changes in the working tree for me to review.

## Definition of done (run these and paste the output in your final report)
```bash
cd backend
pytest --cov=apps --cov-report=term-missing        # all green, ≥90% per app
python manage.py makemigrations --check --dry-run   # "No changes detected"
ruff check <every file you touched> && ruff format --check <same files>
pip-audit -r requirements/base.txt                  # no known vulnerabilities
DJANGO_SETTINGS_MODULE=config.settings.prod SECRET_KEY=x AI_PROVIDER=openai python manage.py check --deploy
```
Also stop Redis (or point `REDIS_URL` at a dead port) and confirm `pytest` still passes.

## Final report
1. For each finding ID: what you changed (file:line), and the test(s) that prove it.
2. Any finding you could not fix, or where you deviated from the suggested fix, and why.
3. Update `docs/reviews/2026-10-08-backend-review.md`: tick ☑ only the items your tests prove fixed, and add a dated
   note under each. Don't tick anything you haven't verified.
