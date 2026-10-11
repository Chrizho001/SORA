# Senior Engineering Review

**Scope:** Django backend in this checkout. This is a static code review; tests and production query plans were not run. The frontend referenced by the project docs is not present in this checkout.

Severity describes the likely impact if the relevant code is used as written. Deployment-specific items are marked accordingly.

## High priority

### 1. Password changes do not revoke existing sessions

- **Location:** `backend/apps/accounts/services.py:150`
- **Issue:** `change_password()` saves the new password and updates `last_login`, but does not blacklist outstanding refresh tokens. Existing access tokens also remain valid until their expiry. A password change therefore does not end sessions on other devices.
- **Recommended fix:** Blacklist all outstanding refresh tokens for the user when their password changes, as the password-reset flow already attempts to do. If access tokens must be invalidated immediately, add a token-version/revocation mechanism; otherwise document that access tokens remain valid until expiry.

### 2. Push subscriptions allow server-side requests to client-provided URLs

- **Locations:** `backend/apps/notifications/serializers.py:10`; `backend/apps/notifications/tasks.py:33`
- **Issue:** A client can register an arbitrary endpoint, which the server later passes to the web-push client. This creates a server-side request forgery (SSRF) risk against internal or otherwise sensitive services.
- **Recommended fix:** Require HTTPS and reject private, loopback, link-local, and other non-public destinations. Enforce equivalent outbound network restrictions so validation is not the only defense.

### 3. PDF upload validation trusts the client-declared MIME type

- **Locations:** `backend/apps/documents/serializers.py:49`; `backend/apps/documents/tasks.py:24`
- **Issue:** The upload accepts files based on the client-supplied `content_type` and a 10 MB size limit. The worker parses the file without checking its signature or bounding page count and extracted text. Crafted files can consume excessive CPU or memory, and extracted content is accumulated and stored in full.
- **Recommended fix:** Check the PDF signature and parseability, enforce page and extracted-text limits, and apply parser time/memory limits or isolation. Keep the existing upload-size limit.

### 4. Production security settings are unfinished (deployment-dependent)

- **Locations:** `backend/config/settings/prod.py:10`; `backend/config/settings/base.py:159`
- **Issue:** Production settings disable `DEBUG` and enable secure auth cookies, but explicitly leave HTTPS redirect and HSTS unconfigured. The base refresh-cookie setting defaults to `Secure=False`. The production settings file is marked as a stub, so this is a deployment gap rather than evidence of a live exposure.
- **Recommended fix:** Before deployment, configure HTTPS redirect and HSTS for the actual hosting/proxy setup, ensure all authentication/session cookies use secure attributes, and complete the production email and static-file configuration. Add a deployment check that fails if these settings are missing.

## Medium priority

### 5. Quiz list/detail serialization has N+1 queries

- **Locations:** `backend/apps/quizzes/views.py:17`; `backend/apps/quizzes/serializers.py:23`
- **Issue:** The queryset returns quiz sessions without prefetching their questions. The serializer then loads each session's questions and each question's flashcard separately. Query count grows with the number of sessions and questions returned.
- **Recommended fix:** Add `prefetch_related("questions__flashcard")` to the quiz-session queryset. Verify list and detail query counts with representative data.

### 6. Document list serialization may query once per summary

- **Locations:** `backend/apps/documents/views.py:13`; `backend/apps/documents/serializers.py:11`
- **Issue:** The document serializer includes the reverse one-to-one `summary`, but the queryset does not load it up front. A page of documents can issue an additional summary query per document.
- **Recommended fix:** Use `select_related("summary")` in the document queryset and confirm the query count for a populated page.

### 7. Quiz generation does quadratic work and has no size cap

- **Location:** `backend/apps/documents/views.py:56`
- **Issue:** The endpoint loads every flashcard into memory, then scans the full list and shuffles candidate distractors for each card. Work grows roughly with the square of the card count, and the response contains the full quiz.
- **Recommended fix:** Set a maximum quiz size and sample distractors without rescanning and shuffling the entire collection for each question. Consider keeping quiz history responses separate from full quiz-detail responses.

### 8. Quiz submissions are not validated as a complete, consistent answer set

- **Location:** `backend/apps/quizzes/views.py:27`
- **Issue:** The endpoint accepts raw answer data, marks the session finished even when answers are missing, and scores only submitted entries. Duplicate question IDs can be processed more than once, and selected answers are not checked against the choices offered for that question.
- **Recommended fix:** Validate the payload with a serializer. Reject malformed entries and duplicate question IDs, define how missing answers affect scoring, and ensure every selected answer belongs to that question's choices.

### 9. Task date filtering can prevent use of the `due_at` index

- **Locations:** `backend/apps/tasks/views.py:26`; `backend/apps/tasks/models.py:24`
- **Issue:** `due_at__date` applies a date conversion to the database column. On PostgreSQL this commonly prevents a regular index on `due_at` from serving the filter efficiently. The model already has a `(user, due_at)` index, and the `from`/`to` filters use ranges.
- **Recommended fix:** Convert the requested date into start/end timestamps in the intended timezone and filter with a range. Confirm with `EXPLAIN ANALYZE` on representative task volumes.

### 10. Quiz-session index does not match the list filter and ordering

- **Locations:** `backend/apps/quizzes/views.py:17`; `backend/apps/quizzes/models.py:16`
- **Issue:** The list filters by `user` and orders by `created_at`, while the explicit composite index is `(user, document)`. The user foreign key has its own index, but PostgreSQL may still need to sort each user's sessions.
- **Recommended fix:** Check the list query plan at realistic volumes. If sorting is material, consider an index on `(user, created_at)`; weigh its write/storage cost before adding it.

### 11. Raw document-processing exceptions are returned through the API

- **Locations:** `backend/apps/documents/tasks.py:66`; `backend/apps/documents/serializers.py:22`
- **Issue:** The worker stores `str(e)` in `error_message`, and the document serializer returns it to the user. Parser and storage exceptions can reveal internal paths or implementation details.
- **Recommended fix:** Log detailed exceptions server-side with the document ID. Return a stable, user-safe error code or message in the API.

### 12. Auth throttling may not be shared across workers

- **Location:** `backend/config/settings/base.py:122`
- **Issue:** DRF throttling is configured, but no shared cache configuration is visible. Django's default cache is process-local, so limits can be inconsistent across workers or application instances.
- **Recommended fix:** Use a shared cache such as Redis for production throttles. Confirm that login, registration, email, and password endpoints each use the intended throttle scope.

## Lower priority / validate with workload data

### 13. Notification and flashcard indexes may not cover list ordering

- **Locations:** `backend/apps/notifications/models.py:28`; `backend/apps/notifications/views.py:13`; `backend/apps/flashcards/models.py:13`; `backend/apps/flashcards/views.py`
- **Issue:** Notifications are filtered by recipient and ordered by creation time, while the explicit index is `(recipient, read_at)`. Flashcard lists filter by user and optionally document, then order by creation time; their explicit composite index is `(user, document)`. Existing foreign-key indexes may be adequate at current scale, but these indexes do not directly cover all filter/order combinations.
- **Recommended fix:** Inspect query plans with representative data before adding indexes. If sorting becomes material, evaluate indexes that include `created_at` for the actual list query shapes.

### 14. Local Compose database credentials are fixed and its port is broadly published

- **Location:** `docker-compose.yml:5`
- **Issue:** Compose publishes PostgreSQL on port 5432 and stores a fixed password in the file. This is convenient locally, but could expose the database if the configuration is used on a reachable host.
- **Recommended fix:** Bind the development port to localhost and source credentials from environment variables. Never reuse these values in shared or deployed environments.

## Functional readiness gaps

### 15. PDF summarization and flashcard generation clients are stubs

- **Locations:** `backend/apps/documents/ai.py`; `backend/apps/flashcards/tasks.py`
- **Issue:** `SummarizerClient.summarize()` and `FlashcardGeneratorClient.generate()` raise `NotImplementedError`. As written, PDF processing fails at summarization and flashcard generation cannot complete unless these clients are implemented or replaced at runtime.
- **Recommended fix:** Implement the service adapters and configure their credentials securely, or clearly mark these flows as unavailable until an implementation is installed. Keep external service calls behind wrappers that can be mocked in tests.

### 16. Background task runtime dependencies are not visible in this checkout

- **Locations:** `backend/apps/documents/views.py:26`; `docker-compose.yml`
- **Issue:** API endpoints enqueue Celery work with `.delay()`, but the Compose file only defines PostgreSQL, and no Celery app/broker configuration was found in the checked-in project files. Without a configured broker and worker, queued processing may fail or never run.
- **Recommended fix:** Add and document the Celery application configuration, broker settings, and worker process/service. Include the broker and worker in the local deployment setup, or document the external runtime that provides them.

## Positive practices observed

- User-owned querysets are generally scoped to the authenticated user.
- UUID primary keys are used for public-facing models.
- Argon2 is configured as the first password hasher.
- Refresh tokens are placed in an HttpOnly cookie rather than returned for browser storage.
- Several common access paths already have explicit indexes, and quiz submission uses `select_related` for flashcards while processing answers.
