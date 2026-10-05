# 03 — PDF Summary

Status: DRAFT

## 1. Purpose
The PDF Summarizer allows students to upload PDF documents, asynchronously extract the text, and generate an AI-powered summary. This system relies on a Celery + Redis task queue to keep API response times under 2 seconds.

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
- `error_message`: TextField(blank=True) - Populated if status=FAILED
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
Response: 200 OK (Paginated list of documents with their `status`).

### `GET /{id}/`
Retrieve document status and its summary (if done).
Response: 200 OK
Payload includes: `{ id, original_name, status, error_message, summary: { content, ... } }`

### `DELETE /{id}/`
Delete a document and its summary.
Response: 204 No Content

## 5. Business rules
1. **File Validation:** Files must be PDFs. Files exceeding a certain size (e.g., 10MB) should be rejected synchronously at the API level before saving.
2. **Asynchronous Pipeline:** 
   - Step 1: `pypdf` is used inside a Celery task to extract text and count pages.
   - Step 2: The extracted text is passed to an AI Service interface.
   - Step 3: A `Summary` is created, and the Document status becomes `DONE`.
   - If any step fails, status becomes `FAILED` and `error_message` is set.
3. **Storage:** Cloudflare R2 (S3-compatible) will be used in production. Local storage will be used in development.

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

## 8. Out of scope
- Generating Flashcards or Quizzes directly from the Summary (will be handled in Systems 04 and 05).
- OCR for image-only PDFs (we rely on embedded text only for now).

## 9. Open questions
- Which AI model provider will we use for the summary? (e.g., OpenAI, Anthropic, Google Gemini). 
  *Recommendation:* We can build a generic `SummarizerClient` interface and mock it in tests. We can decide on the specific provider when we wire up the real API.
