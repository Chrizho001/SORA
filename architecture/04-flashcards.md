# 04 — Flashcards & Decks

Status: READY (rewritten 2026-10-25, see ADR 0003)

## 1. Purpose
Students create their own flashcards and organise them into **Decks** (a deck is the "subject" in
SRS §3.5). AI generation is an optional shortcut: it reads the summary of one of the student's PDFs and
**adds** suggested cards to a deck, where the student can edit or delete them like any other card.
Decks are what quizzes are built from (`05-quiz.md`).

## 2. Requirements
- FR-4.1 Create flashcard manually (SRS §3.5 "Create flashcard")
- FR-4.2 Edit flashcard (SRS §3.5)
- FR-4.3 Delete flashcard (SRS §3.5)
- FR-4.4 View flashcards by subject = by deck (SRS §3.5)
- FR-4.5 Create, rename and delete decks
- FR-4.6 Generate flashcards with AI from a document summary into a deck (optional; appends, never replaces)
- NFR-1 Performance: list endpoints use a fixed number of queries; AI generation is asynchronous (Celery)
- NFR-3 Security: every deck and card is scoped to its owner; another user's object returns 404

## 3. Data model

### `Deck` (`apps.flashcards.models.Deck`)
| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user` | FK → User, CASCADE | owner |
| `title` | CharField(120) | required, trimmed, 1–120 chars |
| `description` | TextField(blank=True) | ≤ 1000 chars (serializer) |
| `document` | FK → `documents.Document`, **SET_NULL**, null | optional source PDF (enables "Generate with AI") |
| `created_at` / `updated_at` | DateTime | `updated_at` is bumped when a card in the deck is added, edited or deleted |

Constraints and indexes:
- `UniqueConstraint(Lower("title"), "user", name="uniq_deck_title_per_user")`: a duplicate title returns
  400 `deck_title_taken`.
- `Index(fields=["user", "-updated_at"])`.

### `Flashcard` (`apps.flashcards.models.Flashcard`)
| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user` | FK → User, CASCADE | owner (always equals `deck.user`) |
| `deck` | FK → `Deck`, CASCADE, related_name=`cards` | **required** |
| `document` | FK → `documents.Document`, **SET_NULL**, null | provenance for AI cards only |
| `question` | TextField | 1–500 chars after trim |
| `answer` | TextField | 1–500 chars after trim |
| `source` | CharField choices `MANUAL` / `AI`, default `MANUAL` | read-only via API |
| `created_at` / `updated_at` | DateTime | |

Indexes: `Index(fields=["user", "deck"])`. Ordering: `created_at`.

### `Document` (unchanged fields, used here)
`flashcard_generation_status` (`NOT_STARTED|GENERATING|DONE|FAILED`) and `flashcard_generation_started_at`
stay on `Document`. The frontend polls them while AI generation runs.

### Migration plan (existing data)
1. Add `Deck`, then add `Flashcard.deck` (nullable), `Flashcard.source` (default `AI` for existing rows),
   and make `Flashcard.document` nullable with SET_NULL.
2. Data migration: for each document that has flashcards, create
   `Deck(user=doc.user, title=<original_name without .pdf, de-duplicated with " (2)">, document=doc)`
   and attach its cards.
3. Make `Flashcard.deck` non-nullable.

## 4. API endpoints
Auth: required (`IsAuthenticated`). Pagination: standard (`page_size=20`). Errors: standard envelope.

### Decks — `apps/flashcards/urls_decks.py`, mounted at `/api/v1/decks/` (namespace `decks`)
| Method & path | Name | Request | Responses |
|---|---|---|---|
| `GET /decks/` | `decks:deck-list` | `?document=<uuid>` optional | 200 paginated `[{id, title, description, document, document_name, card_count, created_at, updated_at}]` ordered `-updated_at`; `card_count` via `annotate(Count("cards"))` |
| `POST /decks/` | `decks:deck-list` | `{title, description?, document?}` | 201 deck · 400 `validation_error` / `deck_title_taken` · 400 if `document` isn't the user's (scoped queryset → "Invalid pk") |
| `GET /decks/{id}/` | `decks:deck-detail` | | 200 deck · 404 |
| `PATCH /decks/{id}/` | `decks:deck-detail` | `{title?, description?}` | 200 · 400 · 404 |
| `DELETE /decks/{id}/` | `decks:deck-detail` | | 204. Cards are deleted; quiz history is kept (`QuizSession.deck` SET_NULL) · 404 |
| `POST /decks/{id}/generate-flashcards/` | `decks:deck-generate-flashcards` | `{count?: 5–20, default 10}` | 202 `{status: "GENERATING"}` · 400 `no_source_document` (deck has no document) · 400 `summary_not_ready` (document not `DONE`) · 409 `generation_in_progress` · 404 · 429 (`ai_jobs` throttle) |
| `POST /decks/{id}/start-quiz/` | `decks:deck-start-quiz` | see `05-quiz.md` | |

### Flashcards — `/api/v1/flashcards/` (namespace `flashcards`)
| Method & path | Name | Request | Responses |
|---|---|---|---|
| `GET /flashcards/` | `flashcards:flashcard-list` | `?deck=<uuid>` (validated UUID → 400 on bad format) | 200 paginated `[{id, deck, document, question, answer, source, created_at, updated_at}]` |
| `POST /flashcards/` | `flashcards:flashcard-list` | `{deck, question, answer}` | 201 · 400 (blank or too long; deck not owned → "Invalid pk") |
| `GET /flashcards/{id}/` | `flashcards:flashcard-detail` | | 200 · 404 |
| `PATCH /flashcards/{id}/` | `flashcards:flashcard-detail` | `{question?, answer?, deck?}` (moving to another **owned** deck is allowed) | 200 · 400 · 404 |
| `DELETE /flashcards/{id}/` | `flashcards:flashcard-detail` | | 204 · 404 |

`source` and `document` are read-only. `deck` querysets in serializers are always
`Deck.objects.filter(user=request.user)`.

### Legacy endpoint
`POST /documents/{id}/generate-flashcards/` is kept as a convenience. It gets or creates the document's
deck (`Deck(document=doc)`, title from the file name) and then behaves exactly like
`POST /decks/{id}/generate-flashcards/`. Its response includes `deck_id`.

## 5. Business rules
1. **Manual cards are first-class.** Every create, edit or delete works on manual and AI cards alike.
2. **AI generation appends and never deletes.** New cards are added with `source=AI` and
   `document=deck.document`. A generated card is skipped if its normalised question
   (`" ".join(q.casefold().split())`) already exists in the deck.
3. **AI input:** the document's `Summary.content`. If the summary is under 1,500 chars, the first 12,000
   chars of `extracted_text` are added. The prompt asks for exactly `count` cards, each with **one fact per
   card**, a question ≤ 200 chars, and an answer ≤ 25 words, returned as JSON
   `{"flashcards":[{"question","answer"}]}`. Output is validated (`validate_flashcards_data`); invalid
   items are dropped, and if fewer than 1 valid card remains the job fails.
4. **Async state:** the claim is atomic (conditional UPDATE on `flashcard_generation_status`, stale after
   10 minutes). The task sets `DONE` or `FAILED` and sends a `FLASHCARDS_READY` notification (body
   "N flashcards added to '<deck>'") or `FLASHCARDS_FAILED` with a fixed, friendly body. Raw provider
   errors are never stored or sent.
5. Limits: at most 500 cards per deck (400 `deck_full`) and at most 200 decks per user (400 `deck_limit`).
6. Editing or deleting a card never changes past quiz results (quiz questions snapshot their text, see 05).
7. Deleting a document sets `Deck.document` and `Flashcard.document` to NULL. The deck and its cards stay.

## 6. Security & permissions
- All querysets are filtered by `request.user`. Another user's deck or card returns **404**.
- Referenced objects (`deck`, `document`) are validated through user-scoped querysets.
- `generate-flashcards` uses the `ai_jobs` throttle scope. Create and edit use the default user throttle.
- User text is stored as plain text, and the frontend renders it as text, never as HTML.

## 7. Test plan (TDD)
### Group 1 — Deck CRUD (`test_api_decks.py`)
- [ ] POST `/decks/` creates a deck (201) owned by the user
- [ ] POST with blank title → 400; duplicate title (case-insensitive) → 400 `deck_title_taken`
- [ ] POST with another user's `document` → 400
- [ ] GET `/decks/` lists only own decks, includes `card_count`, constant query count for 1 vs 5 decks
- [ ] PATCH renames; DELETE → 204 and deletes its cards; another user's deck → 404 on GET, PATCH and DELETE

### Group 2 — Manual flashcard CRUD (`test_api_flashcards.py`)
- [ ] POST `/flashcards/` with own deck → 201, `source=MANUAL`
- [ ] POST with another user's deck → 400; blank or > 500-char question or answer → 400
- [ ] GET `/flashcards/?deck=<id>` filters; bad UUID → 400
- [ ] PATCH edits question and answer; PATCH `deck` to another owned deck moves the card; to a foreign deck → 400
- [ ] DELETE → 204; another user's card → 404 on GET, PATCH and DELETE
- [ ] `source` and `document` are read-only (ignored on POST and PATCH)

### Group 3 — AI generation into a deck (`test_api_generate.py`, `test_tasks.py`)
- [ ] Deck without a document → 400 `no_source_document`; document not DONE → 400 `summary_not_ready`
- [ ] Valid request → 202, status `GENERATING`; second request while generating → 409
- [ ] Task (mock AI) **appends** cards with `source=AI`; existing manual cards are untouched
- [ ] Task skips questions already present in the deck (normalised match)
- [ ] Task failure → status `FAILED`, `FLASHCARDS_FAILED` notification, no raw error text in body or data
- [ ] Legacy `POST /documents/{id}/generate-flashcards/` creates or reuses the document's deck and returns `deck_id`

### Group 4 — Migration
- [ ] Data migration test: a document with cards gets exactly one deck containing them; documents
      without cards get none

## 8. Out of scope
- Spaced-repetition scheduling (SM-2 / Leitner): candidate stretch goal, see PROJECT_GOAL "Stretch".
- Sharing decks between students. Images or rich text on cards. Import and export (CSV/Anki).

## 9. Open questions
- None. Decisions recorded in ADR 0003.
