# 05 — Quiz Mode

**Status:** STUB — write the full spec (template in `00-overview.md`) and get it reviewed before building.
**Django app:** `apps.quizzes`
**SRS refs:** §3.6 Quiz Mode
**Depends on:** 01-authentication, 04-flashcards

## SRS requirements to cover
- FR-5.1 Start quiz
- FR-5.2 Answer questions
- FR-5.3 View score

## Initial thinking (to be confirmed in the spec)
- `QuizSession`: id, owner, subject, started_at, finished_at, score, total.
- `QuizAnswer`: session FK, flashcard FK, chosen/submitted answer, is_correct, answered_at.
- Questions come from a subject's flashcards. Multiple choice uses distractors taken from other cards' answers
  (see the multiple-choice quiz screen in `docs/design-inspiration/image.png`). Optional time limit.
- The server grades answers. The client never receives correct answers before submitting.

## Open questions
- Question types (multiple choice only, or also free text/self-graded)? Time limit? Quiz history/stats?
