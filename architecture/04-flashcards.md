# 04 — Flashcards

**Status:** STUB — write the full spec (template in `00-overview.md`) and get it reviewed before building.
**Django app:** `apps.flashcards`
**SRS refs:** §3.5 Flashcards
**Depends on:** 01-authentication

## SRS requirements to cover
- FR-4.1 Create flashcard
- FR-4.2 Edit flashcard
- FR-4.3 Delete flashcard
- FR-4.4 View flashcards by subject

## Initial thinking (to be confirmed in the spec)
- `Subject`: id, owner, name (unique per owner), timestamps.
- `Flashcard`: id, owner, subject FK, question, answer, timestamps.
- `GET /flashcards/?subject=<id>`. Subjects CRUD, with card counts.

## Open questions
- Spaced repetition (e.g. SM-2) in v1 or later? Should subjects be shared with tasks?
