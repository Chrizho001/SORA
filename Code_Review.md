# Code Review — Study Assistant (SORA)

**Date:** 2026-10-25 · **Delivery:** 2026-10-26 · **Scope:** `main` at `4f10599` (backend + frontend)

This file is the **single source of truth for open work**. It supersedes
`docs/reviews/2026-10-08-backend-review.md` and the previous version of this file.

- Every finding has a checkbox. Tick it (`- [x]`) **only** when the fix is merged on `main`, its tests
  pass, and `ruff check` is clean.
- Every finding names the prompt in `docs/reviews/AGENT_PROMPTS.md` that fixes it.
- **Priority:** **P0** = must ship before delivery · **P1** = should ship · **P2** = only if time allows.
- **Out of scope by owner's decision:** the hard-coded dashboard and landing-page stats and labels
  (streak, average-score fallback, card-count fallback, activity chart, "Live" and "Celery Sync" badges,
  testimonials and rating). They are deliberately **not** tracked here.

## Baseline on `main` (measured 2026-10-25)

| Check | Result |
|---|---|
| Backend tests | 171 passed, 0 failed (Postgres) |
| Backend coverage | 93% overall. Below 90%: `documents/ai.py` 31%, `flashcards/ai.py` 47%, `notifications/tasks.py` 53% |
| `ruff check backend` | **250 errors** (Definition of Done requires 0) |
| `pip-audit` | no known vulnerabilities |
| Frontend `tsc --noEmit` / `eslint` | clean |
| Frontend tests | none |
| PWA manifest / service worker | **missing** |

> **Note on the `feature/live-testing-ngrok` work.** It was never committed and will not be merged, so
> the fixes it contained are **absent from `main`** (for example the quiz score-inflation fix, document
> pipeline idempotency, extra throttles, upload body limits). Those problems are listed below as open.
> The bugs that branch *introduced* (reset links built from the `Origin` header; open dev settings
> exposed through ngrok) are **not** on `main`. The relevant rules are written down so they don't come back
> (SEC-12, DEP-02).

---

## Progress

| Area | Findings | P0 | Prompt(s) |
|---|---|---|---|
| Backend security | SEC-01 … SEC-12 | 5 | P-01, P-03, P-08 |
| Backend correctness | BUG-01 … BUG-14 | 7 | P-02, P-03, P-06 |
| Flashcards / Decks / Quiz (spec change) | FEAT-01 … FEAT-03 | 3 | P-04, P-05, P-07 |
| Backend performance | PERF-01 … PERF-04 | 1 | P-07 |
| Backend quality | QUAL-01 … QUAL-05 | 2 | P-08 |
| Frontend | FE-01 … FE-24 | 10 | P-09 … P-17 |
| Deployment | DEP-01 … DEP-03 | 2 | P-18 |
| Docs (done during this review) | DOC-01 … DOC-06 | — | — |

---

## 1. Backend — Security

- [x] **SEC-01 · P0 · An attacker can pre-register a victim's email and keep access after the victim signs in with Google**
  - **Where:** `backend/apps/accounts/services.py` `login_with_google()` (around lines 270–300). Spec rule:
    `architecture/01-authentication.md` §5 rule 9 (now corrected).
  - **Problem:** If an *unverified* password account exists for an email and that person later signs in
    with Google, the code links Google to the account and marks it verified. It keeps the password that
    whoever registered first chose. An attacker who registered `victim@x.com` first keeps password access
    to the victim's account.
  - **Acceptable solution:** when auto-linking Google to an account whose `is_email_verified` was
    `False`, call `user.set_unusable_password()` and blacklist all of the user's outstanding refresh tokens
    before marking it verified.
  - **Recommended fix:** as above, done inside the existing `transaction.atomic()`. Log
    `"Unverified account claimed via Google; password cleared: user_id=%s"`. Verified accounts keep their
    password (no change).
  - **Tests:** a Google login for an existing unverified account means `has_usable_password()` is False,
    old refresh tokens are blacklisted, and `is_email_verified` is True. For a verified account the password
    is still usable.
  - **Prompt:** P-01

- [x] **SEC-02 · P0 · Token-refresh, email-verification and reset-confirm endpoints have no throttle**
  - **Where:** `backend/apps/accounts/views.py` — `VerifyEmailAPIView`, `TokenRefreshAPIView`,
    `PasswordResetConfirmAPIView`. Rates are set in `backend/config/settings/base.py` `DEFAULT_THROTTLE_RATES`.
  - **Problem:** unlimited guessing or brute force of verification and reset tokens, and unlimited refresh
    calls.
  - **Acceptable solution:** add `throttle_scope` on each view, plus rates `auth_verify: 10/min`,
    `auth_refresh: 30/min`, `auth_password: 10/min`.
  - **Recommended fix:** same, plus a test per endpoint that the (N+1)th request returns 429. Use
    `override_settings` with a **deep-copied** `REST_FRAMEWORK` dict and clear the cache between tests, so
    the overrides don't leak into other tests.
  - **Prompt:** P-01

- [x] **SEC-03 · P0 · Rate limiting is wrong behind a reverse proxy**
  - **Where:** `backend/config/settings/base.py` (`NUM_PROXIES` defaults to 0) and `prod.py` (does not set it).
  - **Problem:** behind any proxy (Render, Railway, Nginx, a Next.js rewrite), every user appears to come
    from the proxy's IP. All users then share one login bucket of 5/min, so one person can lock everyone out.
  - **Acceptable solution:** in `prod.py`, set `REST_FRAMEWORK["NUM_PROXIES"] = env.int("NUM_PROXIES", default=1)`
    and document the proxy header requirements.
  - **Recommended fix:** same, plus `.env.example` documents `NUM_PROXIES`, and the deployment doc (DEP-01)
    states how many proxies sit in front of Django.
  - **Prompt:** P-01

- [x] **SEC-04 · P1 · Oversized uploads are buffered before they are rejected; empty files are accepted**
  - **Where:** `backend/apps/documents/serializers.py` `validate_file`; settings.
  - **Problem:** the 10 MB check runs only after Django has read the whole body into memory or a temp file.
    A 0-byte file passes the magic-byte check path inconsistently.
  - **Acceptable solution:** set `DATA_UPLOAD_MAX_MEMORY_SIZE = 12 MB` and `FILE_UPLOAD_MAX_MEMORY_SIZE = 10 MB`,
    move the size limit to a `MAX_UPLOAD_SIZE` setting, and reject empty files with `400 file_empty`.
  - **Recommended fix:** additionally add `config/middleware.py: RequestSizeLimitMiddleware`, which returns
    `413 request_entity_too_large` (error envelope) when `Content-Length` exceeds `MAX_REQUEST_BODY_SIZE`
    (12 MB). Test it with a fake `CONTENT_LENGTH` header.
  - **Prompt:** P-01

- [x] **SEC-05 · P0 · Internal error text leaks to users**
  - **Where:** `backend/apps/documents/tasks.py` (the generic `except` writes
    `f"We couldn't process this PDF. {str(e)}"`); `backend/apps/documents/ai.py` and `backend/apps/flashcards/ai.py`
    (`f"... error: {exc}"`, `f"Google Gemini API error ({status_code}): {err_msg}"`, auth-failure text);
    `backend/apps/flashcards/tasks.py` (notification body and `data.error` include `str(e)`).
  - **Problem:** provider error bodies, URLs and exception strings reach `Document.error_message` and
    notifications. That is shown in the UI and is information disclosure.
  - **Acceptable solution:** user-visible messages are a fixed, friendly whitelist ("AI service error.
    Please try again later.", "PDF is encrypted…", "PDF is too long (N pages; max M)"). The details go to
    `logger.error/exception` only.
  - **Recommended fix:** same, plus a test module `test_error_leakage.py` asserting that a raised exception
    containing `"SECRET-INTERNAL"` never appears in `error_message`, in the notification `body`, or in `data`.
  - **Prompt:** P-03

- [x] **SEC-06 · P1 · Email addresses are written to logs**
  - **Where:** `backend/apps/accounts/services.py:68` and `:390` (`user.email`);
    `backend/apps/accounts/emails.py:81` (`recipient_email`).
  - **Acceptable solution / recommended fix:** log `user_id` only. Add a test with `caplog` asserting the email
    string is absent.
  - **Prompt:** P-03

- [x] **SEC-07 · P1 · Logout can revoke other users' push subscriptions**
  - **Where:** `backend/apps/accounts/views.py` `LogoutAPIView` (push-subscription revoke by `endpoint`).
  - **Problem:** an unauthenticated logout carrying any `endpoint` revokes whichever subscription matches,
    regardless of owner.
  - **Acceptable solution:** revoke only `PushSubscription.objects.filter(user=<user resolved from the
    refresh cookie>, endpoint=...)`. If no user can be resolved, skip the revoke.
  - **Prompt:** P-01

- [ ] **SEC-08 · P1 · Postgres and Redis are exposed on all interfaces with fixed credentials**
  - **Where:** `docker-compose.yml`.
  - **Acceptable solution:** bind ports to `127.0.0.1:5432:5432` and `127.0.0.1:6379:6379`, and read the
    Postgres password from `.env` (`${POSTGRES_PASSWORD:-study_pass}`).
  - **Recommended fix:** also give Redis a password (`--requirepass`) and use a matching `REDIS_URL`.
  - **Prompt:** P-08

- [x] **SEC-09 · P2 · An in-progress quiz exposes `flashcard.id`, so answers can be looked up mid-quiz**
  - **Where:** `backend/apps/quizzes/serializers.py` (`QuizFlashcardSerializer` nested in the question).
  - **Acceptable solution:** remove the nested `flashcard` from the quiz-question payload. `question_text`
    is enough. Fixed as part of FEAT-02.
  - **Prompt:** P-05

- [x] **SEC-10 · P2 · Two concurrent refreshes with the same token both succeed**
  - **Where:** `backend/apps/accounts/views.py` `TokenRefreshAPIView` (blacklist-then-mint without a lock).
  - **Acceptable solution:** document it as accepted risk once the frontend uses a single in-flight refresh
    (FE-02).
  - **Recommended fix:** wrap it in `transaction.atomic()` and create the `BlacklistedToken` with
    `get_or_create`. If it was not created by this request, return 401 `refresh_invalid`.
  - **Prompt:** P-01

- [x] **SEC-11 · P1 · Production settings fail open**
  - **Where:** `backend/config/settings/prod.py`, `base.py`.
  - **Problem:** `CSRF_TRUSTED_ORIGINS` defaults to localhost, `EMAIL_HOST` to `""` and `GOOGLE_CLIENT_ID`
    to `""`, so a misconfigured deploy starts and silently breaks. The docstring still says "stub".
  - **Acceptable solution:** in `prod.py`, `env("FRONTEND_URL")` and `env("EMAIL_HOST")` have no default
    (so a missing value raises `ImproperlyConfigured`). Raise if `GOOGLE_CLIENT_ID` is empty. Rewrite the
    docstring.
  - **Prompt:** P-01

- [x] **SEC-12 · P0 (guard rail) · Email links must only ever be built from `settings.FRONTEND_URL`**
  - **Where:** `backend/apps/accounts/services.py` (verification and reset link builders).
  - **Problem:** the ngrok branch built links from the request `Origin`/`Referer`, which allowed reset-token
    theft through a poisoned link. `main` is currently correct; this item adds the regression test.
  - **Acceptable solution / recommended fix:** add tests that send `HTTP_ORIGIN="https://evil.example"`
    and `HTTP_REFERER` to register and password-reset, and assert the emailed link starts with
    `settings.FRONTEND_URL`.
  - **Prompt:** P-01

## 2. Backend — Correctness

- [x] **BUG-01 · P0 · Duplicate answers inflate the quiz score (verified: 50/4)**
  - **Where:** `backend/apps/quizzes/services.py` `submit_quiz()`; `backend/apps/quizzes/serializers.py`
    `SubmitQuizSerializer`.
  - **Problem:**
    - The same `question_id` can be submitted many times and each one scores.
    - Unknown question IDs are silently ignored.
    - Unanswered questions keep `is_correct = NULL`.
    - `selected_choice` is not checked against the offered `choices`.
  - **Acceptable solution:** each of the following returns 400 and leaves the session unfinished:
    duplicate IDs, IDs not in this session, and a `selected_choice` that is not in that question's `choices`.
    Unanswered questions are graded `is_correct=False`. Assert `0 ≤ score ≤ total_questions`.
  - **Recommended fix:** validate in the serializer (with the session passed in `context`), then grade in
    the service. Tests cover the duplicate, foreign, invalid-choice, partial and empty submissions.
  - **Prompt:** P-02

- [x] **BUG-02 · P0 · The flashcard-failure notification uses the wrong type and leaks errors**
  - **Where:** `backend/apps/flashcards/tasks.py` (failure branch).
  - **Problem:**
    - It sends `PDF_SUMMARY_FAILED`.
    - The body and data include `str(e)` (SEC-05).
    - The notify call is wrapped in `except Exception: pass`, so a broken call is invisible.
  - **Acceptable solution:** add `NotificationType.FLASHCARDS_FAILED` (with a migration), use a fixed body,
    and replace `pass` with `logger.exception`.
  - **Prompt:** P-03

- [x] **BUG-03 · P0 · Document processing is not idempotent; a duplicate task marks a finished document FAILED**
  - **Where:** `backend/apps/documents/tasks.py` `process_document()`. Celery uses `CELERY_TASK_ACKS_LATE=True`,
    so redelivery happens.
  - **Problem:** on a second delivery, `Summary.objects.create()` hits the OneToOne constraint. The generic
    `except` then sets `FAILED` on a document that already has a summary.
  - **Acceptable solution:**
    - At the start: return early if `status == DONE` and a summary exists.
    - Save the result under `select_for_update()` with `Summary.objects.update_or_create`.
    - The failure handlers re-fetch the row under lock and do not overwrite `DONE`.
    - If the row was deleted mid-run, return quietly (covers BUG-14).
  - **Recommended fix:** as above, plus a `processing_started_at` field (migration) that BUG-05 uses.
  - **Prompt:** P-02

- [x] **BUG-04 · P0 · Upload queues the Celery task before the transaction commits, and has no broker-failure handling**
  - **Where:** `backend/apps/documents/views.py` `create()`.
  - **Problem:** the worker can start before the row is committed. If Redis is down, the user gets a 500
    and is left with a document stuck in `UPLOADED`.
  - **Acceptable solution:** save inside `transaction.atomic()` and enqueue in `transaction.on_commit()`.
    If enqueueing fails, set `FAILED` with `"Failed to queue document processing."` and log it.
  - **Prompt:** P-02

- [x] **BUG-05 · P0 · Retry is racy, can re-run finished documents, and bypasses the AI budget**
  - **Where:** `backend/apps/documents/views.py` `retry()`.
  - **Problem:**
    - The check-then-set is not atomic, so two clicks queue two jobs.
    - A `DONE` document can be retried, which pays the AI provider again.
    - Retry is not counted against the `ai_jobs` throttle.
  - **Acceptable solution:** claim the document atomically with
    `Document.objects.filter(Q(pk=doc.pk) & (Q(status=FAILED) | Q(status__in=[UPLOADED, PROCESSING], processing_started_at__lt=now - 10min))).update(status=PROCESSING, processing_started_at=now, error_message="")`.
    If nothing was claimed, return 409 `document_processing` or 400 `document_not_retryable`. Use the
    `ai_jobs` throttle scope for retry, and enqueue on commit.
  - **Prompt:** P-02

- [x] **BUG-06 · P0 · Regenerating flashcards deletes every card of the document, including the user's edits**
  - **Where:** `backend/apps/flashcards/tasks.py` (`Flashcard.objects.filter(document=document).delete()`).
  - **Problem:** with manual cards (FEAT-01) this would destroy user work.
  - **Acceptable solution:** AI generation **appends** to a deck and skips cards whose normalised question
    already exists in that deck. Fixed as part of FEAT-01.
  - **Prompt:** P-04

- [x] **BUG-07 · P1 · Task reminders never fire again after a task is rescheduled or reopened; overdue is never sent**
  - **Where:** `backend/apps/notifications/tasks.py` `send_due_task_reminders`; `backend/apps/tasks/serializers.py` / model.
  - **Problem:** `reminder_sent_at` is never cleared when `due_at` changes or a task is re-opened.
    `TASK_OVERDUE` exists but is never emitted.
  - **Acceptable solution:** clear `reminder_sent_at` (and the new `overdue_notified_at`) whenever `due_at`
    changes or `is_completed` goes from True to False. Add an `overdue` pass to the reminder job that sends
    `TASK_OVERDUE` once per task.
  - **Prompt:** P-06 (spec: `architecture/02-tasks.md` §5, Group 4)

- [x] **BUG-08 · P1 · `?date=` filters by UTC day, so evening tasks show on the wrong day**
  - **Where:** `backend/apps/tasks/views.py` (`due_at__date`).
  - **Acceptable solution:** accept an optional `tz` (IANA name, validated with `zoneinfo`). Convert `date`
    to the `[local midnight, next local midnight)` range in that zone and filter with `due_at__gte/__lt`,
    which also uses the index. Without `tz`, fall back to UTC.
  - **Prompt:** P-06

- [x] **BUG-09 · P0 · A Redis outage turns a successful password change into a 500**
  - **Where:** `backend/apps/notifications/notification_service.py` (`send_web_push_task.delay()` called
    synchronously).
  - **Problem:** `change_password` and `confirm_password_reset` call `notify`. If the broker is down, the
    password has already changed and the tokens are revoked, but the response is a 500 and no new cookie is
    set, so the user is logged out everywhere.
  - **Acceptable solution:** in `notify`, wrap the push dispatch in `transaction.on_commit(...)` with a
    `try/except` that logs. The in-app `Notification` row is still created.
  - **Prompt:** P-03

- [x] **BUG-10 · P1 · Email is sent synchronously with no timeout**
  - **Where:** `backend/apps/accounts/services.py` (`on_commit(send_…)` runs in the request thread);
    settings (no `EMAIL_TIMEOUT`).
  - **Problem:** a slow SMTP or Resend server hangs register and reset, which breaks the NFR 2–3 s budget.
    The timing difference between existing and non-existing emails also leaks which accounts exist.
  - **Acceptable solution:** set `EMAIL_TIMEOUT = 10`.
  - **Recommended fix:** send emails from a Celery task (`apps/accounts/tasks.py: send_email_task`) queued
    `on_commit`. Tests run eagerly and assert through `mail.outbox`.
  - **Prompt:** P-03

- [x] **BUG-11 · P2 · Documents accept PUT and PATCH, which do nothing but return 200**
  - **Where:** `backend/apps/documents/views.py` (`ModelViewSet`).
  - **Acceptable solution:** set `http_method_names = ["get", "post", "delete", "head", "options"]`.
    Test that PATCH returns 405.
  - **Prompt:** P-02

- [x] **BUG-12 · P0 · Quiz choices can contain the correct answer twice, or near-identical answers**
  - **Where:** `backend/apps/quizzes/services.py` `start_quiz()`.
  - **Problem:** distractors are any other card's answers. Identical answer text produces duplicate choices,
    and grading by string equality then marks either one correct. Every card becomes a question (no cap).
  - **Acceptable solution:** distractors must be distinct by normalised text (`casefold().strip()`) and must
    differ from the correct answer. The deck needs at least 4 distinct answers, otherwise
    `400 not_enough_flashcards`.
  - **Recommended fix:** follow `architecture/05-quiz.md` §5: `question_count` (default 10, max 50),
    length-similar distractor selection, and a question snapshot. Fixed as part of FEAT-02.
  - **Prompt:** P-05

- [ ] **BUG-13 · P2 · Error envelope inconsistencies**
  - **Where:** `backend/config/exceptions.py`.
  - **Problem:**
    - SimpleJWT 401s put a stringified dict into `errors`.
    - A non-field `ValidationError("msg")` loses its message.
    - Unhandled 500s are not wrapped in the envelope.
  - **Acceptable solution:** flatten SimpleJWT's `detail` and `messages` into `detail` and `code`, keep
    `non_field_errors` text as `detail`, and return
    `{"detail": "Internal server error.", "code": "server_error"}` for unhandled exceptions when `DEBUG=False`.
  - **Prompt:** P-08

- [x] **BUG-14 · P2 · The document task crashes if the document is deleted while processing**
  - **Where:** `backend/apps/documents/tasks.py` (the failure handlers call `save(update_fields=…)` on a
    deleted row).
  - **Acceptable solution:** covered by BUG-03 (re-fetch the row; return on `DoesNotExist`).
  - **Prompt:** P-02

## 3. Backend — Flashcards, Decks and Quiz (spec change, 2026-10-25)

The owner decided that **flashcards are created manually, grouped into Decks; AI generation stays as an
optional shortcut that adds cards to a deck.** See `architecture/adr/0003-manual-flashcards-and-decks.md`,
`architecture/04-flashcards.md` and `architecture/05-quiz.md`.

- [x] **FEAT-01 · P0 · Decks and manual flashcard create, edit and delete (SRS §3.5)**
  - **Spec:** `architecture/04-flashcards.md` (Status: READY). Test plan Groups 1–4.
  - **Acceptable solution:**
    - A `Deck` model.
    - `Flashcard.deck` is required; `Flashcard.document` becomes nullable; add a `source` field
      (MANUAL/AI).
    - A data migration creates one deck per document that has cards.
    - CRUD for `/api/v1/decks/` and `/api/v1/flashcards/`, with `?deck=` filtering and ownership checks.
    - AI generation appends to a deck and dedupes (BUG-06).
  - **Prompt:** P-04

- [x] **FEAT-02 · P0 · Quizzes start from a deck; the generation rules are improved**
  - **Spec:** `architecture/05-quiz.md` (Status: READY). Test plan Groups 1–3.
  - **Acceptable solution:**
    - `POST /api/v1/decks/{id}/start-quiz/` with `{question_count?}`.
    - `QuizSession.deck` with SET_NULL and a `deck_title` snapshot.
    - BUG-01, BUG-12 and SEC-09 fixed.
    - The list endpoint is lightweight (PERF-02).
    - The old `/documents/{id}/start-quiz/` is removed.
  - **Prompt:** P-05

- [x] **FEAT-03 · P0 · Profile update `PATCH /api/v1/auth/me/` (SRS §3.1)**
  - **Where:** `backend/apps/accounts/views.py` `MeAPIView` (GET only today).
  - **Acceptable solution:** PATCH accepts `first_name` and `last_name`; other fields are read-only and
    ignored. Returns 200 with the `UserSerializer` payload. Implements `architecture/01-authentication.md`
    Group 8.
  - **Prompt:** P-07

## 4. Backend — Performance

- [x] **PERF-01 · P0 · The documents list makes one summary query per row and ships huge payloads**
  - **Where:** `backend/apps/documents/views.py` `get_queryset`, `serializers.py`.
  - **Acceptable solution:** `.select_related("summary").defer("extracted_text")` for list, plus a
    `DocumentListSerializer` without `summary.content`. The detail view keeps the full summary. Add a
    `django_assert_num_queries` test with 1 and 5 documents giving the same count.
  - **Prompt:** P-07

- [x] **PERF-02 · P1 · The quiz-session list causes N+1 queries and embeds every question**
  - **Where:** `backend/apps/quizzes/views.py`, `serializers.py`.
  - **Acceptable solution:** list uses a `QuizSessionListSerializer` (no questions); retrieve uses
    `prefetch_related("questions")`. Add a query-count test.
  - **Prompt:** P-05

- [x] **PERF-03 · P1 · Indexes don't match the list orderings**
  - **Acceptable solution:** add indexes `QuizSession(user, -created_at)`, `Notification(recipient, -created_at)`,
    `Deck(user, -updated_at)` and `Flashcard(user, deck)`, with migrations.
  - **Prompt:** P-07

- [x] **PERF-04 · P2 · Gemini receives the whole PDF as base64 even when text was extracted**
  - **Where:** `backend/apps/documents/ai.py` `GeminiSummarizerClient.summarize`.
  - **Acceptable solution:** send `pdf_bytes` only when `text` is empty (the scanned-PDF path).
  - **Prompt:** P-07

## 5. Backend — Quality and Process

- [ ] **QUAL-01 · P0 · `ruff check` reports 250 errors; 46 files are unformatted**
  - **Acceptable solution:** run `ruff check --fix . && ruff format .`, then fix the rest by hand (E501,
    E402, N818, F841, F405). `ruff check .` must report 0.
  - **Prompt:** P-08

- [ ] **QUAL-02 · P0 · Three modules are below 90% coverage**
  - **Where:** `documents/ai.py` (31%), `flashcards/ai.py` (47%), `notifications/tasks.py` (53%).
  - **Acceptable solution:** unit tests that patch `requests.post` and `pywebpush.webpush`, covering
    success, 401/403, 429, 503 retry, timeout, invalid JSON, and 404/410 revoking the subscription.
    Each app ≥ 90%.
  - **Prompt:** P-08

- [ ] **QUAL-03 · P1 · Stray and dangerous scripts are tracked in git**
  - **Where:**
    - `backend/demo_flow.py` deletes users in whichever DB is configured.
    - `backend/test_e2e_auth.py`.
    - `backend/test_email_rendering.py` is collected by pytest and `mkdir`s a hard-coded `~/.gemini/...`
      path when imported.
    - `frontend/test_browser_flow.js` and `frontend/test_dashboard_ui.js` contain hard-coded paths and a
      password.
    - Empty `apps/*/tests.py` files sit next to the `tests/` packages.
  - **Acceptable solution:** delete them (or move the useful ones to `scripts/` with no hard-coded
    paths or secrets), and add `testpaths = ["apps"]` to `pyproject.toml`.
  - **Prompt:** P-08

- [ ] **QUAL-04 · P2 · Code smells**
  - Imports inside functions and class bodies (`accounts/views.py`).
  - Exception classes defined inside handlers.
  - `config/urls.py` creates its own `environ.Env()` and imports `settings` without using it.
  - `pywebpush` is unpinned in `requirements/base.txt`.
  - The "thin views" rule is broken: document claim and retry logic live in the views.
  - **Acceptable solution:** move imports to the top, move exception classes to `exceptions.py`, read the
    admin URL from settings, pin `pywebpush>=2,<3`, and move document retry and enqueue logic into
    `apps/documents/services.py`.
  - **Prompt:** P-08

- [ ] **QUAL-05 · P1 · No Celery worker or beat in the run instructions, so reminders and AI jobs never run**
  - **Where:** `docker-compose.yml`, `README.md`.
  - **Acceptable solution:** add `worker` and `beat` services to compose (or document
    `celery -A config worker -l info` and `celery -A config beat -l info`). The README "Run locally"
    section lists all processes.
  - **Prompt:** P-08

## 6. Frontend

- [x] **FE-01 · P0 · It is not a PWA: there is no manifest, no service worker and no offline shell**
  - **Where:** `frontend/` (no `app/manifest.ts`, no Serwist in `package.json` or `next.config.ts`).
  - **Problem:** fails SRS §4 "Installability" and success criterion 6. Chrome never fires
    `beforeinstallprompt`, so `PwaInstallCard` always falls back to the manual instructions.
  - **Acceptable solution:**
    - `src/app/manifest.ts` with name, short_name, `display: "standalone"`, `start_url: "/dashboard"`,
      theme and background colours, and 192, 512 and 512-maskable PNG icons in `public/icons/`.
    - `@serwist/next` with an `app/sw.ts` that precaches the app shell, with `/offline` as the fallback
      page for navigations.
    - Lighthouse "Installable" passes.
  - **Recommended fix:** as above. Also: API responses are `NetworkOnly` (never cache authenticated
    JSON), and the SW `push` and `notificationclick` handlers are ready for FE-14.
  - **Prompt:** P-10

- [x] **FE-02 · P0 · Concurrent 401s cause a refresh race that silently kills the session**
  - **Where:** `frontend/src/lib/axios-client.ts` (401 interceptor); `frontend/src/lib/auth-context.tsx`.
  - **Problem:** each 401 starts its own `/token/refresh/`. The backend rotates and blacklists refresh
    tokens, so the second refresh fails and wipes the fresh token. Every request then fails while the UI
    still looks logged in.
  - **Acceptable solution:**
    - One module-level `refreshPromise` shared by all callers (single flight).
    - Only clear the token if it still equals the one that failed.
    - On final failure, call an `onSessionExpired` callback that AuthContext registers: clear the user and
      the query cache, then `router.replace("/login")`.
    - Make the mount-time refresh idempotent under React Strict Mode.
  - **Prompt:** P-09

- [x] **FE-03 · P0 · The previous user's data survives logout**
  - **Where:** `frontend/src/lib/auth-context.tsx` `logout()`.
  - **Acceptable solution:** call `queryClient.clear()` on logout and on session expiry, and include
    `user.id` in query keys.
  - **Prompt:** P-09

- [x] **FE-04 · P0 · Dashboard queries fire before auth resolves, with no loading or error states**
  - **Where:** `frontend/src/lib/use-dashboard-queries.ts` (no `enabled: !!user`; one hook hard-codes
    `enabled: true`); `frontend/src/app/dashboard/page.tsx`; the views use `= []` defaults.
  - **Acceptable solution:** gate every query on `!!user && !isAuthLoading`. Each view renders skeleton,
    error (with a Retry button) and empty states distinctly.
  - **Prompt:** P-09

- [x] **FE-05 · P0 · Flashcards and decks UI: create, edit, delete and browse by deck**
  - **Where:** `frontend/src/components/dashboard/views/FlashcardsView.tsx`, `src/lib/dashboard-api.ts`.
  - **Acceptable solution:**
    - Deck list (title, card count, source document).
    - Create, rename and delete a deck, with a confirmation dialog.
    - Inside a deck: list cards, add, edit and delete a card (forms validate 1–500 characters), and study
      mode (flip, next, shuffle).
    - "Generate with AI" when the deck has a source document.
    - "Start quiz" enabled only when the deck has at least 4 distinct answers.
  - **Prompt:** P-12

- [x] **FE-06 · P1 · Pagination is ignored: lists stop at 20 items**
  - **Where:** every `get*` in `frontend/src/lib/dashboard-api.ts`.
  - **Acceptable solution:** use `useInfiniteQuery` with a "Load more" button, or a helper that follows
    `next` up to a safe cap (e.g. 10 pages). Pass filters (`?deck=`) to the server instead of filtering on
    the client.
  - **Prompt:** P-16

- [x] **FE-07 · P1 · Flashcards don't appear after AI generation finishes**
  - **Where:** `frontend/src/lib/use-dashboard-queries.ts` (`useGenerateFlashcards` invalidates immediately).
  - **Acceptable solution:** while generation is `GENERATING`, poll the document. On the change to
    `DONE`/`FAILED`, invalidate `["flashcards"]`, `["decks"]` and `["notifications"]`.
  - **Prompt:** P-12

- [x] **FE-08 · P0 · Starting a quiz outside the Quizzes tab loses the session; rejections are unhandled**
  - **Where:** `frontend/src/app/dashboard/page.tsx` (start-quiz handlers), `QuizzesView.tsx` (local
    `activeSession` state), `DocumentsView.tsx` and `ActiveStudyMaterials.tsx` (callers that don't
    `await` or `catch`).
  - **Acceptable solution:** route to `/dashboard/quizzes/[id]` after `startQuiz` resolves. The quiz page
    loads the session by id, and every `mutateAsync` caller has a `try/catch` that shows a toast.
  - **Prompt:** P-11

- [x] **FE-09 · P0 · Dashboard navigation is local state: no deep links, Back exits the app, and mobile can't reach Quizzes or Notifications**
  - **Where:** `frontend/src/app/dashboard/page.tsx` (tab state), `MobileNav.tsx`.
  - **Acceptable solution:**
    - Real routes: `/dashboard`, `/dashboard/tasks`, `/dashboard/documents`, `/dashboard/flashcards`,
      `/dashboard/flashcards/[deckId]`, `/dashboard/quizzes`, `/dashboard/quizzes/[id]`,
      `/dashboard/notifications` and `/dashboard/settings`.
    - These share `app/dashboard/layout.tsx`, which holds the auth guard, sidebar and mobile nav.
    - The mobile nav reaches every section (5 items plus a "More" sheet).
  - **Prompt:** P-11

- [x] **FE-10 · P0 · Notification type keys don't match the backend**
  - **Where:** `NotificationsView.tsx`, `NotificationDrawer.tsx` (they use `DOCUMENT_SUMMARY_SUCCESS` and
    similar).
  - **Problem:** only `TASK_DUE_SOON` matches, so everything else renders as "System Alert".
  - **Acceptable solution:** one `src/lib/notification-types.ts` mapping exactly the backend enum
    (`TASK_DUE_SOON`, `TASK_OVERDUE`, `PDF_SUMMARY_READY`, `PDF_SUMMARY_FAILED`, `FLASHCARDS_READY`,
    `FLASHCARDS_FAILED`, `QUIZ_READY`, `QUIZ_GRADED`, `SECURITY_NEW_LOGIN`, `SECURITY_PASSWORD_CHANGED`,
    `SECURITY_EMAIL_CHANGED`) to an icon, a label and a deep link built from `data`.
  - **Prompt:** P-16

- [x] **FE-11 · P1 · Modals and the upload control are not accessible**
  - **Where:** `TaskModal.tsx`, `DocumentUploadModal.tsx` (clickable `div` with a `hidden` input), the
    summary reader in `DocumentsView.tsx`, `NotificationDrawer.tsx`; close buttons have no `aria-label`.
  - **Acceptable solution:** one shared `<Dialog>` primitive with `role="dialog"`, `aria-modal`,
    `aria-labelledby`, Escape to close, a focus trap, focus returned on close, and backdrop click. The
    upload control is a `<label>` wrapping an `sr-only` file input.
  - **Prompt:** P-17

- [x] **FE-12 · P1 · Google sign-in clicks a hidden Google button from code**
  - **Where:** `frontend/src/components/auth/GoogleAuthButton.tsx`.
  - **Problem:** the real clickable element is inside Google's cross-origin iframe, so `.click()` is
    unreliable.
  - **Acceptable solution:** render the official GIS button visibly (`google.accounts.id.renderButton`)
    inside the styled container, as `01-authentication.md` "Frontend contract" requires. Handle 409
    `account_conflict` with a clear message.
  - **Prompt:** P-17

- [x] **FE-13 · P1 · Timezone bugs in task date handling**
  - **Where:** `MiniCalendar.tsx`, `AssignmentsBoard.tsx` and `TasksView.tsx` (`due_at.split("T")[0]`);
    `TaskModal.tsx` (default date from `toISOString()`).
  - **Acceptable solution:** a `src/lib/dates.ts` with `toLocalDateKey(iso)` and `localDayRange(date)`.
    Bucket by local date. The date picker produces local time converted to ISO. Filter calls send `from`
    and `to` (or `date` plus `tz`, see BUG-08).
  - **Prompt:** P-14

- [x] **FE-14 · P0 · Settings is read-only: no profile edit, password change or notification preferences**
  - **Where:** `SettingsView.tsx`.
  - **Acceptable solution:**
    - A profile form (first and last name) that calls `PATCH /auth/me/`.
    - Change password (`POST /auth/password/change/`). Store the returned new access token.
    - "Set a password" when `has_password` is false (starts a password reset).
    - Notification preferences (toggle in-app and push per type).
  - **Recommended fix:** also an "Enable push notifications" button that subscribes through the SW
    (`PushManager.subscribe` with `NEXT_PUBLIC_VAPID_PUBLIC_KEY`) and POSTs to `/push-subscriptions/`.
  - **Prompt:** P-15

- [x] **FE-15 · P0 · Tasks can't be edited (SRS §3.2 "Edit task")**
  - **Where:** `TasksView.tsx`, `TaskModal.tsx` (create only).
  - **Acceptable solution:** `TaskModal` accepts an optional `task` and PATCHes it. The edit action is on
    every task row and calendar item.
  - **Prompt:** P-14

- [x] **FE-16 · P1 · Destructive actions have no confirmation**
  - **Where:** document delete (cascades to flashcards and quizzes), task delete, and deck and card delete.
  - **Acceptable solution:** a shared confirm dialog naming what will be lost.
  - **Prompt:** P-17

- [x] **FE-17 · P1 · Quiz UX gaps**
  - **Where:** `QuizzesView.tsx`.
  - **Problem:**
    - Decks or documents that can't be quizzed are offered.
    - The "5-question" copy is wrong.
    - "Answer all to submit" contradicts the button behaviour.
    - Unfinished sessions show `0 / N`.
    - There is no results review screen.
  - **Acceptable solution:**
    - Start from decks with at least 4 distinct answers.
    - Choose the question count (5, 10 or 20).
    - Progress bar, and submit enabled once all questions are answered.
    - A results screen showing each question, the user's answer and the correct answer.
    - History shows "In progress" with a Resume link for unfinished sessions.
    - "Retake mistakes" if P2 time allows.
  - **Prompt:** P-13

- [x] **FE-18 · P1 · The notification list goes stale while the unread badge updates**
  - **Where:** `use-dashboard-queries.ts` (only the unread count polls).
  - **Acceptable solution:** when the unread count changes, invalidate `["notifications"]`.
  - **Prompt:** P-16

- [x] **FE-19 · P2 · Double toasts and dead catch blocks**
  - **Where:** mutation `onError` toasts plus inline modal errors; the protected-route effect fires
    "Authentication Required" after a normal logout; the dead `catch` in `handleLogout`.
  - **Acceptable solution:** one error surface per action, and no auth toast after a voluntary logout.
  - **Prompt:** P-17

- [x] **FE-20 · P1 · Polling and timeouts**
  - **Where:** `use-dashboard-queries.ts` (document polling never stops for a stuck document);
    `axios-client.ts` (15 s upload timeout).
  - **Acceptable solution:** stop polling after 10 minutes per document and show a "Taking longer than
    expected — Retry" state. Set the upload timeout to 120 s and show upload progress (`onUploadProgress`).
  - **Prompt:** P-16

- [x] **FE-21 · P2 · Polish and dead code**
  - `error.tsx` and `not-found.tsx` are missing.
  - Footer links `/privacy`, `/terms` and `/cookies` return 404; signup "Privacy Policy" is `href="#"`.
  - "Remember me" does nothing.
  - Logged-in users aren't redirected away from `/login` and `/signup`.
  - Tailwind v4 has no `animate-in`, `fade-in`, `slide-in-from-right`, `perspective-1000` or `safe-area-pb`
    (add the plugin or remove them).
  - Unused API functions and AuthContext fields.
  - `({} as DocumentItem)` in `ActiveStudyMaterials.tsx`.
  - `currentCard` can be undefined in `FlashcardsView`.
  - "Daily Schedule" shows all tasks instead of today's.
  - **Acceptable solution:** fix each, or remove the feature.
  - **Prompt:** P-17

- [ ] **FE-22 · P1 · No automated frontend tests**
  - **Acceptable solution:** a Playwright smoke suite (`frontend/e2e/`) that runs against the local stack:
    1. Sign up and verify (read the token through a dev-only helper, or log in as a pre-verified fixture
       user).
    2. Create a task, edit it, tick it.
    3. Create a deck with 4 cards.
    4. Take a quiz and see the results.
    5. Check the manifest is reachable and the service worker registers.
  - **Prompt:** P-19

- [ ] **FE-23 · P1 · API base URLs are absolute, so the refresh cookie breaks on cross-site deploys**
  - **Where:** `frontend/.env.example` (`http://localhost:8000/...`), `axios-client.ts`.
  - **Problem:** the refresh cookie is `SameSite=Lax` and scoped to `/api/v1/auth/`. If the frontend and
    API are on different *sites* in production, the cookie is never sent and silent refresh fails.
  - **Acceptable solution:** serve the API same-origin through a Next.js rewrite
    (`/api/v1/:path*` → `BACKEND_INTERNAL_URL`), with relative base URLs (`/api/v1`) and Django
    `NUM_PROXIES` set accordingly (SEC-03).
  - **Prompt:** P-18

- [x] **FE-24 · P2 · Duplicate icon sources**
  - **Where:** `src/app/{favicon.ico,icon.svg,apple-icon.png}` and `public/*`, plus explicit `metadata.icons`.
  - **Acceptable solution:** keep one source, the file-based `app/` icons, and let the manifest reference
    `public/icons/*`.
  - **Prompt:** P-10

## 7. Deployment

- [ ] **DEP-01 · P0 · Deploy over HTTPS so the app can be installed on a phone (Definition of Complete)**
  - **Acceptable solution:** run these on a PaaS such as Render or Railway, all on one origin through the
    Next.js rewrite (FE-23):
    - frontend (`next start`)
    - backend (`gunicorn config.wsgi`)
    - Celery worker and beat
    - Postgres and Redis

    Use `config.settings.prod` with `DEBUG=False`, `ALLOWED_HOSTS` set, `NUM_PROXIES` correct, and real
    email and Gemini keys. Run `python manage.py migrate` and `collectstatic` in the release step.
    Document it in `docs/deployment.md`.
  - **Prompt:** P-18

- [ ] **DEP-02 · P0 (guard rail) · Never expose `config.settings.dev` publicly**
  - **Problem:** the abandoned ngrok setup served `DEBUG=True`, `ALLOWED_HOSTS=["*"]`, CORS open to all
    origins with credentials, and auto-verified emails.
  - **Acceptable solution:** if a tunnel is needed for phone testing before deployment, use a
    `config/settings/demo.py` that imports `prod` and only relaxes HTTPS redirect and email
    (`console`). It never auto-verifies accounts.
  - **Prompt:** P-18

- [ ] **DEP-03 · P1 · There is no CI**
  - **Acceptable solution:** `.github/workflows/ci.yml` with Postgres and Redis service containers running
    `ruff check`, `pytest --cov=apps --cov-fail-under=90`, and frontend `npm ci && npx tsc --noEmit && npm run lint && npm run build`.
  - **Prompt:** P-19

## 8. Documentation (completed during this review — 2026-10-25)

- [x] **DOC-01** `architecture/04-flashcards.md` rewritten: manual flashcards, Decks, and AI generation that
  only appends (READY).
- [x] **DOC-02** `architecture/05-quiz.md` rewritten: quizzes from decks and the improved generation rules
  (READY).
- [x] **DOC-03** `architecture/adr/0003-manual-flashcards-and-decks.md` added.
- [x] **DOC-04** `architecture/00-overview.md`: real statuses, system map including Celery and the decks
  app, and the deployment topology.
- [x] **DOC-05** `architecture/01-authentication.md` (Google auto-link rule, link-building rule, URL names),
  `02-tasks.md` (reminders and timezone now in scope), `03-pdf-summary.md` (idempotency, retry, error
  messages, list payload), and the notification spec renamed to `06-notifications.md` with an
  implementation-status section.
- [x] **DOC-06** `PROJECT_GOAL.md` and `CLAUDE.md` updated; `docs/reviews/2026-10-08-backend-review.md`
  marked as superseded.
