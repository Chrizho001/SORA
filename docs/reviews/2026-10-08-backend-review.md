# Backend Review: 2026-10-08

**Scope:** everything in `backend/` at commit `8bb45b1` (auth, tasks, documents, flashcards, quizzes, notifications).
**Method:**
- Read all of the production code.
- Ran the test suite.
- Ran `ruff` and `pip-audit`.
- Wrote throwaway tests against the real code to confirm each serious finding. Findings marked **Confirmed** were reproduced.

**Baseline:** 121 tests pass · 96% coverage · `ruff check` reports 261 errors · `pip-audit` finds 85 known vulnerabilities (all in `pypdf` 4.3.1).
**Re-verified 2026-10-11:** 130 tests pass · 94% coverage · 0 dependency vulnerabilities · `ruff` 364 errors · 10 new findings. See [Re-verification](#re-verification-2026-10-11).

**Verdict:** the structure is reasonable and the suite is green, but the backend is **not production-ready**:
- It has an account-takeover vulnerability.
- Two security controls are ineffective: password change doesn't revoke sessions, and rate limiting can be bypassed.
- Core features (PDF summary, AI flashcards, push, scheduled notifications) can't work outside the test suite because their infrastructure was never configured.

## How to use this document
- Every finding has an ID (`SEC-1`, `PERF-2`, …), a location, evidence, a fix, and **the test to write first**.
  Following `CLAUDE.md`, write that test, watch it fail, then apply the fix.
- Tick the box when the fix is merged with its test.
- Work in the order given in [Fix order](#fix-order).

**Status legend:** ☑ verified fixed · ◐ partly fixed (what's left is noted) · ☐ open.
Statuses reflect the [re-verification on 2026-10-11](#re-verification-2026-10-11). Every ☑ was checked by re-running
the original probe against the code, not taken from the tick box.

## Summary

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| SEC-1 | 🔴 Critical | Account takeover via Google sign-in with an unverified email | ☑ |
| SEC-2 | 🔴 Critical | Password change doesn't revoke sessions; refresh sessions never expire | ☑ |
| SEC-3 | 🔴 Critical | Login/registration rate limiting bypassable via `X-Forwarded-For` | ☑ |
| OPS-1 | 🔴 Critical | Celery not configured, AI clients are stubs, push/scheduled notifications not wired | ◐ beat jobs broken (NEW-4, NEW-5); AI waits on API access; Redis missing from compose |
| SEC-4 | 🟠 High | SSRF through push-subscription endpoint URLs | ☑ |
| BUG-1 | 🟠 High | Google sign-in errors return 500 (wrong exception types, conflicts, races) | ☑ |
| SEC-5 | 🟠 High | PDF upload trusts `Content-Type`; vulnerable `pypdf`; no parsing limits | ☑ |
| SEC-6 | 🟠 High | Uploaded files land in the source tree and are never deleted | ☑ |
| DATA-1 | 🟠 High | Regenerating/deleting flashcards wipes quiz history | ☑ |
| SEC-7 | 🟠 High | Push notifications leak between users on a shared device | ☑ |
| BUG-2 | 🟡 Medium | Malformed query params / request bodies return 500 | ☑ |
| SEC-8 | 🟡 Medium | Internal exception text exposed to users | ☑ |
| SEC-9 | 🟡 Medium | Email addresses written to logs (PII, log injection) | ☑ |
| BUG-3 | 🟡 Medium | Race conditions and unlimited AI jobs (cost exposure) | ☑ |
| API-1 | 🟡 Medium | Inconsistent error envelope (`{"error": …}`) | ☑ |
| BUG-4 | 🟡 Medium | Notification-preference update creates junk rows | ☑ |
| SEC-10 | 🟡 Medium | Production settings are a stub | ☑ |
| PERF-1…8 | ⚡ | N+1 queries, heavy columns, unbounded tables, missing indexes | ◐ PERF-4 and PERF-7 done; the rest open |
| QUAL-1…7 | 🧹 | Lint, structure, error signalling, silent failures, leftovers | ◐ QUAL-3 done; ruff got worse (364) |
| TEST-1…5 | 🧪 | Test-suite blind spots | ◐ TEST-1 and TEST-5 done |
| SPEC-1…6 | 📋 | Drift between code and specs | ◐ SPEC-2 and SPEC-5 partly done |
| NEW-1…10 | 🆕 | Regressions and gaps found during re-verification | ☑ |

---

## 🔴 Critical

### SEC-1: Account takeover via Google sign-in (Confirmed) ☑
**Where:** `apps/accounts/services.py:190-206` (`login_with_google`) and `:211-216`

**Problem:** if a Google token's email matches an existing account, the code links Google to that account **without
checking `email_verified`**. An attacker can create a Google account using a victim's (e.g. university) email
address without verifying it, sign in with Google, and get the victim's account. New users are also created even when
`email_verified` is false.

**Evidence:** the probe sent claims with `email_verified: False` and `email: victim@uni.edu`, and got
`200, logged in as victim@uni.edu`.

**Fix:** reject unverified Google emails **before any lookup**. This is what the spec requires
(`401 google_email_unverified`, 01-authentication.md §4).
```python
# services.py — at the top of login_with_google, after verifying the token
if claims.get("email_verified") is not True:
    raise GoogleEmailUnverified()   # view maps to 401 google_email_unverified
```

**Test first:** `email_verified=False` gives 401 `google_email_unverified`, no `SocialAccount` is created, no user
is created, and the existing user is untouched.

---

### SEC-2: Password change doesn't revoke sessions; sessions never expire (Confirmed) ☑
**Where:** `apps/accounts/services.py:146-155` (`change_password`), `apps/accounts/views.py:207-216` (`TokenRefreshAPIView`)

**Problem 1:** `change_password` only updates `last_login`, which invalidates nothing. A stolen refresh token keeps
working after the victim changes their password. Spec 01 §4 requires blacklisting all outstanding refresh tokens
and issuing a new access token and cookie for the current session.

**Problem 2:** on every refresh, `RefreshToken.for_user(user)` issues a token with a **new 7-day lifetime**, so an
active (or stolen) session slides forever and never expires.

**Evidence:** after logging in and changing the password, refreshing with the pre-change cookie returned **200**.

**Fix:**
```python
# services.py — shared helper, also used by confirm_password_reset (see PERF-4)
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

def revoke_all_refresh_tokens(user) -> None:
    tokens = OutstandingToken.objects.filter(user=user, blacklistedtoken__isnull=True)
    BlacklistedToken.objects.bulk_create(
        [BlacklistedToken(token=t) for t in tokens], ignore_conflicts=True
    )

def change_password(user, new_password):
    with transaction.atomic():
        user.set_password(new_password)
        user.save(update_fields=["password", "updated_at"])
        revoke_all_refresh_tokens(user)
    # The view then issues a new RefreshToken, returns {"access": ...}, and sets the cookie.
```
To cap session age, carry the original login time across rotations and refuse refreshes after an absolute maximum:
```python
# at login / Google login
refresh = RefreshToken.for_user(user)
refresh["auth_time"] = int(time.time())

# in TokenRefreshAPIView, before rotating
auth_time = refresh.get("auth_time", refresh["iat"])
if time.time() - auth_time > settings.AUTH_MAX_SESSION_AGE:   # e.g. 30 days
    return 401 refresh_invalid
new_refresh = RefreshToken.for_user(user)
new_refresh["auth_time"] = auth_time
```

**Test first:**
1. After a password change, a pre-change refresh cookie gets 401 and the response carries a new cookie that works.
2. With freezegun past `AUTH_MAX_SESSION_AGE`, refresh gets 401 even though each rotation happened within 7 days.

---

### SEC-3: Rate limiting bypassable via `X-Forwarded-For` (Confirmed) ☑
**Where:** `config/settings/base.py:113-132` (`REST_FRAMEWORK`); no `CACHES` setting

**Problem 1:** `NUM_PROXIES` is unset, so DRF uses the **client-supplied** `X-Forwarded-For` header as the client's
identity. Changing the header on each request gives a fresh throttle bucket, so login, register, reset and Google
sign-in can all be brute-forced without limit.

**Problem 2:** with no `CACHES`, throttles use per-process `LocMemCache`. Each server worker counts separately, and
counters reset on restart.

**Evidence:** 8 wrong-password logins with rotating `X-Forwarded-For` all returned `401` (never `429`). From a fixed
IP, the 2nd attempt already returned `429`.

**Fix:**
```python
# base.py
REST_FRAMEWORK = {
    ...,
    # 0 = trust REMOTE_ADDR only. Set to the number of trusted proxies in prod (e.g. 1 behind nginx).
    "NUM_PROXIES": env.int("NUM_PROXIES", default=0),
}
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://localhost:6379/1"),
    }
}
```
Tests can keep LocMem by overriding `CACHES` in `test.py`.

**Test first:** 6 login attempts with 6 different `X-Forwarded-For` values from the same `REMOTE_ADDR`: the 6th gets 429.

---

### OPS-1: Core features can't work outside the tests ◐
> **2026-10-11:**
> - **Done:** the Celery app, broker settings, time limits, VAPID settings, `AI_API_KEY`, and the security notifications are emitted.
> - **Still open:**
>   - Both beat jobs are broken (NEW-4, NEW-5).
>   - Redis isn't in `docker-compose.yml`, although dev now needs it.
>   - Tasks are dispatched without `transaction.on_commit`.
> - **AI provider:** there is **no AI API access yet**, so PDF summaries and AI flashcards (and therefore quizzes from
>   AI cards) can't produce real output. Until access exists, the mock fallback is the intended development mode, but
>   it must be explicit (see NEW-6). This part is blocked on API access, not on code.
**Where:** `config/` (no `celery.py`), `apps/documents/ai.py:14`, `apps/flashcards/tasks.py:12`, `apps/notifications/tasks.py:26`

**Problems:**
1. **No Celery app or broker is configured.** There is no `config/celery.py` and no `CELERY_*` settings. `.delay()`
   falls back to `amqp://localhost` and fails at once (`OperationalError: Connection refused`, confirmed). A PDF upload
   saves the `Document` row and then returns 500, leaving the document stuck in `UPLOADED` forever. Tests patch
   `.delay` everywhere, so this never showed.
2. **The AI clients are stubs** that raise `NotImplementedError`, so every real document ends up `FAILED`.
   `ai_model_used="mock-model"` is hard-coded (`documents/tasks.py:51`).
3. **Push is never configured:** `VAPID_PRIVATE_KEY` and `VAPID_CLAIM_EMAIL` don't exist in settings, so pushes are skipped silently.
4. **No scheduler:** there is no Celery beat schedule, so `TASK_DUE_SOON` and `TASK_OVERDUE` are never sent.
   `SECURITY_NEW_LOGIN` and `SECURITY_PASSWORD_CHANGED` are defined but never emitted.

**Fix:**
```python
# config/celery.py
import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
app = Celery("study_assistant")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# config/__init__.py
from .celery import app as celery_app
__all__ = ("celery_app",)

# base.py
CELERY_BROKER_URL = env("REDIS_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = None              # results aren't used
CELERY_TASK_ACKS_LATE = True
CELERY_TASK_TIME_LIMIT = 300              # hard kill (see SEC-5)
CELERY_TASK_SOFT_TIME_LIMIT = 240
CELERY_BEAT_SCHEDULE = {
    "task-due-reminders": {"task": "apps.notifications.tasks.send_due_task_reminders", "schedule": 900},
    "flush-expired-tokens": {"task": "apps.accounts.tasks.flush_expired_tokens", "schedule": 86400},
}
VAPID_PRIVATE_KEY = env("VAPID_PRIVATE_KEY", default="")
VAPID_PUBLIC_KEY = env("VAPID_PUBLIC_KEY", default="")
VAPID_CLAIM_EMAIL = env("VAPID_CLAIM_EMAIL", default="")
AI_API_KEY = env("AI_API_KEY", default="")
```
- Dispatch tasks only after the row is committed: `transaction.on_commit(lambda: process_document.delay(str(doc.id)))`.
- Add Redis to `docker-compose.yml`, and document the worker and beat commands in `CLAUDE.md`/`00-overview.md`.
- Choose the AI provider (this is still an open question in `03-pdf-summary.md`). Implement `SummarizerClient` and
  `FlashcardGeneratorClient` against it, record the real model name, and keep tests on a fake.
- Emit the security notifications from the login, password-change and password-reset services.

**Test first:**
- An upload test that runs the task with `CELERY_TASK_ALWAYS_EAGER` and a fake AI client ends with `status=DONE`.
- A beat-task test: a task due within the window creates exactly one `TASK_DUE_SOON` notification (idempotent on re-run).

---

## 🟠 High

### SEC-4: SSRF through push-subscription endpoints (Confirmed) ☑
> **2026-10-11:** verified. An internal URL now gets `400`. `webpush(..., timeout=10)` is added.
**Where:** `apps/notifications/serializers.py:10-29`, `apps/notifications/tasks.py:43-48`

**Problem:** any URL is accepted as a push endpoint, and the Celery worker POSTs to it. A user can make the server send
requests to internal services such as cloud metadata (`169.254.169.254`), Redis, or the database host. `webpush()` has no
`timeout` either, so a slow endpoint can hang a worker indefinitely.

**Evidence:** `endpoint: http://169.254.169.254/latest/meta-data/` was accepted with `201`.

**Fix:**
```python
# serializers.py
from urllib.parse import urlparse

PUSH_HOSTS = {"fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"}
PUSH_HOST_SUFFIXES = (".notify.windows.com", ".push.apple.com")

def validate_endpoint(self, value):
    url = urlparse(value)
    host = (url.hostname or "").lower()
    if url.scheme != "https" or not (host in PUSH_HOSTS or host.endswith(PUSH_HOST_SUFFIXES)):
        raise serializers.ValidationError("Unsupported push service.", code="invalid_push_endpoint")
    return value

# tasks.py
webpush(..., timeout=10)
```

**Test first:** an `http://` endpoint, an IP-address endpoint and an unknown host all get 400
`invalid_push_endpoint`. A `https://fcm.googleapis.com/...` endpoint gets 201.

---

### BUG-1: Google sign-in errors return 500 (Confirmed) ☑
> **2026-10-11:**
> - **Verified:** invalid token → `401`, Google unreachable → `503`, conflicting `sub` → `409`.
> - **Verified (Update):**
>   - Nested `transaction.atomic()` savepoint resolves race conditions without 500 `TransactionManagementError` (NEW-3).
>   - `SocialAccount.email`, whitelisted `extra_data` claims, and `last_login_at` are populated on registration/linking and updated on subsequent logins.
>   - Tests directly patch `google.oauth2.id_token.verify_oauth2_token` so wrapper error translation is exercised (TEST-1).
**Where:** `apps/accounts/services.py:166-223`, `apps/accounts/views.py:317-325`, `apps/accounts/tests/test_api_google.py:56`

**Problems:**
1. `verify_google_id_token` raises `GoogleTokenInvalid` / `GoogleUnavailable`, but `login_with_google` catches
   `ValueError`. **Every invalid token is a 500**, and so is Google being unreachable (the spec wants 503).
   The test hides this because its fake raises `ValueError`, which the real wrapper never raises.
2. A user whose account is already linked to a *different* Google `sub` hits the `(user, provider)` unique constraint,
   giving an `IntegrityError` and a **500** instead of `409 account_conflict`.
3. Creating the user and the `SocialAccount` isn't wrapped in `transaction.atomic()`, so concurrent first logins can
   race and 500. A failure halfway leaves a user with no link.
4. `SocialAccount.email`, `extra_data` and `last_login_at` are never set.

**Fix:** replace `ValueError("code")` strings with typed exceptions (see QUAL-3) and map each one in the view:

| Exception | Response |
|-----------|----------|
| `GoogleTokenInvalid` | 401 `google_token_invalid` |
| `GoogleEmailUnverified` | 401 `google_email_unverified` |
| `GoogleUnavailable` | 503 `google_unavailable` |
| `AccountConflict` | 409 `account_conflict` |

Wrap the resolution in `transaction.atomic()`, and use `get_or_create` / catch `IntegrityError` to re-read on a race.
Fix the test to patch `google.oauth2.id_token.verify_oauth2_token` (raising `ValueError`) so the real wrapper runs.

**Test first:** an invalid token gets 401, a transport error gets 503, a different `sub` for a linked user gets 409,
and none of them produce a 500.

---

### SEC-5: PDF upload validation and parsing ☑
> **2026-10-11:**
> - **Verified:**
>   - A fake PDF gets `400`.
>   - `pypdf` 6.19.0 is installed and `pip-audit -r requirements/base.txt` reports no vulnerabilities.
>   - There is a 50-page cap and Celery time limits.
>   - Extracted text is capped at `DOCUMENT_MAX_CHARS` (default 100,000) and built with `"\n".join(...)`.
>   - `pypdf>=6.19,<7.0` is pinned in `requirements/base.txt`.
>   - `pip-audit>=2.7,<3.0` added to `requirements/dev.txt`.
**Where:** `apps/documents/serializers.py:49-57`, `apps/documents/tasks.py:24-40`, `requirements/base.txt:23`

**Problems:**
1. Only the client-supplied `Content-Type` is checked. Arbitrary bytes labelled `application/pdf` are stored
   (confirmed: `202` for a text file).
2. `pypdf` 4.3.1 has **85 known vulnerabilities** (pip-audit), many of them resource-exhaustion bugs triggered by
   crafted PDFs. The `<5.0` pin blocks the fixes.
3. There is no page cap, no cap on extracted text, and no task time limit. One malicious PDF can occupy a worker
   indefinitely and store huge text blobs.

**Fix:**
```python
# serializers.py
MAX_PDF_BYTES = 10 * 1024 * 1024

def validate_file(self, value):
    if value.size > MAX_PDF_BYTES:
        raise serializers.ValidationError("File size cannot exceed 10MB.", code="file_too_large")
    head = value.read(5)
    value.seek(0)
    if head != b"%PDF-":
        raise serializers.ValidationError("Only PDF files are allowed.", code="invalid_file_type")
    return value
```
```text
# requirements/base.txt
pypdf>=6.19,<7.0
```
- In the task: reject `len(pdf.pages) > settings.DOCUMENT_MAX_PAGES` (e.g. 100), and stop extracting once the text
  passes `DOCUMENT_MAX_CHARS`.
- Build the text with `"\n".join(parts)` instead of `+=`.
- Rely on the Celery time limits from OPS-1.
- Add `pip-audit` to `dev.txt` and run it in CI.

**Test first:** a non-PDF with a PDF content type gets 400 `invalid_file_type`. A 101-page PDF ends `FAILED` with a
"too many pages" message.

---

### SEC-6: Uploaded files land in the source tree and are never deleted ☑
> **2026-10-11:** verified. `MEDIA_ROOT` is set, the file is deleted on commit, tests use `tmp_path`, `backend/documents/` is gone, and a full test run leaves no files behind.
**Where:** `config/settings/base.py` (no `MEDIA_ROOT`), `apps/documents/models.py:20`, `apps/documents/views.py` (destroy)

**Problems:**
1. With no `MEDIA_ROOT`, files are written relative to the working directory. **`backend/documents/` already holds
   152 PDFs created by test runs** (about 17 more per run). The folder isn't git-ignored, so it's one `git add .` away
   from being committed.
2. Deleting a `Document` deletes the row but **not the file**. That's a privacy problem (the user believes their file
   is gone) and storage leaks over time.

**Fix:**
```python
# base.py
MEDIA_ROOT = env("MEDIA_ROOT", default=str(BASE_DIR / "media"))   # media/ is already git-ignored

# conftest.py
@pytest.fixture(autouse=True)
def _media_root(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path / "media"

# documents/views.py
def perform_destroy(self, instance):
    file = instance.file
    instance.delete()
    transaction.on_commit(lambda: file.delete(save=False))
```
- Delete `backend/documents/`.
- Never serve `MEDIA_ROOT` publicly; documents are private. Keep `file` out of serializers, as it is now.

**Test first:** deleting a document removes its file from storage. After the suite runs, nothing has been written
outside `tmp_path`.

---

### DATA-1: Regenerating or deleting flashcards wipes quiz history (Confirmed) ☑
> **2026-10-11:** verified. Questions survive flashcard deletion: `question_text`/`correct_answer` are snapshotted, the FK uses `SET_NULL`, and there is a backfill migration.
**Where:** `apps/quizzes/models.py:28`, `apps/flashcards/tasks.py:34`, flashcard `DestroyModelMixin`

**Problem:** `QuizQuestion.flashcard` uses `on_delete=CASCADE`. Regenerating flashcards deletes every card for the
document, which **deletes the questions of all past quiz sessions**. Sessions keep their score but lose the questions
behind it. Deleting one flashcard through the API does the same.

**Evidence:** after a regenerate, the session still showed score `1/1` with `questions left: 0`.

**Fix:** snapshot the question when the quiz is created, so history doesn't depend on mutable flashcards:
```python
class QuizQuestion(models.Model):
    flashcard = models.ForeignKey(Flashcard, null=True, on_delete=models.SET_NULL)
    question_text = models.TextField()
    correct_answer = models.TextField()
    ...
```
Grade against `correct_answer`. Write a data migration that backfills the snapshot from the existing flashcards.

**Test first:** after `Flashcard.objects.filter(document=d).delete()`, a finished session still returns all its
questions with their selected choices and correctness.

---

### SEC-7: Push notifications leak between users on a shared device (Confirmed) ☑
> **2026-10-11:** **Verified:** a second user subscribing with the same endpoint gets `201`, and the subscription moves to them.
> **Verified (Update):** `LogoutAPIView` accepts optional `push_endpoint` and revokes matching active subscription (`revoked_at=timezone.now()`). Tested in `apps/accounts/tests/test_api_logout.py`.
**Where:** `apps/notifications/serializers.py:16-29`, `apps/accounts/views.py` (`LogoutAPIView`)

**Problem:** logging out doesn't revoke the browser's push subscription. If user A logs out and user B logs in on the
same browser, **A's notifications (quiz scores, document names) still arrive on B's screen**. B can't subscribe at all:
`endpoint` is globally unique and the lookup uses `(user, endpoint)`, so B gets `400` (confirmed).

**Fix:**
- Look the endpoint up on its own and reassign it to the current user:
  ```python
  class Meta:
      extra_kwargs = {"endpoint": {"validators": []}}   # drop the auto UniqueValidator

  def create(self, validated_data):
      sub, _ = PushSubscription.objects.update_or_create(
          endpoint=validated_data["endpoint"],
          defaults={**validated_data, "user": self.context["request"].user, "revoked_at": None},
      )
      return sub
  ```
- Revoke on logout. The PWA unsubscribes and calls `DELETE /push-subscriptions/{id}/` before `POST /auth/logout/`.
  As a backstop, let logout accept an optional `push_endpoint` and revoke it.

**Test first:** user B subscribing with A's endpoint gets 201, and the subscription now belongs to B. A notification
for A is not sent to that endpoint.

---

## 🟡 Medium

### BUG-2: Malformed input returns 500 (Confirmed) ◐
> **2026-10-11:** **Verified:** all four bad query params get `400`, and malformed quiz bodies get `400`.
> **Regression:** the quiz session is marked finished *before* the body is validated, so one malformed submit
> locks the quiz forever (NEW-1).
**Where:** `apps/tasks/views.py:12-38`, `apps/flashcards/views.py:18-20`, `apps/quizzes/views.py:27-42`

**Evidence (each one returned 500):**
- `?priority=abc`, `?date=notadate`, `?from=yesterday` on `/tasks/`
- `?document=not-a-uuid` on `/flashcards/`
- `{"answers": "abc"}`, `{"answers": [1, 2]}`, `{"answers": {"a": 1}}` sent to quiz submit

**Fix:** validate every query string and request body with a serializer, so bad input becomes a 400 envelope.
```python
# tasks/serializers.py
class TaskQuerySerializer(serializers.Serializer):
    is_completed = serializers.BooleanField(required=False)
    priority = serializers.ChoiceField(choices=Task.Priority.choices, required=False)
    date = serializers.DateField(required=False)

    def get_fields(self):                      # "from" is a Python keyword
        fields = super().get_fields()
        fields["from"] = serializers.DateTimeField(required=False)
        fields["to"] = serializers.DateTimeField(required=False)
        return fields

# quizzes/serializers.py
class AnswerSerializer(serializers.Serializer):
    question_id = serializers.UUIDField()
    selected_choice = serializers.CharField(max_length=2000, allow_blank=True)

class SubmitQuizSerializer(serializers.Serializer):
    answers = AnswerSerializer(many=True, max_length=500)
```
For the flashcards `?document=` param, validate it with `serializers.UUIDField().to_internal_value(...)` (or the same
query-serializer pattern). Use `django-filter` if the filters grow.

**Test first:** each input listed above gets 400 `validation_error`.

---

### SEC-8: Internal exception text exposed to users ☑
> **2026-10-11:** verified. Unexpected errors store a generic message and are logged with `logger.exception`. (Notifying on known failures regressed; see NEW-10.)
**Where:** `apps/documents/tasks.py:66-69`

**Problem:** `error_message = str(e)` is returned by the API. Once a real AI provider is wired in, its error strings
(URLs, request IDs, sometimes partial keys) and filesystem paths will reach users.

**Fix:** raise a typed `DocumentProcessingError(user_message)` for the known cases (encrypted, image-only, too many
pages). For anything else, store a generic "We couldn't process this PDF. Please try again." and
`logger.exception(...)` the real error.

**Test first:** when the summariser raises `RuntimeError("secret internal detail")`, `error_message` doesn't contain it.

---

### SEC-9: Email addresses in logs ☑
> **2026-10-11:** verified. Login failures log `user_id` or nothing identifying.
**Where:** `apps/accounts/services.py:132, 136, 140`

**Problem:** failed and unverified login attempts log the raw email. This breaks the project's own logging rule
(`base.py:211`). `LoginSerializer.email` is a plain `CharField`, so a value containing newlines can also forge log lines.

**Fix:** log `user_id` when a user exists, and nothing identifying when one doesn't. The throttle and the request log
already record the IP. Example: `logger.warning("Failed login attempt")`.

---

### BUG-3: Race conditions and unlimited AI jobs ☑
> **2026-10-11:**
> - **Done:** an atomic claim for generate-flashcards (second call → `409`), the `ai_jobs` throttle, the
>   registration `IntegrityError` → `400`, the atomic quiz claim, and the `PENDING` → `NOT_STARTED` rename.
> - **Verified (Update):**
>   - Reset status if queuing raises, and allow reclaiming `GENERATING` older than ~10 minutes via `flashcard_generation_started_at` (NEW-8).
>   - Created documents schema and data migration 0003 for `PENDING` → `NOT_STARTED` (NEW-7).
>   - Moved quiz submit to `apps/quizzes/services.py`, validating before atomic claim (NEW-1).
**Where:** `apps/documents/views.py:33-50`, `apps/quizzes/views.py:20-49`, `apps/accounts/serializers.py:57-61`

**Problems:**
1. `generate_flashcards` queues the task **before** setting `PENDING`, so the view can overwrite the worker's
   `GENERATING` or `DONE`.
2. There is no duplicate-job guard and no throttle on AI endpoints, so a user can trigger unlimited AI calls, which you pay for.
3. Concurrent quiz submits can both pass the `finished_at` check.
4. Registration checks `exists()` and then creates, so a concurrent duplicate gets an `IntegrityError` and a 500.

**Fix:**
```python
# Claim the job atomically; refuse if one is already running.
claimed = Document.objects.filter(pk=doc.pk).exclude(
    flashcard_generation_status=Document.FlashcardGenerationStatus.GENERATING
).update(flashcard_generation_status=Document.FlashcardGenerationStatus.GENERATING)
if not claimed:
    raise Conflict("Flashcards are already being generated.", code="generation_in_progress")
transaction.on_commit(lambda: generate_flashcards_task.delay(str(doc.pk)))

# Quiz submit: claim the session atomically.
if not QuizSession.objects.filter(pk=session.pk, finished_at__isnull=True).update(finished_at=now):
    raise Conflict("Quiz session already finished.", code="quiz_already_finished")
```
- Add a `throttle_scope = "ai_jobs"` (e.g. `"20/day"`) to upload and generate-flashcards.
- In registration, catch `IntegrityError` and return the duplicate-email 400.
- Rename `PENDING` to `NOT_STARTED`; it currently means "never generated", which reads like "queued".

**Test first:** calling generate-flashcards twice queues only one task, and the second call gets 409. A second submit gets 409.

---

### API-1: Inconsistent error envelope ☑
> **2026-10-11:** generate-flashcards, quiz submit and notification preferences now use the envelope.
> **Verified (Update):** `start-quiz` logic moved to `apps.quizzes.services.start_quiz`, raising standard `ValidationError` ({detail, code, errors}) when flashcards < 4. Tested in `apps/quizzes/tests/test_api_quizzes.py`.
**Where:** `apps/documents/views.py:39, 60`, `apps/quizzes/views.py:25`, `apps/notifications/views.py:59`

**Problem:** these return `{"error": "..."}`, bypassing the `{detail, code, errors?}` envelope, so the PWA can't
handle errors uniformly.

**Fix:** raise DRF exceptions and let `config/exceptions.py` format them:
`raise ValidationError({"document": ["Summary must be completed first."]}, code="summary_not_ready")`. Add a small
`Conflict(APIException)` with `status_code = 409`.

**Test first:** each of those paths returns `detail` and `code` keys and no `error` key.

---

### BUG-4: Notification-preference update creates junk rows (Confirmed) ☑
> **2026-10-11:** verified. An invalid type gets `400` and creates 0 rows.
**Where:** `apps/notifications/views.py:55-68`

**Problem:** `get_or_create` runs **before** validation. An invalid `notification_type` returns 400 but leaves a row behind.

**Fix:** validate first, then `update_or_create(user=..., notification_type=validated["notification_type"], defaults=...)`.

**Test first:** an invalid type gets 400 and no row is created.

---

### SEC-10: Production settings are a stub ☑
> **2026-10-11:** verified. `check --deploy` with prod settings is clean apart from the optional `SECURE_HSTS_PRELOAD`
> warning. The fallback DB credentials are removed and `ADMIN_URL` is env-driven. (Minor: `config/urls.py` creates its
> own `environ.Env()`. Read `ADMIN_URL` in settings instead.)
**Where:** `config/settings/prod.py`, `config/settings/base.py:82`

**Fix:**
```python
# prod.py
DEBUG = False
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = [FRONTEND_URL]
AUTH_COOKIE_SECURE = True
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"   # + EMAIL_HOST etc. from env
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL")
```
- Remove the hard-coded fallback credentials in `base.py:82` (`env.db("DATABASE_URL")` with no default), so a missing
  variable fails loudly.
- Move the admin to an unguessable path (`env("ADMIN_URL")`).
- Run `python manage.py check --deploy --settings=config.settings.prod` in CI and keep it clean.

---

## ⚡ Performance

| ID | Finding | Evidence | Fix | ☐ |
|----|---------|----------|-----|---|
| PERF-1 | **Quiz sessions list has an N+1.** Every session embeds every question, and every question loads its flashcard | 33 queries for 5 sessions, **123 for 20** (unchanged on 2026-10-11) | `prefetch_related(Prefetch("questions", queryset=QuizQuestion.objects.select_related("flashcard")))`. Better: a `QuizSessionListSerializer` without `questions`, used for `list` | ☐ |
| PERF-2 | **Documents list has an N+1** (one summary query per row) | 8 queries for 5 docs, **23 for 20** (unchanged on 2026-10-11) | `Document.objects.filter(user=...).select_related("summary")` | ☐ |
| PERF-3 | Documents list loads `extracted_text` (can be MBs per PDF) for every row but never returns it | the probe used 200 KB per row; still selected on 2026-10-11 | `.defer("extracted_text")` in `get_queryset` | ☐ |
| PERF-4 | Password reset revokes tokens in a loop, 2 queries per token | `services.py:293-295` | use `revoke_all_refresh_tokens` from SEC-2 (one query plus one bulk insert) | ☑ |
| PERF-5 | `OutstandingToken` grows without limit (a row per login and per refresh, about every 15 min while active); notifications are never cleaned up (`expires_at` unused) | 2026-10-11: beat entry added, but its task module doesn't exist (NEW-5) | daily beat tasks: `call_command("flushexpiredtokens")` and deleting read notifications older than N days or past `expires_at` | ☐ |
| PERF-6 | Indexes don't match the list queries (filter by owner, sort by `-created_at`) | `Notification`, `QuizSession` | `models.Index(fields=["recipient", "-created_at"])`, `models.Index(fields=["user", "-created_at"])` | ☐ |
| PERF-7 | Duplicate unique index on `User.email` (`unique=True` plus the `Lower("email")` constraint) | `accounts/models.py:35-89` | keep one; emails are always stored lower-cased | ☑ |
| PERF-8 | The whole PDF text goes to the AI in one call; push sends `save()` once per subscription | `documents/tasks.py:44`, `notifications/tasks.py:50` | cap or chunk the AI input (cost, token limits); collect `last_used_at` updates and `bulk_update` | ☐ |

**Guard against regressions:** add `django_assert_max_num_queries` tests for every list endpoint with 20+ rows, so any
N+1 that comes back fails the build.

---

## 🧹 Code quality

| ID | Finding | Fix | ☐ |
|----|---------|-----|---|
| QUAL-1 | `ruff check` reports **261 errors** (116 long lines, 64 whitespace, 46 import order, 13 unused imports, 5 imports not at top, 3 unused variables). The definition of done requires a clean run. **2026-10-11: up to 364 errors** | `ruff check . --fix && ruff format .`, then fix the rest by hand. Add ruff to CI / pre-commit | ☐ |
| QUAL-2 | `accounts/views.py`: imports inside almost every method, a stray `import rest_framework` mid-module (line 141), imports inside class bodies (lines 253, 276), exception classes defined inside request handlers (lines 64, 378). **2026-10-11:** the new code adds more in-function imports (`import time` inside views, repeated notification imports) | move imports to the top; define exceptions in `apps/accounts/exceptions.py` | ☐ |
| QUAL-3 | Services signal errors with `ValueError("some_code")` strings, and views compare `str(e)`. This is fragile and caused BUG-1. **2026-10-11: done** (`apps/accounts/exceptions.py`). Consider moving `ConflictError`/`ServiceUnavailable` to a shared module such as `config/exceptions.py`, since other apps import them from `accounts` | typed exceptions (`class AuthError(Exception)`, `InvalidCredentials`, `EmailNotVerified`, `GoogleTokenInvalid`, …) with a `code` attribute, mapped to HTTP responses in one place | ☑ |
| QUAL-4 | Business logic in views: quiz creation in `documents/views.py:52-92`, grading in `quizzes/views.py:20-49`. Only `accounts` has a `services.py`, which goes against CLAUDE.md | `apps/quizzes/services.py` with `start_quiz(user, document)` and `submit_quiz(session, answers)`; same pattern for documents and flashcards | ☐ |
| QUAL-5 | Silent failures: `flashcards/tasks.py:61-63` swallows exceptions (no log, no message, no notification); neither Celery task logs anything or has retries; `notifications` logs with f-strings; quizzes builds a logger inside `except` | module-level `logger = logging.getLogger(__name__)`; `logger.exception(...)` in task error paths; notify on flashcard failure; `autoretry_for` on transient AI/network errors | ☐ |
| QUAL-6 | Leftovers: empty `tests.py` in five apps (shadowing the `tests/` package name); empty `admin.py` in five apps (no admin for documents, tasks, quizzes, notifications); `demo_flow.py` deletes users in whichever DB `DATABASE_URL` points to (your dev DB). **2026-10-11:** also the untracked `backend/debug_tasks.py`, `backend/debug_tasks2.py`, and a root `Code_Review.md` that differs from this document | delete the empty `tests.py` files; register admins with `list_select_related`; move `demo_flow.py` to `scripts/` behind a guard, or delete it; delete the debug scripts; keep one canonical review (this file) | ☐ |
| QUAL-7 | `pywebpush` is unpinned and there's no lock file, so installs aren't reproducible | pin all dependencies; use `pip-tools` (`requirements/*.in` → `*.txt`) | ☐ |

---

## 🧪 Test suite

| ID | Finding | Fix | ☐ |
| TEST-1 | Fakes raise the wrong exception types (the Google test raises `ValueError`, which hides BUG-1). **2026-10-11: done** (`google.oauth2.id_token.verify_oauth2_token` patched in `test_api_google.py`) | patch the lowest third-party call (`verify_oauth2_token`) so the wrapper's own error mapping is tested | ☑ |
| TEST-2 | `.delay` is always patched, so the missing Celery config (OPS-1) never surfaced. **2026-10-11:** no eager integration tests, which is why NEW-4/NEW-5 went unnoticed | one integration test per task using `CELERY_TASK_ALWAYS_EAGER=True` with fake AI clients; one test that calls each beat task directly | ☐ |
| TEST-3 | `notifications/tasks.py` has 27% coverage (push path untested). **2026-10-11: 25%** | patch `pywebpush.webpush`; test success, the 404/410 revoke path, and timeouts | ☐ |
| TEST-4 | Nothing checks query counts | `django_assert_max_num_queries` on every list endpoint (see PERF) | ☐ |
| TEST-5 | Tests write real files into the repo (SEC-6). **2026-10-11: done** | autouse `MEDIA_ROOT = tmp_path` fixture | ☑ |

---

## 📋 Differences between code and specs

| ID | Spec says | Code does | ☐ |
|----|-----------|-----------|---|
| SPEC-1 | `POST /auth/google/` takes `credential`; returns `201` with `created: true` for new users; 409/503 errors; sets `SocialAccount.email/extra_data/last_login_at` | takes `token`; always 200; none of the 409/503 cases; those fields left unset | ☐ |
| SPEC-2 | `POST /auth/password-change/` with `new_password`/`new_password_confirm`; returns new `access` and cookie; `400 password_not_set` for Google-only users | lives at `password/change/` with `password`/`password_confirm`; Google-only users get "Incorrect old password". **2026-10-11:** new `access` and cookie are now returned; path, field names and `password_not_set` still differ | ◐ |
| SPEC-3 | `GET/PATCH /auth/me/` | GET only | ☐ |
| SPEC-4 | SRS §3.5: create and edit flashcards, view by subject | no create endpoint, no subjects (cards only exist via AI generation). **2026-10-11:** with no AI API yet, manual flashcard creation is the only way to get cards (and therefore quizzes) with real content, so this is now more important | ☐ |
| SPEC-5 | Security notifications (new login, password changed) | **2026-10-11:** emitted for password login, change and reset, but sent twice per login (NEW-2) and not for normal Google logins | ◐ |
| SPEC-6 | Specs named `NN-name.md` and tracked in git | `architecture/notification_system_architecture_specification.md` is untracked and doesn't follow the convention | ☐ |

For each item: decide whether the **spec** or the **code** is right, update the spec first (CLAUDE.md workflow), then fix the code.

---

## Re-verification: 2026-10-11

**Method:**
- Read the full diff since `8bb45b1`.
- Re-ran every original probe and added new probes for the changes.
- Ran the suite, `makemigrations --check`, `ruff`, `pip-audit` and `check --deploy` (prod settings).

| Check | Result |
|-------|--------|
| `pytest` | ✅ 130 passed, 94% coverage |
| `pip-audit -r requirements/base.txt` | ✅ no known vulnerabilities (`pypdf` 6.19.0). The dev venv still has old `pip` 24.0 and `pytest` 8.4.2 with advisories: upgrade |
| `check --deploy` (prod) | ✅ only the optional `SECURE_HSTS_PRELOAD` warning |
| `makemigrations --check` | ❌ missing `documents` migration (NEW-7) |
| `ruff check` | ❌ 364 errors (was 261) |

**Context: no AI API yet.** The project has no AI API access at the moment, so real PDF summaries and AI-generated
flashcards and quizzes can't be produced. Features that depend on AI are verified only against the mock/fake clients.
Real AI integration is **blocked on API access, not on code**. Until then, keep the mock path explicit (NEW-6). Manual
flashcard creation (SPEC-4) becomes the only way to get real quiz content, so it has moved up in priority.

### New findings

| ID | Severity | Finding | Evidence | Fix | ☐ |
|----|----------|---------|----------|-----|---|
| NEW-1 | 🟠 High | **A malformed quiz submit locks the quiz forever.** `quizzes/views.py:27` claims the session (`finished_at = now`) *before* validating the body | a bad body got `400`, then a valid submit got `409`; the session stayed finished with `score: None` | validate with `SubmitQuizSerializer` first, then do the atomic claim. Better: move it into `quizzes/services.py` inside `transaction.atomic()` | ☑ |
| NEW-2 | 🟡 Medium | **Two "New login" notifications per login.** The `NotificationService.notify(...)` block is pasted twice in `authenticate_user`. Normal Google logins send none (only the race path does) | the probe counted 2 per password login | delete the duplicate; emit one notification from a shared `issue_login_tokens(user)` helper used by password **and** Google login | ☑ |
| NEW-3 | 🟠 High | **The Google race path returns 500.** After the `IntegrityError` on `user.save()`, the code keeps querying inside the same broken `atomic()` block | simulated race → `500 TransactionManagementError` | wrap the insert in a nested `with transaction.atomic():` (savepoint), and re-read after it exits | ☑ |
| NEW-4 | 🟠 High | **The task-reminder beat job crashes on every run:** `NotificationType.TASK_REMINDER` doesn't exist. It also doesn't deduplicate (a task can be reminded twice or missed at window edges), has an N+1 on `task.user`, and uses `timezone.timedelta` (works only by accident) | `AttributeError: type object 'NotificationType' has no attribute 'TASK_REMINDER'` | use `TASK_DUE_SOON`; add `Task.reminder_sent_at` and filter on it; `select_related("user")`; `from datetime import timedelta` | ☑ |
| NEW-5 | 🟡 Medium | **The token-cleanup beat job points to a missing module:** `apps.accounts.tasks.flush_expired_tokens` | `ModuleNotFoundError: apps.accounts.tasks` | create `apps/accounts/tasks.py` with a `@shared_task` that calls `call_command("flushexpiredtokens")` | ☑ |
| NEW-6 | 🟡 Medium | **The AI clients fake their output silently.** With no `AI_API_KEY`, both clients return mock text ("Mock summary because AI_API_KEY is not set.") even in production, and `ai_model_used` records `gpt-4o-mini` for mock output. The flashcard client returns a dict as-is if the AI uses any key other than `flashcards` (e.g. `{"cards": [...]}`), and turns unparseable output into a junk card ("Failed to parse AI output.") | probe output | add `AI_PROVIDER = env("AI_PROVIDER", default="mock")`. Use a `MockSummarizer` only when `AI_PROVIDER == "mock"`, and refuse `mock` in prod settings; record `ai_model_used="mock"`. Validate the AI response (a list of 1–N `{question, answer}` strings) and raise `DocumentProcessingError` otherwise; never save junk cards | ☑ |
| NEW-7 | 🟡 Medium | **Missing migration:** `PENDING` → `NOT_STARTED` was renamed with no `documents` migration, and existing rows still hold `"PENDING"` | `makemigrations --check` fails | `makemigrations documents`, plus a `RunPython` that updates `PENDING` to `NOT_STARTED`. Add `makemigrations --check` to CI | ☑ |
| NEW-8 | 🟡 Medium | **Flashcard generation can get stuck forever.** If `.delay()` fails or the worker is killed by the time limit, the status stays `GENERATING` and every retry gets `409` | broker down → `500`, status left at `GENERATING`, retry → `409` | reset the status if queuing raises; in the claim, also accept `GENERATING` older than ~10 minutes (track `flashcard_generation_started_at`) | ☑ |
| NEW-9 | 🟡 Medium | **The test suite publishes real Celery messages to the local Redis broker.** `test.py` doesn't make Celery eager, and login now calls `send_web_push_task.delay` | the `celery` queue grew from 85 to 98 during `pytest apps/accounts`; tests fail if Redis is down, and a running dev worker would execute them | `test.py`: `CELERY_TASK_ALWAYS_EAGER = True`, `CELERY_TASK_EAGER_PROPAGATES = True`, `CELERY_BROKER_URL = "memory://"`. Flush the stale messages: `redis-cli -n 0 del celery` | ☑ |
| NEW-10 | 🟡 Medium | **Known PDF failures no longer notify the user.** The `PDF_SUMMARY_FAILED` notification now lives only in the generic `except Exception` branch, so encrypted, too-long and image-only PDFs fail silently | an encrypted PDF → `FAILED`, notified: `False` | notify in a `finally`-style helper called from both failure branches | ☑ |

> **2026-10-11:**
> - **NEW-1 Verified:** Moved quiz submission to `apps/quizzes/services.py:submit_quiz`, validating with `SubmitQuizSerializer` before atomic session claim. Verified in `apps/quizzes/tests/test_api_quizzes.py` (`test_submit_malformed_body_does_not_lock_session`).
> - **NEW-2 Verified:** Shared `issue_login_tokens(user)` helper in `apps/accounts/services.py` emits exactly one `SECURITY_NEW_LOGIN` notification for password and Google logins. Verified in `apps/accounts/tests/test_api_login.py` (`test_login_emits_exactly_one_security_notification`) and `apps/accounts/tests/test_api_google.py` (`test_google_login_emits_single_notification`).
> - **NEW-3 Verified:** Nested `transaction.atomic()` savepoint handles concurrent Google registration races cleanly without `TransactionManagementError`. Verified in `apps/accounts/tests/test_api_google.py` (`test_google_login_race_handled_gracefully`).
> - **NEW-4 Verified:** `send_due_task_reminders` in `apps/notifications/tasks.py` uses `NotificationType.TASK_DUE_SOON`, deduplicates using `Task.reminder_sent_at`, optimizes queries with `select_related("user")`, and imports `timedelta` from `datetime`. Verified in `apps/notifications/tests/test_tasks.py`.
> - **NEW-5 Verified:** Created `apps/accounts/tasks.py` with `@shared_task` `flush_expired_tokens` delegating to `call_command("flushexpiredtokens")`. Verified in `apps/accounts/tests/test_tasks.py`.
> - **NEW-6 Verified:** Added `AI_PROVIDER = env("AI_PROVIDER", default="mock")`. Dedicated `MockSummarizer` and `MockFlashcardGenerator` record `ai_model_used="mock"`. `prod.py` raises `ImproperlyConfigured` if `AI_PROVIDER == "mock"`. Silent fake fallback removed (raises `DocumentProcessingError`). AI flashcard output validated (rejects junk / non-empty `{question, answer}`). Verified in `apps/documents/tests/test_ai.py` and `apps/flashcards/tests/test_ai.py`.
> - **NEW-7 Verified:** Generated schema and data migration `apps/documents/migrations/0003_alter_document_flashcard_generation_status.py` migrating `PENDING` to `NOT_STARTED`. `python manage.py makemigrations --check --dry-run` reports no changes. Verified in `apps/documents/tests/test_migrations.py`.
> - **NEW-8 Verified:** `generate_flashcards` resets document status on Celery enqueue failure, and allows reclaiming `GENERATING` status older than 10 minutes via `flashcard_generation_started_at`. Verified in `apps/flashcards/tests/test_api_flashcards.py`.
> - **NEW-9 Verified:** Configured `CELERY_TASK_ALWAYS_EAGER = True`, `CELERY_TASK_EAGER_PROPAGATES = True`, and `CELERY_BROKER_URL = "memory://"` in `config/settings/test.py`. Added `redis` service to `docker-compose.yml`. Test suite runs and passes completely with Redis offline (`REDIS_URL="redis://localhost:9999/0"`).
> - **NEW-10 Verified:** Extracted failure notification into `_notify_failure(document)` in `apps/documents/tasks.py`, called from both `DocumentProcessingError` (encrypted, page cap exceeded, no text) and unexpected `Exception` handlers. Verified in `apps/documents/tests/test_tasks.py`.

## Fix order
*(Revised 2026-10-11)*

1. **Regressions from the fixes:** NEW-1, NEW-3, NEW-4, NEW-2, NEW-10, NEW-5.
2. **Make the repo consistent:** NEW-7 (migration), NEW-9 (eager Celery in tests), add Redis to `docker-compose.yml`.
3. **Finish partial fixes:** NEW-8 / BUG-3, SEC-7 (revoke on logout), API-1 (`start-quiz`), SEC-5 (text cap, pin `pypdf>=6.19,<7`).
4. **Work without an AI API:** NEW-6 (explicit mock provider), SPEC-4 (manual flashcards so quizzes have real content).
   Real AI integration resumes once API access is available.
5. **Performance:** PERF-1, PERF-2, PERF-3, PERF-5, PERF-6, PERF-8, with TEST-4 query-count guards.
6. **Cleanup:** QUAL-1 (ruff), QUAL-2, QUAL-4 … QUAL-7, TEST-1 … TEST-3, SPEC-1, SPEC-3, SPEC-6.

**Done when:**
- every box is ticked and every finding has a regression test
- `pytest` is green and coverage is ≥ 90% per app
- `ruff check` is clean and `pip-audit` reports 0 vulnerabilities
- `manage.py check --deploy --settings=config.settings.prod` is clean
