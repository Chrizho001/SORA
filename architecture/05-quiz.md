# 05 — Quiz Mode

Status: READY (rewritten 2026-10-25, see ADR 0003)

## 1. Purpose
Students test themselves on a **deck**. The server builds a multiple-choice quiz from the deck's cards:
the card's answer is the correct choice, and three other answers from the same deck are the distractors.
The server grades the submission. The correct answers are never sent to the client before submission.

## 2. Requirements
- FR-5.1 Start quiz from a deck (SRS §3.6 "Start quiz")
- FR-5.2 Answer questions; the server grades them (SRS §3.6 "Answer questions")
- FR-5.3 View score and per-question breakdown (SRS §3.6 "View score")
- FR-5.4 View quiz history (PROJECT_GOAL "results history")
- NFR-3 Security: answers hidden until submitted; sessions scoped to owner

## 3. Data model

### `QuizSession`
| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user` | FK → User, CASCADE | |
| `deck` | FK → `flashcards.Deck`, **SET_NULL**, null | history survives deck deletion |
| `deck_title` | CharField(120) | snapshot at start |
| `document` | FK → Document, SET_NULL, null | **legacy**; kept for old rows, not set on new sessions |
| `score` | Integer, null | set on submit |
| `total_questions` | Integer | |
| `created_at` | DateTime | |
| `finished_at` | DateTime, null | |

Index: `Index(fields=["user", "-created_at"])`.
Migration: existing sessions get `deck` = the deck created for their document (04 migration) and
`deck_title` = that deck's title. If there is none, `deck_title` = the document name or "Deleted deck".

### `QuizQuestion` (unchanged, already snapshots)
`session` FK CASCADE · `flashcard` FK SET_NULL, null · `question_text` · `correct_answer` · `choices`
(JSON list of 4 strings) · `selected_choice` (null) · `is_correct` (null). Ordering: `position`
(new SmallInteger, 0-based) so the client shows questions in a stable order.

## 4. API endpoints
Auth: required.

### `POST /api/v1/decks/{id}/start-quiz/` — `decks:deck-start-quiz`
Request: `{ "question_count"?: 1–50, default 10 }`
| Status | When |
|---|---|
| 201 | Session created. Body = session with `questions: [{id, position, question_text, choices}]`. **No** `correct_answer`, `is_correct`, or `flashcard` id |
| 400 `not_enough_flashcards` | deck has fewer than 4 cards **or** fewer than 4 distinct answers (normalised) |
| 404 | deck not found or not owned |
| 429 | `quiz_create` throttle (30/hour) |

`POST /documents/{id}/start-quiz/` is **removed**.

### `GET /api/v1/quiz-sessions/` — `quizzes:quizsession-list`
Lightweight list: `[{id, deck, deck_title, score, total_questions, created_at, finished_at}]`. No
questions. Fixed number of queries.

### `GET /api/v1/quiz-sessions/{id}/` — `quizzes:quizsession-detail`
Unfinished: questions without answers. Finished: each question has `selected_choice`, `is_correct`, and
`correct_answer`. `prefetch_related("questions")`.

### `POST /api/v1/quiz-sessions/{id}/submit/` — `quizzes:quizsession-submit`
Request: `{ "answers": [ { "question_id": "uuid", "selected_choice": "string" } ] }` (0..N items).
| Status | When |
|---|---|
| 200 | graded session (finished payload) |
| 400 `duplicate_question` | a `question_id` appears twice |
| 400 `invalid_question` | a `question_id` is not in this session |
| 400 `invalid_choice` | `selected_choice` is not one of that question's `choices` |
| 409 `quiz_already_finished` | already submitted |
| 404 | not found or not owned |

On any 400 the session stays unfinished.

## 5. Business rules (generation policy)
1. **Eligibility:** the deck needs ≥ 4 cards whose answers are **distinct** after normalisation
   (`" ".join(a.casefold().split())`).
2. **Question selection:** `n = min(question_count, eligible cards)`. Cards are sampled at random without
   replacement. (Stretch: weight toward cards the user previously answered wrong.)
3. **Distractors:** for each question, the candidates are the other cards' answers whose normalised text
   differs from the correct answer's and from each other. Pick 3, preferring answers of similar length:
   sort candidates by `abs(len(candidate) - len(correct))`, take the closest 6, then choose 3 at random.
   This stops the answer from standing out by length.
4. Choices are shuffled. The correct answer's index is never stored client-side.
5. Each question snapshots `question_text` and `correct_answer`, so editing or deleting cards never
   changes past results.
6. **Grading:**
   - Each question counts at most once.
   - Unanswered questions are `is_correct=False`.
   - `score` is the number correct, and `0 ≤ score ≤ total_questions`.
   - `finished_at` is set atomically: a conditional UPDATE on `finished_at IS NULL`, so a double submit
     returns 409.
7. On submit, send a `QUIZ_GRADED` notification: "You scored S/T on '<deck_title>'". A notification
   failure never fails the submit.

## 6. Security & permissions
- Only owned decks can be quizzed. Only owned sessions can be viewed or submitted (others → 404).
- Correct answers, `is_correct` and flashcard ids are **never** in an unfinished session payload.
- Throttles: `quiz_create` 30/hour, `quiz_submit` 30/min.

## 7. Test plan (TDD)
### Group 1 — Start quiz
- [x] Deck with < 4 cards → 400 `not_enough_flashcards`
- [x] Deck with ≥ 4 cards but < 4 distinct answers → 400 `not_enough_flashcards`
- [x] Valid start → 201; `question_count` respected (default 10, capped at the eligible cards)
- [x] Each question has 4 **distinct** choices including the correct answer
- [x] Unfinished payload contains no `correct_answer`, `is_correct` or `flashcard`
- [x] Another user's deck → 404

### Group 2 — Submit and grading
- [x] All correct → score = total; `finished_at` set; `QUIZ_GRADED` notification created
- [x] Duplicate `question_id` → 400 `duplicate_question`, session still unfinished
- [x] Foreign `question_id` → 400 `invalid_question`
- [x] `selected_choice` not in choices → 400 `invalid_choice`
- [x] Partial or empty submission → unanswered graded incorrect, score counts answered-correct only
- [x] Second submit → 409 `quiz_already_finished`
- [x] Finished session GET reveals `correct_answer` and `is_correct`

### Group 3 — History and performance
- [x] List is lightweight (no questions) and uses a constant number of queries for 1 vs 5 sessions
- [x] Deleting the deck keeps the session (deck NULL, `deck_title` kept)
- [x] Editing a card after a quiz doesn't change that quiz's `question_text` or `correct_answer`

## 8. Out of scope
- Saving progress midway (submissions are all-at-once; the client keeps answers in memory).
- Server-enforced timers. Free-text answers. AI-generated distractors (candidate stretch goal).

## 9. Open questions
- None.
