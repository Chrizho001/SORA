# 03 — PDF Summary

**Status:** STUB — write the full spec (template in `00-overview.md`) and get it reviewed before building.
**Django app:** `apps.documents`
**SRS refs:** §3.4 PDF Summarizer, §2.1 (third-party AI), §2.4 (internet required, API rate limits), §2.5 (PDFs are readable)
**Depends on:** 01-authentication

## SRS requirements to cover
- FR-3.1 Upload PDF
- FR-3.2 Extract text
- FR-3.3 Generate summary (third-party AI service)
- FR-3.4 Display summary

## Initial thinking (to be confirmed in the spec)
- `Document`: id, owner, file, original_name, size, page_count, extracted_text, status (uploaded/processing/done/failed), error, timestamps.
- `Summary`: document FK, content, model used, timestamps.
- Extraction with `pypdf`. Summarisation is **asynchronous** (job queue) to meet the 2–3 s NFR; the client polls status.
- The AI provider sits behind a `SummarizerClient` interface so tests use a fake. No network in tests.
- Limits: max file size and pages; reject non-PDF/encrypted/image-only PDFs with clear error codes.

## Open questions
- AI provider and model? Task queue (Celery + Redis vs. django-q2 vs. Django 5.x tasks)? File storage (local vs. S3)?
- Generate flashcards/quiz questions from a summary (link to 04/05)?
