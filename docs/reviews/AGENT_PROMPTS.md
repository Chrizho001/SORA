# Agent Prompts — Delivery Fix-up (2026-10-25 → delivery 2026-10-26)

Copy-paste one prompt at a time into your coding agent (fresh session per prompt works best).
Each prompt fixes a group of findings from **`/Code_Review.md`** and ticks their checkboxes when done.

---

## Step 0 — do this yourself first (5 minutes, not for the agent)

`main` and `feature/live-testing-ngrok` point to the same commit. All the ngrok work is **uncommitted
changes in your working tree**, so `git checkout main` would carry it along. Park it, keeping the review
docs written today:

```bash
cd "/home/chris-friday/Documents/MBA Project"
# 1. Park the ngrok work (code only) in a stash. The new docs stay in your working tree.
git stash push -u -m "ngrok live-testing (not merged)" -- backend frontend scripts README.md artifacts_screenshots
# 2. Switch to main. The docs (Code_Review.md, architecture/, PROJECT_GOAL.md, CLAUDE.md, this file) come with you.
git checkout main
# 3. Commit the review + spec update as the starting point of the work branch
git checkout -b delivery/2026-10-26
# NOTE: .gitignore line 80 ignores the whole docs/ folder, so new files there are never committed.
# Either delete that line (recommended: specs, deployment notes and the Lighthouse report belong in git) or use `git add -f`.
sed -i '/^docs\/$/d' .gitignore && git add .gitignore
git add Code_Review.md PROJECT_GOAL.md CLAUDE.md architecture docs/reviews
git commit -m "docs: final review, deck-based flashcard/quiz specs, agent prompts"
# 4. Services
docker compose up -d db redis
```
Merge `delivery/2026-10-26` into `main` when you're happy (or at the end of the day).

**Running two agents at once (recommended, given the deadline):**
- **Track A (backend):** P-01 → P-08.
- **Track B (frontend):** P-09 → P-17.
- Give Track B its own worktree so the two don't overwrite each other:
  ```bash
  git worktree add -b delivery/2026-10-26-fe ../sora-frontend delivery/2026-10-26
  cd ../sora-frontend/frontend && npm ci && cp "../../MBA Project/frontend/.env.local" .
  ```
  Open the frontend agent in `../sora-frontend`. When both tracks are done:
  `git checkout delivery/2026-10-26 && git merge delivery/2026-10-26-fe`.
- Frontend prompts P-12 and P-13 use the deck API from P-04 and P-05. They can be written against the
  spec, but test them only after Track A has merged P-04 and P-05.

**Cut line.** If you run out of time, everything marked **P0** in `Code_Review.md` matters most. In order:
P-01, P-02, P-03, P-04, P-05, P-07, P-08, P-09, P-10, P-11, P-12, P-14, P-15, then P-18.

---

## Ground rules (every prompt below starts by telling the agent to read this)

> 1. Read `CLAUDE.md`, `PROJECT_GOAL.md`, `/Code_Review.md` (only the IDs named in your prompt), and the
>    spec files named in your prompt **before** writing code.
> 2. Work on the current branch. Do not switch branches, do not merge, do not push.
> 3. **Backend = strict TDD:** write the failing test first, run it, see it fail for the right reason, then
>    implement. Never delete or skip a test to get green. Use `reverse()`, factories, `freezegun`, and
>    `django_assert_num_queries`. No network calls in tests (patch `requests.post`, `pywebpush.webpush`, Google
>    verification).
> 4. **Frontend:** TypeScript strict, no `any`, no tokens in `localStorage`/`sessionStorage`. Run
>    `npx tsc --noEmit && npm run lint` and keep them clean.
> 5. Before finishing, run the checks for your track and fix anything red:
>    - **Backend prompts (P-01…P-08):**
>      `cd backend && pytest -q && pytest --cov=apps -q | tail -30 && ruff check . && ruff format --check .`
>    - **Frontend prompts (P-09…P-17):** only `cd frontend && npx tsc --noEmit && npm run lint && npm run build`.
>      Do **not** run `pytest`, `migrate` or `runserver`. The backend agent may be using the same Postgres
>      test database at the same moment. Use the backend that is already running on port 8000.
>    - **Final prompts (P-18…P-20):** both.
> 6. Tick (`- [x]`) **only** the `Code_Review.md` items you fully fixed. Also tick the matching test-plan
>    items in the spec file. If you only partly fixed something, leave it unticked and add an indented
>    `- Note (agent): …` line under it.
> 7. Make one commit at the end: `fix(<area>): <summary> (<IDs>)`, with a body listing the IDs.
>    Run `git status` before committing and make sure new files (including anything under `docs/`) are
>    staged. Add any new
>    dependency to `requirements/*.txt` or `package.json` and say why in the commit body.
> 8. Report back: what changed (file list), test, coverage and ruff results, which IDs are ticked, and
>    anything you could not finish.

---

# Track A — Backend

## P-01 · Auth & platform security · SEC-01, SEC-02, SEC-03, SEC-04, SEC-07, SEC-10, SEC-11, SEC-12 · ~60 min

```text
Follow the "Ground rules" in docs/reviews/AGENT_PROMPTS.md. Fix Code_Review.md items SEC-01, SEC-02, SEC-03,
SEC-04, SEC-07, SEC-10, SEC-11 and SEC-12. Specs: architecture/01-authentication.md (§4 google resolution
step 2, §5 rules 5 and 9, Group 10 and Group 11 unticked items) and architecture/03-pdf-summary.md §5 rule 8.

Do this, test-first, in this order:

1. SEC-12 (regression guard). In apps/accounts/tests/test_api_register.py and test_api_password_reset.py add
   tests that POST with HTTP_ORIGIN="https://evil.example" and HTTP_REFERER="https://evil.example/x". Assert
   that the link in mail.outbox[0].body starts with settings.FRONTEND_URL. They should already pass on main.
   Keep them. Do NOT add any code that reads Origin/Referer/Host to build links.

2. SEC-01. In apps/accounts/services.py login_with_google(): when an existing user is found by email and a
   SocialAccount is created, and the user was NOT verified (`is_email_verified is False`) before linking,
   then inside the same transaction:
     user.set_unusable_password()
     blacklist all OutstandingToken rows for the user (reuse the helper that password reset/change uses)
     user.is_email_verified = True; save.
   Verified users keep their password. Tests in test_api_google.py:
     - unverified existing user, then Google login: user.has_usable_password() is False, the old password
       login returns 401, and the earlier refresh token is blacklisted.
     - verified existing user: the password still works.
   Log "Unverified account claimed via Google; password cleared: user_id=%s" (no email address).

3. SEC-02. Add throttle_scope "auth_verify" to VerifyEmailAPIView, "auth_refresh" to TokenRefreshAPIView and
   "auth_password" to PasswordResetConfirmAPIView. In config/settings/base.py DEFAULT_THROTTLE_RATES add
   auth_verify 10/min, auth_refresh 30/min, auth_password 10/min. Add apps/accounts/tests/test_throttles.py
   with one test per endpoint. Use a fixture that deep-copies settings.REST_FRAMEWORK, sets a 2/min rate,
   applies it with override_settings, and clears django.core.cache.cache before and after the test. Never
   mutate the settings dict in place. Assert the 3rd request returns 429 with the envelope code "throttled".

4. SEC-03. In config/settings/prod.py add REST_FRAMEWORK["NUM_PROXIES"] = env.int("NUM_PROXIES", default=1),
   with a comment explaining it. Add NUM_PROXIES to backend/.env.example with a comment ("count of reverse
   proxies in front of Django; Next.js rewrite + platform edge = 2").

5. SEC-04.
   - settings/base.py: MAX_UPLOAD_SIZE = 10 MB, MAX_REQUEST_BODY_SIZE = 12 MB, DATA_UPLOAD_MAX_MEMORY_SIZE
     = 12 MB, FILE_UPLOAD_MAX_MEMORY_SIZE = 10 MB.
   - New config/middleware.py RequestSizeLimitMiddleware. It reads CONTENT_LENGTH (ignores invalid values)
     and returns JsonResponse({"detail": "Request body too large.", "code": "request_entity_too_large"},
     status=413) when the length exceeds MAX_REQUEST_BODY_SIZE. In MIDDLEWARE, put it immediately AFTER
     corsheaders.middleware.CorsMiddleware (so the 413 still carries CORS headers) and before everything
     else.
   - documents/serializers.py validate_file: reject empty files with code "file_empty"; read the limit from
     settings.MAX_UPLOAD_SIZE.
   - Tests in apps/documents/tests/test_upload_limits.py: empty file → 400 file_empty; a request with
     CONTENT_LENGTH > 12 MB → 413; a 10 MB + 1 byte file → 400 file_too_large.

6. SEC-07. In LogoutAPIView, revoke a push subscription only if a user was resolved from the refresh cookie
   AND the subscription belongs to that user: PushSubscription.objects.filter(user=user, endpoint=endpoint).
   Test: user A's subscription is untouched when user B (or an anonymous request) logs out with A's endpoint.

7. SEC-10. In TokenRefreshAPIView, wrap the blacklist step in transaction.atomic() and use
   BlacklistedToken.objects.get_or_create(token=outstanding). If it was not created by this call, return
   401 refresh_invalid and clear the cookie. Test: refreshing twice with the same cookie value means the
   second call gets 401.

8. SEC-11. In config/settings/prod.py: FRONTEND_URL = env("FRONTEND_URL") and EMAIL_HOST = env("EMAIL_HOST")
   with no defaults. CSRF_TRUSTED_ORIGINS = [FRONTEND_URL]. If not GOOGLE_CLIENT_ID, raise
   ImproperlyConfigured. Replace the "stub" docstring with a real one. Add a test
   (apps/accounts/tests/test_scaffold.py) that imports prod settings with the env vars missing and expects
   ImproperlyConfigured. Use monkeypatch.delenv plus importlib.reload, or run a subprocess with
   DJANGO_SETTINGS_MODULE=config.settings.prod and assert a non-zero exit.

Update architecture/01-authentication.md: tick the Group 10 and Group 11 items you implemented.
Tick SEC-01, SEC-02, SEC-03, SEC-04, SEC-07, SEC-10, SEC-11 and SEC-12 in Code_Review.md when done.
```

## P-02 · Quiz grading & document pipeline correctness · BUG-01, BUG-03, BUG-04, BUG-05, BUG-11, BUG-14 · ~75 min

```text
Follow the "Ground rules" in docs/reviews/AGENT_PROMPTS.md. Fix Code_Review.md items BUG-01, BUG-03, BUG-04,
BUG-05, BUG-11 and BUG-14. Specs: architecture/05-quiz.md §4 "submit" and §5 rule 6;
architecture/03-pdf-summary.md §4 (retry, DELETE/405) and §5 rules 4–6, plus Group 3.

Note: P-05 will later move quizzes onto decks. Fix the grading logic here in a way that survives that:
keep it in apps/quizzes/services.py submit_quiz() and SubmitQuizSerializer.

1. BUG-01 (verified bug: submitting the same correct question_id 50 times scores 50/4). Tests first, in
   apps/quizzes/tests/test_api_quizzes.py:
   - duplicate question_id → 400 code duplicate_question; the session stays unfinished (finished_at None,
     score None)
   - question_id from another session → 400 invalid_question; the session stays unfinished
   - selected_choice not in that question's choices → 400 invalid_choice; the session stays unfinished
   - partial submit (1 of 4 answered correctly) → 200, score 1, the 3 others have is_correct False and
     selected_choice None
   - empty answers list → 200, score 0
   - property: 0 <= score <= total_questions
   Implementation:
   - SubmitQuizSerializer takes context={"session": session} and validates duplicates, membership and
     choice membership.
   - answers is optional (default list).
   - submit_quiz() grades each question once and marks unanswered questions incorrect.
   - The view passes the session into the serializer context.
   - Keep the existing atomic finished_at claim (409 on a double submit).

2. BUG-03 + BUG-14. In apps/documents/tasks.py process_document():
   - Migration: add Document.processing_started_at = DateTimeField(null=True, blank=True).
   - At the start: if status == DONE and a Summary exists → log and return (no-op).
   - Claim: Document.objects.filter(id=...).update(status=PROCESSING,
     processing_started_at=existing or now).
   - On success: inside transaction.atomic(), doc = select_for_update().get(id=...). If it is already DONE
     with a summary, return. Otherwise Summary.objects.update_or_create(document=doc,
     defaults={content, ai_model_used}); set page_count, extracted_text, status=DONE, error_message="" and
     processing_started_at=None; save with update_fields.
   - Both failure handlers: re-fetch under select_for_update. If the document is gone (DoesNotExist),
     return quietly. Never overwrite DONE. Set FAILED, a SAFE message (see SEC-05 in P-03; for now keep the
     existing friendly texts but never append str(e)) and processing_started_at=None; then notify.
   - Tests (apps/documents/tests/test_tasks.py and a new test_concurrency.py):
     - running the task twice on a DONE document leaves one Summary and status DONE
     - Summary already exists before the run → no IntegrityError and status DONE
     - document deleted mid-run (delete it inside the patched summarizer) → no exception escapes
   - Use @pytest.mark.django_db(transaction=True) where on_commit or select_for_update needs it.

3. BUG-04. In DocumentViewSet.create(), save inside transaction.atomic() and register
   transaction.on_commit(enqueue). enqueue calls process_document.delay(str(id)) in a try/except. On an
   exception: log it and update the document to FAILED with "Failed to queue document processing.". The
   response is still 202. Test: patch process_document.delay to raise → 202 and the document becomes
   FAILED. Use django_capture_on_commit_callbacks(execute=True).

4. BUG-05. Move the retry logic into a new apps/documents/services.py function
   retry_document(document) (thin views rule).
   - Atomic claim: Document.objects.filter(Q(pk=doc.pk) & (Q(status=FAILED) |
     Q(status__in=[UPLOADED, PROCESSING], processing_started_at__lt=now - timedelta(minutes=10))))
     .update(status=PROCESSING, processing_started_at=now, error_message="").
   - If nothing was claimed: raise ConflictError("Document is already being analyzed.",
     code="document_processing") when the document is fresh UPLOADED/PROCESSING, or
     ValidationError(code="document_not_retryable") when it is DONE.
   - Enqueue on commit, with the same failure handling as BUG-04.
   - The view uses throttle scope "ai_jobs" for retry (add "retry" to the get_throttles list).
   - Tests: FAILED → 202; DONE → 400 document_not_retryable; fresh PROCESSING → 409; stale PROCESSING
     (freezegun, 11 min) → 202; other user's document → 404.

5. BUG-11. DocumentViewSet.http_method_names = ["get", "post", "delete", "head", "options"]. Test that
   PATCH and PUT return 405.

Tick BUG-01, BUG-03, BUG-04, BUG-05, BUG-11 and BUG-14 in Code_Review.md, and the matching items in
03-pdf-summary.md Group 3.
```

## P-03 · Notifications, emails, error hygiene · SEC-05, SEC-06, BUG-02, BUG-09, BUG-10 · ~60 min

```text
Follow the "Ground rules" in docs/reviews/AGENT_PROMPTS.md. Fix Code_Review.md items SEC-05, SEC-06, BUG-02,
BUG-09 and BUG-10. Specs: architecture/06-notifications.md §0 (rules) and architecture/03-pdf-summary.md
§5 rule 5.

1. SEC-05 (no internal text reaches users). Test first: a new apps/documents/tests/test_error_leakage.py and
   apps/flashcards/tests/test_error_leakage.py. Patch the summarizer/generator to raise
   Exception("SECRET-INTERNAL boom"), DocumentProcessingError built from a provider error, and
   requests.HTTPError with a response body "SECRET-INTERNAL". Assert "SECRET-INTERNAL" is absent from
   Document.error_message, Notification.body and json.dumps(Notification.data).
   Implementation:
   - In apps/documents/ai.py and apps/flashcards/ai.py every DocumentProcessingError message is a fixed,
     friendly string: "AI service error. Please try again later.", "AI rate limit reached. Please wait a
     moment and try again.", "AI service is busy. Please try again shortly.", "Network error contacting AI
     service. Please try again later.", "AI service authentication failed." (never include err_msg/exc).
     Log the details with logger.error(..., exc_info=True).
   - In documents/tasks.py the generic except uses "We couldn't process this PDF. Please try again."
   - Reuse ONE DocumentProcessingError: delete the duplicate class in flashcards/ai.py and import it from
     documents.ai, or move it to a shared apps/documents/exceptions.py.

2. BUG-02. Add NotificationType.FLASHCARDS_FAILED = "FLASHCARDS_FAILED", "Flashcards Failed" (migration).
   In apps/flashcards/tasks.py the failure branch sends FLASHCARDS_FAILED with title "Flashcards Failed",
   body f"We couldn't generate flashcards for '{name}'. Please try again." and
   data={"document_id": ..., "error": "flashcards_generation_failed"}. Replace `except Exception: pass`
   with logger.exception(...). Test the notification type, title and body.

3. BUG-09. In apps/notifications/notification_service.py notify(): create the in-app Notification row as
   today. Then schedule push with transaction.on_commit(lambda: _dispatch_push(...)). _dispatch_push wraps
   send_web_push_task.delay(...) in try/except and logs at warning level. Tests:
   - patch send_web_push_task.delay to raise kombu.exceptions.OperationalError; password change still
     returns 200 with a new access token
   - a Notification row exists
   - use django_capture_on_commit_callbacks(execute=True)

4. BUG-10. settings/base.py: EMAIL_TIMEOUT = env.int("EMAIL_TIMEOUT", default=10). Create
   apps/accounts/tasks.py send_templated_email_task(to, subject, template, context) as a @shared_task with
   autoretry_for=(SMTPException, OSError), retry_backoff=True, max_retries=3. services.py schedules
   transaction.on_commit(lambda: send_templated_email_task.delay(...)) for the verification and reset
   emails. Tests run Celery eagerly (CELERY_TASK_ALWAYS_EAGER in test settings, check it is set) and still
   assert through mail.outbox. All existing email tests must stay green.

5. SEC-06. Replace every log line that prints an email address (services.py "Failed to send ... to %s" with
   user.email; emails.py "sent to %s" with recipient_email) with user_id (pass user_id into the email
   helper, or log without a recipient). Test with caplog: register a user, force the send to fail, and
   assert the email string is not in caplog.text.

Tick SEC-05, SEC-06, BUG-02, BUG-09 and BUG-10 in Code_Review.md.
```

## P-04 · Decks + manual flashcards (spec change) · FEAT-01, BUG-06 · ~90 min

```text
Follow the "Ground rules" in docs/reviews/AGENT_PROMPTS.md. Implement Code_Review.md FEAT-01 and BUG-06
exactly as specified in architecture/04-flashcards.md (READY). Also read
architecture/adr/0003-manual-flashcards-and-decks.md. The spec is the contract: field names, URL names,
error codes and limits must match it. Work through its Test plan Groups 1 → 4 in order, test-first.

Summary of what the spec requires (the spec wins if anything here differs):
- New model apps.flashcards.models.Deck(id UUID, user FK CASCADE, title CharField(120), description
  TextField(blank), document FK documents.Document SET_NULL null, created_at, updated_at).
  UniqueConstraint(Lower("title"), "user", name="uniq_deck_title_per_user");
  Index(fields=["user", "-updated_at"]).
- Flashcard: add deck FK (CASCADE, related_name="cards"); make document nullable with SET_NULL; add
  source CharField(choices MANUAL/AI, default MANUAL); Index(user, deck).
- Migrations: (1) schema with deck nullable and source defaulting to AI for existing rows; (2) a data
  migration creating one Deck per document that has flashcards (title = original_name without ".pdf",
  de-duplicated with " (2)", " (3)"…) and attaching its cards; (3) deck non-nullable. Write the Group 4
  migration test with django-test-migrations if it is available, otherwise by calling the RunPython
  function directly against the apps registry.
- API:
  - /api/v1/decks/ (new urls module mounted in config/urls.py with namespace "decks"): list (annotated
    card_count, document_name, ?document= filter, ordered -updated_at), create, retrieve, partial_update
    and destroy. No PUT.
  - POST /decks/{id}/generate-flashcards/ (scope ai_jobs) with body {count: 5..20, default 10}.
  - /api/v1/flashcards/ gains POST (create) and keeps list/retrieve/patch/delete. Filter ?deck=<uuid>
    (400 on a bad UUID). The deck field uses a user-scoped queryset (another user's deck → 400).
    source and document are read-only.
  - Limits: 500 cards per deck (400 deck_full), 200 decks per user (400 deck_limit). Question and answer
    are trimmed, 1..500 chars. A duplicate deck title (case-insensitive) → 400 deck_title_taken (catch
    the IntegrityError or validate in the serializer).
  - Adding, editing or deleting a card bumps deck.updated_at (Deck.objects.filter(pk=...)
    .update(updated_at=now)).
- AI generation (BUG-06): rewrite apps/flashcards/tasks.py as generate_flashcards_task(deck_id, count).
  - It must NEVER delete cards.
  - It reads deck.document.summary.content. If that is under 1500 chars, it appends the first 12000 chars
    of extracted_text.
  - It calls get_flashcard_generator().generate(text, count=count) and appends the cards with
    source=AI and document=deck.document.
  - It skips questions whose normalised form (" ".join(q.casefold().split())) already exists in the deck.
  - The atomic claim on deck.document.flashcard_generation_status stays as it is today (stale after
    10 min).
  - On success it sends FLASHCARDS_READY ("N flashcards added to '<deck title>'"); on failure,
    FLASHCARDS_FAILED (added in P-03; if P-03 hasn't run yet, add it here).
  - Update both AI clients' prompts: exactly `count` cards, one fact per card, question <= 200 chars,
    answer <= 25 words, JSON {"flashcards":[{"question","answer"}]}. Drop invalid items instead of failing
    the whole batch; fail only if 0 valid cards remain. MockFlashcardGenerator returns `count`
    deterministic cards.
- Keep the legacy POST /documents/{id}/generate-flashcards/: get or create the deck where
  document=doc (title from the file name), then behave like the deck endpoint and include "deck_id" in
  the 202 response.
- Register Deck in admin.
- Do not touch quizzes in this prompt, except to keep them compiling and passing: start_quiz still reads
  Flashcard.objects.filter(document=document) until P-05.

Tick the 04-flashcards.md Group 1–4 items and Code_Review.md FEAT-01 and BUG-06.
```

## P-05 · Deck-based quizzes + better generation policy · FEAT-02, BUG-12, SEC-09, PERF-02 · ~75 min

```text
Follow the "Ground rules" in docs/reviews/AGENT_PROMPTS.md. Implement Code_Review.md FEAT-02, BUG-12, SEC-09
and PERF-02 exactly as specified in architecture/05-quiz.md (READY). It depends on P-04 (Deck exists).
Work through Test plan Groups 1 → 3, test-first.

- Models:
  - QuizSession: add deck FK flashcards.Deck SET_NULL null and deck_title CharField(120); make document
    nullable with SET_NULL (legacy); Index(fields=["user", "-created_at"]).
  - QuizQuestion: add position PositiveSmallIntegerField(default=0) and change Meta.ordering to
    ["position"].
  - Data migration: set deck from the deck created for the session's document (Deck.document =
    session.document). Set deck_title to that deck's title, else the document's original_name, else
    "Deleted deck".
- Service start_quiz(user, deck, question_count=10) in apps/quizzes/services.py:
  - eligibility: >= 4 cards whose answers are DISTINCT after norm = " ".join(a.casefold().split()),
    else ValidationError code not_enough_flashcards
  - eligible cards = one card per distinct normalised answer (keep the first); sample
    n = min(question_count, len(eligible)) at random
  - distractors for each question: candidate answers from the deck whose norm differs from the correct
    answer's norm, deduplicated by norm; sort by abs(len(c) - len(correct)); take the closest 6; choose
    3 with random.sample
  - choices = 3 distractors + the correct answer, shuffled; snapshot question_text and correct_answer;
    position = index
  - question_count is validated in a serializer: int 1..50, default 10
- Endpoint: POST /api/v1/decks/{id}/start-quiz/ (action on the DeckViewSet, url_name start-quiz →
  reverse("decks:deck-start-quiz", ...)), throttle scope quiz_create (30/hour, add it to settings).
  Return 201 with the unfinished payload. DELETE the old /documents/{id}/start-quiz/ action and its tests,
  replacing them with deck tests (the spec removes it, so this is not "deleting a test to get green").
- Serializers (SEC-09):
  - The unfinished question payload is exactly {id, position, question_text, choices}.
  - The finished payload adds selected_choice, is_correct and correct_answer.
  - Remove the nested flashcard serializer entirely.
- PERF-02: QuizSessionListSerializer {id, deck, deck_title, score, total_questions, created_at,
  finished_at}, used for list. Retrieve uses prefetch_related("questions"). Add a
  django_assert_num_queries test with 1 vs 5 sessions giving the same count.
- The submit endpoint uses throttle scope quiz_submit (30/min). Keep the BUG-01 grading from P-02. The
  QUIZ_GRADED notification body uses deck_title.
- Tests to include:
  - 4 cards with only 3 distinct answers → 400
  - every question has 4 distinct choices containing correct_answer (loop 20 times to cover randomness)
  - question_count respected and capped
  - another user's deck → 404
  - deleting the deck keeps the session with deck None and deck_title kept
  - editing a card after the quiz doesn't change question_text or correct_answer

Tick the 05-quiz.md items and Code_Review.md FEAT-02, BUG-12, SEC-09 and PERF-02.
```

## P-06 · Tasks: reminders & timezone · BUG-07, BUG-08 · ~45 min

```text
Follow the "Ground rules" in docs/reviews/AGENT_PROMPTS.md. Fix Code_Review.md BUG-07 and BUG-08 as specified
in architecture/02-tasks.md §3 (overdue_notified_at), §4 (tz param) and §5 (Reminders), Test plan Group 4.

1. Migration: Task.overdue_notified_at = DateTimeField(null=True, blank=True).
2. Re-arming: in Task, capture the original due_at and is_completed in from_db() (store them on
   self._loaded_values). In save(), if due_at changed, or is_completed went from True to False, set
   reminder_sent_at = None and overdue_notified_at = None. Keep the existing completed_at logic. Unit
   tests in apps/tasks/tests/test_models.py; API tests via PATCH in test_api_tasks.py.
3. Reminder job (apps/notifications/tasks.py send_due_task_reminders):
   - keep the due-soon pass
   - add an overdue pass: is_completed=False, due_at < now, overdue_notified_at IS NULL → notify
     TASK_OVERDUE, title "Task overdue", body f"'{task.title}' is overdue."; then set overdue_notified_at
   - use .iterator() and select_related("user")
   - update the flag with a queryset .update() per task, so a failure in one notify never blocks others
   - tests with freezegun: sent once, not for completed tasks, re-sent after a reschedule
4. Timezone filter (apps/tasks/serializers.py TaskQuerySerializer, apps/tasks/views.py):
   - Add an optional tz CharField, validated with zoneinfo.ZoneInfo (ZoneInfoNotFoundError/ValueError →
     ValidationError).
   - If date is given: start = datetime.combine(date, time.min, tzinfo=ZoneInfo(tz or "UTC")),
     end = start + 1 day; filter due_at__gte=start, due_at__lt=end. Remove due_at__date.
   - Test: ?date=2026-10-25&tz=America/New_York includes a task due 2026-10-26T02:00Z and excludes one
     due 2026-10-25T03:00Z; ?tz=Mars/Base → 400.
5. While you are in apps/tasks: move the in-function import in views.py to the top, and add
   http_method_names without "put" (keep patch).

Tick 02-tasks.md Group 4 and Code_Review.md BUG-07 and BUG-08.
```

## P-07 · Profile update + performance · FEAT-03, PERF-01, PERF-03, PERF-04 · ~45 min

```text
Follow the "Ground rules" in docs/reviews/AGENT_PROMPTS.md. Fix Code_Review.md FEAT-03, PERF-01, PERF-03 and
PERF-04.

1. FEAT-03 (architecture/01-authentication.md §4 "GET / PATCH me/", Group 8 — two items are unticked
   because PATCH was never implemented).
   - Add patch() to MeAPIView using a UserUpdateSerializer(fields first_name and last_name, max 150,
     trimmed). Every other field is read-only and ignored.
   - Return 200 with the UserSerializer data.
   - Tests in test_api_me.py: names persisted; email and is_email_verified ignored; unauthenticated → 401;
     blank first_name → 400 (or allowed, but match the model; check the model's blank= setting and
     follow it).

2. PERF-01 (architecture/03-pdf-summary.md §4 GET /):
   - DocumentViewSet.get_queryset for action == "list":
     Document.objects.filter(user=...).select_related("summary").defer("extracted_text").
   - New DocumentListSerializer with fields {id, original_name, size, page_count, status, error_message,
     flashcard_generation_status, has_summary, created_at}. has_summary =
     hasattr(obj, "summary"), with no extra query thanks to select_related.
   - Detail keeps the full serializer.
   - Test with django_assert_num_queries: the same count for 1 vs 5 documents, and no "summary" content
     key in list items.
   - Check that the frontend only reads summary content from the detail endpoint. If
     frontend/src/lib/dashboard-api.ts or DocumentsView reads summary.content from the list, note it in
     your report for the frontend agent (do not edit the frontend in this prompt).

3. PERF-03: indexes with migrations. Notification(recipient, -created_at); verify that QuizSession
   (user, -created_at), Deck(user, -updated_at) and Flashcard(user, deck) exist (from P-04/P-05) and add
   any that are missing.

4. PERF-04: in apps/documents/ai.py GeminiSummarizerClient.summarize, include the inline PDF part only
   when text is empty or whitespace. Add a unit test patching requests.post that asserts the payload has
   no inline_data when text is provided, and has it when text == "".

Tick 01-authentication.md Group 8 and Code_Review.md FEAT-03, PERF-01, PERF-03 and PERF-04.
```

## P-08 · Lint, coverage, hygiene, compose · QUAL-01…05, SEC-08, BUG-13 · ~60 min

```text
Follow the "Ground rules" in docs/reviews/AGENT_PROMPTS.md. Fix Code_Review.md QUAL-01, QUAL-02, QUAL-03,
QUAL-04, QUAL-05, SEC-08 and BUG-13. Run this prompt LAST on the backend track (after P-01 … P-07), so
ruff cleans everything.

1. QUAL-03 first:
   - git rm backend/demo_flow.py, backend/test_e2e_auth.py, backend/test_email_rendering.py,
     frontend/test_browser_flow.js, frontend/test_dashboard_ui.js, and the empty apps/*/tests.py files
     (only the ones that are empty or contain only the Django stub).
   - In backend/pyproject.toml [tool.pytest.ini_options] set testpaths = ["apps"].
   - Check that backend/logs and backend/media are git-ignored and not tracked.

2. QUAL-04:
   - Move function-local imports to module top level, except where needed to avoid a real circular
     import (comment why).
   - Move exception classes defined inside views to apps/accounts/exceptions.py.
   - config/urls.py: remove `import environ`, `env = environ.Env()` and the unused settings import; use
     settings.ADMIN_URL (define ADMIN_URL = env("ADMIN_URL", default="admin/") in base.py).
   - Pin pywebpush (pywebpush>=2.0,<3.0) in requirements/base.txt.

3. BUG-13 in config/exceptions.py:
   - Flatten SimpleJWT's detail (a dict with "detail", "code" and "messages") into the envelope
     {"detail": str, "code": "token_not_valid"} without an "errors" key.
   - For a non-field ValidationError("msg"), use detail = "msg".
   - For unhandled exceptions (the handler returns None) when not settings.DEBUG: log the exception and
     return 500 {"detail": "Internal server error.", "code": "server_error"}.
   - Tests in apps/accounts/tests/test_scaffold.py (or a new config test): expired token → envelope
     without a stringified dict; a view raising RuntimeError (temporary test URLConf via
     @override_settings(ROOT_URLCONF=...)) → 500 envelope.

4. QUAL-02, coverage ≥ 90% for every app. Add tests with requests.post patched (no network):
   - apps/documents/tests/test_ai.py and apps/flashcards/tests/test_ai.py: success, 401, 403, 429,
     503-then-200 retry (patch time.sleep), RequestException timeout, invalid JSON, empty candidates,
     missing API key.
   - apps/notifications/tests/test_tasks.py: webpush success sets last_used_at; WebPushException with
     response.status_code 410 revokes; other errors are logged; no VAPID key → skipped; no subscriptions
     → returns.
   Run pytest --cov=apps --cov-report=term-missing and paste the per-app totals in your report.

5. QUAL-01: ruff check --fix . && ruff format . then fix the rest by hand until `ruff check .` prints
   "All checks passed!". Do not add blanket per-file ignores; small, justified per-line `# noqa: <code>`
   only (e.g. the settings star import is already allowed).

6. SEC-08 + QUAL-05, in docker-compose.yml:
   - bind ports to 127.0.0.1
   - the Postgres password comes from ${POSTGRES_PASSWORD:-study_pass}
   - Redis: command ["redis-server", "--requirepass", "${REDIS_PASSWORD:-devredis}"]; update
     backend/.env.example REDIS_URL to redis://:devredis@localhost:6379/0
   - add services `worker` and `beat` (build from backend/ using a small backend/Dockerfile:
     python:3.12-slim, install requirements/base.txt, workdir /app, with commands
     `celery -A config worker -l info` and `celery -A config beat -l info`) depending on db and redis
   - if adding a Dockerfile is too slow, document the two celery commands in README.md "Run locally"
     instead and note that in your report
   - update README.md "Run locally" to list every process: db+redis, migrate, runserver, worker, beat,
     frontend

Tick QUAL-01 … QUAL-05, SEC-08 and BUG-13 in Code_Review.md. Report final: test count, per-app
coverage, ruff output.
```

---

# Track B — Frontend

## P-09 · Session & data safety · FE-02, FE-03, FE-04 · ~60 min

```text
Follow the "Ground rules" in docs/reviews/AGENT_PROMPTS.md. Fix Code_Review.md FE-02, FE-03 and FE-04 in
frontend/. Read architecture/01-authentication.md "Frontend contract" first.

1. FE-02, in frontend/src/lib/axios-client.ts:
   - Single flight: a module-level `let refreshPromise: Promise<string> | null`. A function
     refreshAccessToken() returns the existing promise if one is in flight; otherwise it starts
     authClient.post("/token/refresh/") and clears refreshPromise in finally.
   - In the 401 interceptor: capture `const failedToken = inMemoryAccessToken` before refreshing. On
     success, set the token, retry the original request once (_retry flag) and return it. On failure,
     only call setStoredAccessToken(null) if inMemoryAccessToken === failedToken, then call
     sessionExpiredHandler?.() and throw an AuthApiError(401, "Your session has expired. Please sign in
     again.", "token_expired").
   - Also attempt the refresh when inMemoryAccessToken is null but the request is to apiClient (so a hard
     reload recovers), but never for authClient's own /token/refresh/ or /login/ calls.
   - Export registerSessionExpiredHandler(fn).
   - In auth-context.tsx, register a handler that sets user to null, calls queryClient.clear() and does
     router.replace("/login?expired=1").
   - Make the mount-time refreshSession idempotent under React Strict Mode: use a module-level
     `initialRefresh` promise reused on the second mount.
   - The login page shows a toast "Your session expired — please sign in again" when ?expired=1 is set.

2. FE-03: logout() in auth-context.tsx calls queryClient.clear() (useQueryClient — make sure
   QueryProvider wraps AuthProvider in app/layout.tsx; reorder if needed) after the API call, whether it
   succeeds or fails. Prefix every query key with the user id: create a helper
   `qk(userId, ...parts)` in use-dashboard-queries.ts and use it everywhere, including invalidations.

3. FE-04: every useQuery in use-dashboard-queries.ts gets `enabled: !!user && !isAuthLoading` (read them
   from useAuth). Remove the hard-coded `enabled: true`. Every dashboard view must render three distinct
   states:
   - loading: skeleton blocks (a small <Skeleton/> in components/ui)
   - error: a message plus a "Try again" button calling refetch()
   - empty: the existing empty states
   Remove the `= []` defaults that hide errors (use `data ?? []` only after the isError check).

Verify by hand:
- `npm run dev` with the backend running.
- Log in, hard-reload /dashboard: the data loads.
- Shorten the access token lifetime by setting SIMPLE_JWT ACCESS_TOKEN_LIFETIME to 30 s in
  backend/.env or dev.py, temporarily and without committing it. Wait, then open a view that fires
  several queries: one /token/refresh/ call is visible in the Network tab and the data loads.
- Log out, then log in as a second user: none of the first user's data flashes up.
Describe what you observed in your report.

Tick FE-02, FE-03 and FE-04 in Code_Review.md.
```

## P-10 · Make it a real PWA · FE-01, FE-24 · ~60 min

```text
Follow the "Ground rules" in docs/reviews/AGENT_PROMPTS.md. Fix Code_Review.md FE-01 and FE-24 in frontend/.
Read architecture/00-overview.md (frontend layout, deployment) and architecture/06-notifications.md §0.

1. Icons: generate PNGs from public/icon.svg into public/icons/: icon-192.png, icon-512.png and
   icon-maskable-512.png (with ~10% safe-zone padding on the brand background colour). Use `sharp`
   (devDependency) in a script frontend/scripts/generate-icons.mjs and commit both the script and the
   PNGs. FE-24: keep app/icon.svg, app/apple-icon.png and app/favicon.ico as the single source for
   favicons; delete the public/ duplicates and the explicit metadata.icons block if it duplicates them.

2. src/app/manifest.ts (MetadataRoute.Manifest): name "SORA — Study Assistant", short_name "SORA",
   description, start_url "/dashboard", scope "/", display "standalone", orientation "portrait",
   background_color and theme_color taken from globals.css tokens, and icons (192, 512, plus 512 maskable
   with purpose "maskable"). Add `themeColor` via the viewport export in layout.tsx.

3. Service worker with Serwist:
   - npm i @serwist/next and npm i -D serwist.
   - Wrap next.config.ts with withSerwistInit({ swSrc: "src/app/sw.ts", swDest: "public/sw.js",
     disable: process.env.NODE_ENV === "development" }). Add public/sw.js* to .gitignore.
   - src/app/sw.ts:
     - precache entries from self.__SW_MANIFEST; skipWaiting and clientsClaim
     - runtimeCaching: defaultCache from @serwist/next/worker, BUT add a first rule that matches
       /\/api\/v1\// with NetworkOnly (never cache authenticated API responses)
     - fallbacks: { entries: [{ url: "/offline", matcher: ({request}) => request.destination ===
       "document" }] }
     - a `push` listener showing self.registration.showNotification(title, {body, data, icon:
       "/icons/icon-192.png", badge}) from event.data.json() ({title, body, data, notification_id})
     - a `notificationclick` listener that focuses an existing client or opens a URL derived from data
       (document_id → /dashboard/documents, quiz_session_id → /dashboard/quizzes/<id>, task_id →
       /dashboard/tasks, otherwise /dashboard/notifications)
   - Add "webworker" to the tsconfig lib for sw.ts, or give sw.ts its own tsconfig as the Serwist docs
     show, so tsc stays clean.
   - src/app/offline/page.tsx: a branded, static "You're offline" page with a Retry button
     (location.reload()).

4. PwaInstallCard.tsx: keep the beforeinstallprompt flow. It now actually fires. Detect
   display-mode: standalone and hide the card when installed. Fix any copy that promises more offline
   capability than the shell plus the offline page.

5. Verify: `npm run build && npm start`, open http://localhost:3000 in Chrome →
   DevTools > Application: the Manifest has no errors, the Service Worker is activated, and the
   "Installable" check is OK. Then check "Offline" in DevTools and reload /dashboard: the offline page
   or cached shell appears. Run Lighthouse (PWA + Accessibility) and save the report as
   docs/lighthouse/<date>.html or .json. Put the scores in your report.

Tick FE-01 and FE-24 in Code_Review.md.
```

## P-11 · Real routes, mobile nav, quiz session routing · FE-09, FE-08 · ~75 min

```text
Follow the "Ground rules" in docs/reviews/AGENT_PROMPTS.md. Fix Code_Review.md FE-09 and FE-08 in frontend/.
The target route map is in architecture/00-overview.md "Frontend layout". Do this after P-09.

1. Create src/app/dashboard/layout.tsx (client component) containing:
   - the auth guard that today lives in dashboard/page.tsx: while isLoading, show a full-screen skeleton;
     if there is no user, router.replace("/login?next=<current path>"); never render children before
     auth resolves
   - Sidebar (desktop) and MobileNav (mobile), with the active item derived from usePathname()
   - the NotificationDrawer and the toast region

2. Routes (each page.tsx renders the existing view component; move props and handlers into the pages
   or into hooks):
   - /dashboard (home)
   - /dashboard/tasks
   - /dashboard/documents
   - /dashboard/flashcards (deck list; P-12 fills it)
   - /dashboard/flashcards/[deckId]
   - /dashboard/quizzes (history + start)
   - /dashboard/quizzes/[id] (take and review one session, loaded by id with quizzesApi.getQuizSession)
   - /dashboard/notifications
   - /dashboard/settings
   Replace every `setActiveTab(...)` / `onNavigateTab(...)` with <Link> or router.push. Delete the tab
   state from dashboard/page.tsx.

3. MobileNav: 5 items (Home, Tasks, Documents, Flashcards, More). "More" opens a bottom sheet with
   Quizzes, Notifications (with unread badge) and Settings. Respect the safe area with
   padding-bottom: env(safe-area-inset-bottom) in plain CSS, NOT the non-existent `safe-area-pb` class.

4. FE-08: every "Start quiz" button (Home, Documents and later Decks) calls the start mutation, then
   router.push(`/dashboard/quizzes/${session.id}`). Wrap every mutateAsync call site in the codebase in
   try/catch with a toast on error (grep for mutateAsync). In QuizzesView remove the local activeSession
   state; the [id] page owns it.

5. Login and signup honour ?next= after success (only same-origin relative paths starting with "/" and
   not "//").

Verify by hand that deep links work after a hard reload, that Back and Forward move between sections,
and that on a 390px-wide viewport every section is reachable. Report it.

Tick FE-09 and FE-08 in Code_Review.md.
```

## P-12 · Decks & flashcards UI · FE-05, FE-07 · ~90 min (needs P-04 API)

```text
Follow the "Ground rules" in docs/reviews/AGENT_PROMPTS.md. Fix Code_Review.md FE-05 and FE-07 in frontend/.
The API contract is architecture/04-flashcards.md §4. Read it. Do this after P-11 (routes exist).

1. src/lib/dashboard-api.ts:
   - types Deck {id, title, description, document, document_name, card_count, created_at, updated_at}
     and Flashcard {id, deck, document, question, answer, source: "MANUAL" | "AI", created_at,
     updated_at}
   - decksApi: list(params), get(id), create, update, remove, generate(id, {count}), startQuiz(id,
     {question_count})
   - flashcardsApi: list({deck}), create, update and remove
   - all list calls follow pagination (see P-16; if P-16 hasn't run yet, implement a small fetchAllPages
     helper here and P-16 will reuse it)

2. Hooks in use-dashboard-queries.ts: useDecks, useDeck(id), useDeckCards(deckId) (server-side
   ?deck= filter), plus mutations with precise invalidation (deck list, deck detail, cards of that
   deck).

3. /dashboard/flashcards (deck list):
   - a grid of deck cards (title, card_count, "from <document_name>" badge if present, last updated)
   - a "New deck" dialog: title (required, 1–120 chars) and description (optional, ≤1000); optional
     "Link a PDF" select of the user's DONE documents
   - show 400 deck_title_taken as a field error
   - an empty state: "Create your first deck"

4. /dashboard/flashcards/[deckId]:
   - Header: title (inline rename) and a delete button (ConfirmDialog from P-17, or a simple confirm()
     until then).
   - Tabs: "Cards" and "Study".
   - Cards tab: a list of question/answer rows with an AI badge for source AI, and Edit (inline or
     dialog) and Delete actions. The "Add card" form sits at the top: question and answer textareas
     with 1–500 char counters, the submit button disabled while invalid, focus returns to the question
     after adding (fast entry), and Ctrl/Cmd+Enter submits.
   - Study tab: move the existing flip/next/shuffle study UI here, operating on this deck's cards. Guard
     against currentIndex >= cards.length (that bug exists today).
   - "Generate with AI" button, shown only if deck.document is set: a dialog to choose the count (5/10/20),
     which calls decksApi.generate.
   - FE-07: while the deck's document flashcard_generation_status is GENERATING, poll the document every
     3 s (useQuery refetchInterval returns false when not generating). When it moves to DONE or FAILED,
     invalidate the deck cards, the deck list and the notifications, and show a toast "N cards added" or
     "Generation failed — try again".
   - "Start quiz" button with a question count select (5/10/20). It is disabled with a tooltip when the
     deck has fewer than 4 cards or fewer than 4 distinct answers (compute distinctness client-side with
     the same normalisation as the spec). Then router.push to /dashboard/quizzes/<id>.

5. Documents view: the per-document "Generate flashcards" action now calls the legacy endpoint, which
   returns deck_id; then navigate to /dashboard/flashcards/<deck_id>. Remove the hard-coded
   "5 Flashcards" badge text (it isn't true any more); show the deck link instead.

Render user text as text only (no dangerouslySetInnerHTML). All dialogs use the shared Dialog from P-17
if present; otherwise create components/ui/Dialog.tsx now with role="dialog", aria-modal, labelled
title, Escape to close, a focus trap and focus return, and let P-17 reuse it.

Tick FE-05 and FE-07 in Code_Review.md.
```

## P-13 · Quiz experience · FE-17 · ~45 min (needs P-05 API)

```text
Follow the "Ground rules" in docs/reviews/AGENT_PROMPTS.md. Fix Code_Review.md FE-17 in frontend/. The API
contract is architecture/05-quiz.md §4. Do this after P-11 and P-12.

1. /dashboard/quizzes:
   - "Start a quiz": a list of the user's decks with card counts; the button is disabled (with a reason)
     for decks under 4 distinct answers; a question count select (5/10/20).
   - History: a list from GET /quiz-sessions/ (lightweight) showing deck_title, date, and score as
     "S / T" plus a percentage. Unfinished sessions show an "In progress" badge and a "Resume" link to
     /dashboard/quizzes/<id>.

2. /dashboard/quizzes/[id]:
   - If unfinished: one question at a time, ordered by position, with a progress bar ("Question 3 of 10")
     and choices as large radio-style buttons (min 44px tap targets, arrow-key navigable, role="radiogroup").
     Keep answers in component state, and also in sessionStorage keyed by session id so a refresh
     doesn't lose progress (answers only, never tokens). Previous and Next buttons. The Submit button is
     enabled when every question is answered; "Submit anyway" sits behind a confirm if some are
     unanswered.
   - On submit: POST answers; handle 409 (already finished → just reload the session) and 400 (show the
     detail).
   - Results view (finished sessions, also reachable from history): a big score with a percentage and a
     short message band (<50% "Keep going", 50–79% "Good progress", ≥80% "Excellent"), then each question
     with the user's choice (red if wrong), the correct answer (green), and "Not answered" where relevant.
   - Buttons: "Retake quiz" (starts a new session on the same deck; disabled if the deck was deleted, i.e.
     deck null) and "Back to deck".
   - Remove the wrong copy ("5-question", "Answer all to submit") from the old view.

Tick FE-17 in Code_Review.md.
```

## P-14 · Tasks: edit + timezone · FE-15, FE-13 · ~45 min

```text
Follow the "Ground rules" in docs/reviews/AGENT_PROMPTS.md. Fix Code_Review.md FE-15 and FE-13 in frontend/.
Read architecture/02-tasks.md §4 (date, tz, from and to params).

1. src/lib/dates.ts:
   - toLocalDateKey(iso): "YYYY-MM-DD" in the browser's local zone (build it from getFullYear, getMonth
     and getDate, never toISOString)
   - localDayRange(date) returning {from, to} as ISO strings for local midnight to the next midnight
   - fromLocalInput(dateStr, timeStr) → ISO UTC string
   - toLocalInputs(iso) → {date, time} for <input type="date"> and <input type="time">
   - userTimeZone() = Intl.DateTimeFormat().resolvedOptions().timeZone
   Add small unit tests if a test runner is set up by then; otherwise add a `// examples` comment block
   with three worked cases.

2. Replace every `due_at.split("T")[0]` and every `toISOString().split("T")[0]` (grep the whole src/)
   with these helpers: MiniCalendar, AssignmentsBoard, TasksView, TaskModal, DailySchedule.
   DailySchedule shows only today's tasks (local day) plus overdue open tasks, not all tasks. When the
   frontend filters by date through the API, send date + tz=userTimeZone().

3. FE-15, edit task: TaskModal takes an optional `task` prop. In edit mode it pre-fills title,
   description, due date and time (local), and priority, has the title "Edit task", and PATCHes only the
   changed fields. Every task row (TasksView, AssignmentsBoard, calendar day list) gets an "Edit" action
   (an icon button with aria-label "Edit task <title>"). Allow clearing the due date (to-do without a
   deadline). After saving, invalidate the task queries.

4. Tasks with no due date: show them in a "No deadline" group, not inside every date filter (today they
   pass every date filter — that's the bug).

5. Show "Overdue" (red) and "Due soon" (amber, < 24 h) badges on open tasks.

Tick FE-15 and FE-13 in Code_Review.md.
```

## P-15 · Settings: profile, password, notification preferences, push · FE-14 · ~75 min

```text
Follow the "Ground rules" in docs/reviews/AGENT_PROMPTS.md. Fix Code_Review.md FE-14 in frontend/. Read
architecture/01-authentication.md §4 (me/, password/change/) and "Frontend contract", and
architecture/06-notifications.md §0 and the API sections for notification-preferences and
push-subscriptions. Check the real serializers in backend/apps/notifications/serializers.py for the exact
fields.

/dashboard/settings sections:

1. Profile: first and last name form → PATCH /auth/me/ (needs backend P-07). On success, update the
   AuthContext user. Email is shown read-only with a "Verified" badge.

2. Security:
   - If user.has_password: Change password (old, new, confirm) → POST /auth/password/change/. Use the
     zod schema mirroring the backend rules (reuse auth-schemas.ts). On 200, store the returned access
     token with setStoredAccessToken (the backend rotated the session) and show a toast. Map 400 errors to
     fields (errors.old_password and so on).
   - Else: a "Set a password" button that calls POST /auth/password-reset/ with the user's email and
     shows "We emailed you a link to set a password".
   - Show linked sign-in methods (auth_providers).

3. Notifications:
   - Load GET /notification-preferences/. Show one row per type with readable labels from
     src/lib/notification-types.ts (create it if P-16 hasn't): toggles for "In-app" and "Push". Save with
     PATCH/PUT per row as the backend supports (check the viewset), using an optimistic update and a
     rollback on error.
   - "Enable push notifications" button. Feature-detect ("serviceWorker" in navigator && "PushManager" in
     window). If permission is "denied", explain how to re-enable it. Otherwise call
     Notification.requestPermission(), then
     registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey:
     urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) }), then POST
     /push-subscriptions/ with {endpoint, keys: {p256dh, auth}} — match the backend serializer field
     names exactly. Show "Push enabled on this device" plus a "Disable" button that unsubscribes and
     DELETEs the server row.
   - Add NEXT_PUBLIC_VAPID_PUBLIC_KEY to frontend/.env.example. In docs/deployment.md (create it if
     missing) document generating a VAPID key pair (npx web-push generate-vapid-keys) and where each key
     goes (backend VAPID_PRIVATE_KEY and VAPID_PUBLIC_KEY, frontend NEXT_PUBLIC_VAPID_PUBLIC_KEY).
   - iOS note in the UI: push requires the app to be installed to the Home Screen (iOS 16.4+).

4. Keep the existing PWA install card in Settings.

Verify the push round trip locally with `npm run build && npm start` (the SW is disabled in dev), the
backend running, the Celery worker running and VAPID keys set. Trigger a notification (e.g. finish a
quiz) and confirm a system notification appears. Report the result. If push can't be verified
locally, say so plainly.

Tick FE-14 in Code_Review.md.
```

## P-16 · Data correctness: pagination, notification types, freshness, polling · FE-06, FE-10, FE-18, FE-20 · ~45 min

```text
Follow the "Ground rules" in docs/reviews/AGENT_PROMPTS.md. Fix Code_Review.md FE-06, FE-10, FE-18 and FE-20
in frontend/.

1. FE-06 pagination: in src/lib/dashboard-api.ts add
   fetchAllPages<T>(client, url, params, maxPages = 10). It follows `next` until null or maxPages and
   returns {results, truncated}. Use it for tasks, documents, decks, cards of a deck and quiz sessions.
   Notifications use useInfiniteQuery with a "Load more" button instead (they can be long). Remove any
   client-side filtering that duplicates a server filter (?deck=, ?document=).

2. FE-10: create src/lib/notification-types.ts. It exports a const map keyed by EXACTLY these backend
   values: TASK_DUE_SOON, TASK_OVERDUE, PDF_SUMMARY_READY, PDF_SUMMARY_FAILED, FLASHCARDS_READY,
   FLASHCARDS_FAILED, QUIZ_READY, QUIZ_GRADED, SECURITY_NEW_LOGIN, SECURITY_PASSWORD_CHANGED,
   SECURITY_EMAIL_CHANGED. Each entry has {label, icon (lucide component), tone: "info" | "success" |
   "warning" | "danger", href(data) → string}. Hrefs:
   - document_id → /dashboard/documents
   - quiz_session_id → /dashboard/quizzes/<id>
   - task_id → /dashboard/tasks
   - deck_id → /dashboard/flashcards/<id>
   - security events → /dashboard/settings
   Also export a fallback. Use it in NotificationsView and NotificationDrawer and delete their local
   maps. Clicking a notification marks it read and navigates to href.

3. FE-18: when the polled unread count changes (compare to the previous value in a ref), invalidate the
   notifications list query.

4. FE-20:
   - Document polling stops for a document once it has been UPLOADED/PROCESSING for more than 10
     minutes (compare created_at, or processing_started_at if present). Show a "Taking longer than
     expected" state with a Retry button that calls the retry endpoint and handles 409 and 400 messages.
   - Upload: set timeout 120000 on the upload request only, and show a progress bar driven by axios
     onUploadProgress in DocumentUploadModal.

Tick FE-06, FE-10, FE-18 and FE-20 in Code_Review.md.
```

## P-17 · Accessibility, confirmations, Google button, polish · FE-11, FE-12, FE-16, FE-19, FE-21 · ~75 min

```text
Follow the "Ground rules" in docs/reviews/AGENT_PROMPTS.md. Fix Code_Review.md FE-11, FE-12, FE-16, FE-19
and FE-21 in frontend/. (Owner's decision: do NOT change the hard-coded dashboard and landing-page stats
in this prompt.)

1. FE-11: components/ui/Dialog.tsx (reuse it if P-12 created it):
   - role="dialog", aria-modal="true", aria-labelledby and aria-describedby
   - Escape closes it; a focus trap; initial focus on the first field or close button; focus returns to
     the trigger; backdrop click closes it (configurable)
   - body scroll lock; the close button has aria-label="Close"
   Migrate TaskModal, DocumentUploadModal, the summary reader in DocumentsView, the NotificationDrawer
   (as a side sheet variant) and the deck dialogs to it. In DocumentUploadModal replace the clickable div
   with a <label htmlFor="pdf-input"> drop zone and an <input id="pdf-input" type="file"
   accept="application/pdf" className="sr-only">, keeping drag-and-drop. Add aria-label to every
   icon-only button (grep for buttons whose only child is a lucide icon).

2. FE-16: components/ui/ConfirmDialog.tsx({title, description, confirmLabel, tone: "danger"}). Use it
   for:
   - document delete: "Deletes the PDF and its summary. Decks made from it are kept."
   - task delete
   - deck delete: "Deletes N cards. Quiz history is kept."
   - card delete

3. FE-12: GoogleAuthButton renders the official button VISIBLY with
   google.accounts.id.renderButton(containerRef.current, {type: "standard", theme: "outline", size:
   "large", text: "continue_with", shape: "pill", width: <container width>}). Delete the hidden-div
   plus programmatic .click() approach. The callback POSTs response.credential to /auth/google/.
   - 409 account_conflict → the message "This email is linked to a different Google account. Sign in
     with your original method."
   - 401 google_email_unverified → a clear message
   - if NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing, render nothing (no broken button)

4. FE-19: exactly one error surface per action. If a modal shows inline errors, remove the mutation's
   onError toast for that mutation. After a voluntary logout, don't fire the "Authentication Required"
   toast: set a flag in logout() that the guard checks. Remove the dead catch in handleLogout.

5. FE-21:
   - add src/app/error.tsx (a client error boundary with a "Try again" reset) and
     src/app/not-found.tsx (branded, link home)
   - footer links /privacy, /terms and /cookies: create simple static pages (privacy should truthfully
     describe the data stored: account, tasks, PDFs, flashcards, quiz results, notification
     subscriptions, and that PDFs are sent to Google Gemini for summarisation), or remove the links
   - signup "Privacy Policy" points to /privacy
   - remove the "Remember me" checkbox (it does nothing; the refresh cookie lifetime is fixed)
   - redirect logged-in users away from /login and /signup to /dashboard
   - Tailwind v4: grep for animate-in, fade-in, slide-in-from-*, zoom-in-*, perspective-1000 and
     safe-area-pb. Either add tw-animate-css (npm i tw-animate-css; @import "tw-animate-css" in
     globals.css) or replace them with existing utilities or framer-motion. Define perspective via an
     arbitrary property [perspective:1000px].
   - delete unused API functions and AuthContext fields (accessToken, setUser if unused); remove
     `({} as DocumentItem)` with a proper optional type
   - run `npx tsc --noEmit && npm run lint` and fix everything

Tick FE-11, FE-12, FE-16, FE-19 and FE-21 in Code_Review.md.
```

---

# Final — deploy, test, close out

## P-18 · Deploy over HTTPS (same origin) · DEP-01, DEP-02, FE-23 · ~90 min

```text
Follow the "Ground rules" in docs/reviews/AGENT_PROMPTS.md. Fix Code_Review.md DEP-01, DEP-02 and FE-23.
Read architecture/00-overview.md "Deployment". Ask me (the user) which hosting provider to use before
creating any cloud resources, and never paste secrets into files that are committed.

1. FE-23, same origin:
   - In frontend/next.config.ts add rewrites:
     { source: "/api/v1/:path*/", destination: `${process.env.BACKEND_INTERNAL_URL}/api/v1/:path*/` }
     plus the same without the trailing slash, mapping to a trailing-slash destination (Django
     APPEND_SLASH). Set skipTrailingSlashRedirect: true.
   - Base URLs become relative: NEXT_PUBLIC_API_URL=/api/v1/auth and
     NEXT_PUBLIC_BACKEND_API_URL=/api/v1. Change the fallbacks in axios-client.ts to the same relative
     values. Update frontend/.env.example.
   - Do NOT add any ngrok-specific headers.
   - Backend: confirm that the AUTH cookie path /api/v1/auth/ still matches. CORS is no longer needed
     in prod (same origin), so keep CORS_ALLOWED_ORIGINS = [FRONTEND_URL] only.

2. DEP-02: create backend/config/settings/demo.py: `from .prod import *`. It may only relax
   SECURE_SSL_REDIRECT (when a tunnel terminates TLS) and use the console EMAIL_BACKEND if
   DEMO_CONSOLE_EMAIL=1. It must NOT set DEBUG=True, must NOT auto-verify accounts, and must NOT open
   ALLOWED_HOSTS or CORS. Add a test asserting demo.DEBUG is False and that ALLOWED_HOSTS does not
   contain "*".

3. DEP-01:
   - backend/Dockerfile (if P-08 didn't create it) and a gunicorn entry:
     `gunicorn config.wsgi --bind 0.0.0.0:$PORT --workers 3 --timeout 60`. Add gunicorn and whitenoise
     (for admin static) to requirements/base.txt with a reason. Set STATIC_ROOT, add whitenoise
     middleware in prod, and run collectstatic in the build step.
   - Release step: python manage.py migrate --noinput.
   - Processes: web (Next.js `npm run build && npm start`), api (gunicorn), worker, beat, plus managed
     Postgres and Redis.
   - Write the platform blueprint for the provider I choose: render.yaml for Render, or
     railway.json/Procfile for Railway.
   - Env vars, documented in docs/deployment.md with no secret values: DJANGO_SETTINGS_MODULE=
     config.settings.prod, SECRET_KEY, ALLOWED_HOSTS, FRONTEND_URL, DATABASE_URL, REDIS_URL, NUM_PROXIES,
     EMAIL_*, GOOGLE_CLIENT_ID, AI_PROVIDER=gemini, AI_API_KEY, VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY,
     VAPID_CLAIM_EMAIL, BACKEND_INTERNAL_URL, NEXT_PUBLIC_GOOGLE_CLIENT_ID, NEXT_PUBLIC_VAPID_PUBLIC_KEY.
   - Media: if the platform has no persistent disk, document that uploaded PDFs are deleted after
     processing, or configure a disk. Choose the simplest option that works and say which.
   - Google OAuth: add the production origin to "Authorized JavaScript origins" in Google Cloud Console
     (a manual step for me; put it in the checklist).

4. docs/deployment.md: a step-by-step checklist I can follow, ending with a smoke test:
   - open the URL on a phone and install it to the Home Screen
   - sign up, verify the email and log in
   - upload a PDF and see its summary
   - create a deck with 4 cards, take a quiz and see the score
   - turn on airplane mode and confirm the app shell opens
   - confirm NUM_PROXIES: log in from two different networks and check that both are not throttled
     together

Tick DEP-01, DEP-02 and FE-23 in Code_Review.md only after the app is actually live and the smoke test
passed. If it isn't deployed yet, leave them unticked with a Note (agent) line saying what remains.
```

## P-19 · Frontend E2E smoke tests + CI · FE-22, DEP-03 · ~60 min

```text
Follow the "Ground rules" in docs/reviews/AGENT_PROMPTS.md. Fix Code_Review.md FE-22 and DEP-03.

1. FE-22 Playwright:
   - npm i -D @playwright/test; npx playwright install chromium.
   - frontend/playwright.config.ts with baseURL http://localhost:3000 and webServer:
     `npm run build && npm start` (reuseExistingServer).
   - Test user: add a backend management command apps/accounts/management/commands/create_e2e_user.py
     that creates or updates a VERIFIED user from E2E_EMAIL and E2E_PASSWORD env vars. Tests call it in
     globalSetup via child_process, or document running it first. It must refuse to run when
     DEBUG=False and settings.ENVIRONMENT != "test" (or simply when using prod settings).
   - frontend/e2e/smoke.spec.ts:
     a) the landing page loads and /manifest.webmanifest returns 200 with name "SORA — Study Assistant"
     b) log in as the e2e user and land on /dashboard
     c) create a task, edit its title, tick it complete
     d) create a deck, add 4 cards with distinct answers, start a quiz with 5 questions (capped to 4),
        answer all, submit, and see the results page with "/ 4"
     e) go to settings and see the profile name
     f) log out, try to reach /dashboard, get redirected to /login
   - Add "test:e2e": "playwright test" to package.json (replace any old script pointing at
     ../scripts/verify_e2e.mjs).

2. DEP-03 .github/workflows/ci.yml on push and pull_request:
   - Job backend: services postgres:16 and redis:7; python 3.12; pip install -r
     requirements/dev.txt; ruff check .; ruff format --check .; pytest --cov=apps
     --cov-fail-under=90 (DJANGO_SETTINGS_MODULE=config.settings.test, DATABASE_URL pointing at the
     service).
   - Job frontend: node 20; npm ci; npx tsc --noEmit; npm run lint; npm run build.
   - (Optional, if quick) job e2e: depends on both; starts the backend with runserver plus a celery
     worker using AI_PROVIDER=mock; runs the playwright smoke test; uploads the report artifact.
   - Add a CI badge to README.md.

Run the e2e suite locally and report its result. Tick FE-22 and DEP-03 in Code_Review.md.
```

## P-20 · Close-out audit (run last) · ~30 min

```text
Follow the "Ground rules" in docs/reviews/AGENT_PROMPTS.md. You are doing the final close-out before
delivery. Do NOT add features.

1. Run the full verification and paste the outputs:
   backend: pytest -q; pytest --cov=apps --cov-report=term | tail -40; ruff check .; ruff format --check .;
            python manage.py makemigrations --check --dry-run; pip-audit -r requirements/base.txt
   frontend: npx tsc --noEmit; npm run lint; npm run build; npx playwright test (if set up)
2. Go through EVERY item in Code_Review.md. For each ticked item, spot-check that the fix exists in code
   (grep or read) and that a test covers it. Untick anything that isn't really done and add a
   "Note (agent)" line.
3. Go through every Test-plan checkbox in architecture/01–05: ticked items must have a test (grep for
   it). Untick any without one.
4. Update PROJECT_GOAL.md "Where we are now" with today's date and real numbers (tests, coverage, ruff,
   what's deployed, the live URL if any) and tick the "Definition of complete" items that are truly met.
5. Update README.md so a marker can run the project from scratch in under 10 minutes: prerequisites,
   env files, docker compose, migrate, create_e2e_user (optional), runserver, worker, beat, frontend,
   and the live URL.
6. Commit: "chore: delivery close-out". Report a final table of P0 items (ticked or unticked) and any
   risks I should mention in my presentation.
```

---

# Stretch prompts (only after every P0 is ticked)

## S-1 · Spaced repetition (SM-2) — the most impressive addition for a study app

```text
Follow the "Ground rules" in docs/reviews/AGENT_PROMPTS.md. FIRST write the spec: add a section
"## 10. Spaced repetition (v1.1)" to architecture/04-flashcards.md (data model, API, rules, test plan),
then implement it test-first.

- Model CardReview, or fields on Flashcard (choose one and justify it in the spec):
  ease_factor (float, default 2.5), interval_days (int, 0), repetitions (int, 0), due_at
  (datetime, default now), last_reviewed_at.
- SM-2 in apps/flashcards/srs.py, a pure function review(card_state, grade 0..5, now) → new state.
  Unit-test the known SM-2 sequences.
- API:
  - GET /api/v1/flashcards/due/?deck=<id> (cards with due_at <= now, max 50, ordered by due_at)
  - POST /api/v1/flashcards/{id}/review/ {grade: 0|3|4|5} mapping the UI buttons Again, Hard, Good,
    Easy
- Quiz integration: on quiz submit, a wrong answer → review(grade=1), a right one → review(grade=4) for
  the source card (if it still exists).
- Frontend: a "Due today: N" card on the dashboard home and a "Review" mode in the deck (flip, then
  Again/Hard/Good/Easy) using these endpoints.
- Tick in the spec as you go. Add a Code_Review.md item "S-1 Spaced repetition" (ticked when done).
```

## S-2 · OpenAPI docs

```text
Follow the "Ground rules". Add drf-spectacular (requirements/base.txt, with a reason): SCHEMA at
/api/v1/schema/ and Swagger UI at /api/docs/, enabled when DEBUG or settings.EXPOSE_API_DOCS is True.
Add @extend_schema where the serializers don't describe the request (actions like start-quiz, submit,
generate-flashcards and retry). Add a test that /api/v1/schema/ returns 200 in dev settings. Link it
from README.md.
```

## S-3 · "Retake my mistakes" + adaptive quiz selection

```text
Follow the "Ground rules". Spec first (architecture/05-quiz.md §5 rule 2, the "Stretch" note): add
`mode: "random" | "mistakes" | "adaptive"` to start-quiz.
- mistakes: only cards answered wrong in the user's most recent finished session for that deck
  (400 no_mistakes if none).
- adaptive: weight sampling by (1 + wrong_count) / (1 + right_count) over the user's history for each
  card.
Tests, then frontend: a "Retake mistakes" button on the results screen and a mode select on start.
```
