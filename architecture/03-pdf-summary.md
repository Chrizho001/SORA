# 03 — PDF Summary

Status: READY (implemented; Group 3 added 2026-10-25)

## 1. Purpose
The PDF Summarizer allows students to upload PDF documents, asynchronously extract the text, and generate an AI-powered summary. This system relies on a Celery + Redis task queue (worker + beat processes) to keep API response times under 2 seconds.

## 2. Requirements
- FR-3.1 Upload PDF (§3.4)
- FR-3.2 Extract text (§3.4)
- FR-3.3 Generate summary using third-party AI (§3.4)
- FR-3.4 Display summary (§3.4)
- NFR-1  Performance (respond < 2s; hence async queue)
- NFR-4  Reliability (handle extraction and AI errors gracefully)

## 3. Data model
### `Document`
- `id`: UUID (Primary Key)
- `user`: ForeignKey to `User` (on_delete=CASCADE, index)
- `file`: FileField(upload_to="documents/%Y/%m/")
- `original_name`: CharField(max_length=255)
- `size`: IntegerField (bytes)
- `page_count`: IntegerField(null=True)
- `extracted_text`: TextField(blank=True)
- `status`: CharField choices (UPLOADED, PROCESSING, DONE, FAILED) default=UPLOADED
- `error_message`: TextField(blank=True) — populated if status=FAILED; **only fixed, user-safe messages** (rule 5)
- `processing_started_at`: DateTimeField(null=True) — set when a worker claims the document; used to detect stale jobs (new)
- `flashcard_generation_status` / `flashcard_generation_started_at` — see `04-flashcards.md`
- `created_at`: DateTimeField(auto_now_add=True)
- `updated_at`: DateTimeField(auto_now=True)

### `Summary`
- `id`: UUID (Primary Key)
- `document`: OneToOneField to `Document` (on_delete=CASCADE, related_name="summary")
- `content`: TextField()
- `ai_model_used`: CharField(max_length=100)
- `created_at`: DateTimeField(auto_now_add=True)

## 4. API endpoints
Base path: `/api/v1/documents/`
Auth: Required (`IsAuthenticated`)

### `POST /`
Upload a new PDF.
Request: `multipart/form-data` with a `file` field.
Response: 202 Accepted.
*Side-effect:* Creates the `Document`, saves the file, and queues the Celery task. Returns the `Document` metadata (status: `UPLOADED`).

### `GET /`
List documents for the authenticated user.
Response: 200 OK (paginated). The list payload is **lightweight**: `{id, original_name, size, page_count, status, error_message, flashcard_generation_status, has_summary, created_at}`. No summary content and no extracted text. Fixed number of queries (`select_related("summary")`, `defer("extracted_text")`).

### `POST /{id}/retry/`
Re-queue a document. Allowed only if `status=FAILED`, or `UPLOADED`/`PROCESSING` with `processing_started_at` older than 10 minutes (stale). Atomic conditional UPDATE claim; enqueue on commit.
Responses: 202 · 409 `document_processing` (a fresh job is running) · 400 `document_not_retryable` (already DONE) · 404 · 429 (`ai_jobs` scope; retries count against the AI budget).

### `GET /{id}/`
Retrieve document status and its summary (if done).
Response: 200 OK
Payload includes: `{ id, original_name, status, error_message, summary: { content, ... } }`

### `DELETE /{id}/`
Delete a document and its summary. Decks and cards created from it are kept (their `document` becomes NULL).
Response: 204 No Content

`PUT`/`PATCH` are not supported (405).

## 5. Business rules
1. **File Validation:** Files must be PDFs. Files exceeding a certain size (e.g., 10MB) should be rejected synchronously at the API level before saving.
2. **Asynchronous Pipeline:** 
   - Step 1: `pypdf` is used inside a Celery task to extract text and count pages.
   - Step 2: The extracted text is passed to an AI Service interface.
   - Step 3: A `Summary` is created, and the Document status becomes `DONE`.
   - If any step fails, status becomes `FAILED` and `error_message` is set.
3. **Storage:** local `MEDIA_ROOT` in development; in production a persistent disk or S3-compatible bucket (e.g. Cloudflare R2), private, never served publicly.
4. **Queueing:** the upload is saved in `transaction.atomic()` and `process_document.delay()` runs in `transaction.on_commit`. If enqueueing raises, the document becomes `FAILED` ("Failed to queue document processing.").
5. **Error messages:** `error_message` and notifications carry only fixed, friendly texts (e.g. "PDF is encrypted…", "PDF is too long (N pages; maximum M)", "AI service error. Please try again later."). Provider bodies and exception strings are logged and never shown.
6. **Idempotency (Celery `acks_late`):** a task for a document already `DONE` with a summary is a no-op. The summary is written with `update_or_create` under `select_for_update`. Failure handlers re-fetch the row under lock, never overwrite `DONE`, and return quietly if the document was deleted.
7. **AI provider:** `AI_PROVIDER` = `gemini` (default) | `groq` | `mock` (tests/dev only; refused in prod). Gemini receives the PDF bytes **only** when no text could be extracted (scanned PDFs).
8. **Limits:** ≤ 10 MB (`MAX_UPLOAD_SIZE`), body ≤ 12 MB (rejected early, 413), ≤ `MAX_PDF_PAGES` pages, extracted text capped at `AI_MAX_PROMPT_CHARS` for the prompt, empty file → 400 `file_empty`.

## 6. Security & permissions
- All endpoints require authentication (`IsAuthenticated`).
- Documents are strictly scoped to the uploading user (no sharing).
- In production, R2 buckets will be private, and files will only be accessible to the backend (or via pre-signed URLs if direct download is needed later).

## 7. Test plan (TDD)
### Group 1 — Upload & Validation
- [x] POST `/` with a valid PDF returns 202, creates `Document`, and queues a Celery task
- [x] POST `/` with a non-PDF file returns 400 `invalid_file_type`
- [x] POST `/` with a file > 10MB returns 400 `file_too_large`
- [x] GET `/` lists the user's documents
- [x] GET `/{id}/` returns 404 for another user's document
- [x] DELETE `/{id}/` deletes the document (and cleans up the file)

### Group 2 — Celery Task Pipeline
- [x] Task successfully extracts text, generates summary via a mocked AI service, and marks status as `DONE`
- [x] Task marks status as `FAILED` and sets `error_message` if PDF extraction fails (e.g., encrypted or image-only)
- [x] Task marks status as `FAILED` if the mocked AI service raises an exception (e.g., rate limit)

### Group 3 — Robustness (added 2026-10-25)
- [ ] Upload enqueues on commit; broker failure → document `FAILED`, response still 202
- [ ] Duplicate task delivery for a DONE document is a no-op (status stays DONE, one Summary)
- [ ] Retry: FAILED → 202; DONE → 400 `document_not_retryable`; fresh PROCESSING → 409; stale PROCESSING → 202
- [ ] An exception containing `SECRET-INTERNAL` never appears in `error_message` or the notification
- [ ] Empty file → 400 `file_empty`; Content-Length > 12 MB → 413
- [ ] List endpoint: constant query count for 1 vs 5 documents; no `summary.content` in list items
- [ ] PATCH → 405
- [ ] AI clients: success, 401/403, 429, 503-then-success retry, timeout and invalid JSON (patched `requests.post`)

## 8. Out of scope
- Flashcard generation and quizzes (see `04-flashcards.md`, `05-quiz.md`).
- OCR for image-only PDFs (we rely on embedded text only for now).

## 9. Open questions
- None. Provider decided: Google Gemini (`AI_PROVIDER=gemini`), behind the `get_summarizer()` interface.
