# ADR 0003 — Manual flashcards grouped into Decks; AI generation becomes an optional add-on

- **Status:** Accepted
- **Date:** 2026-10-25
- **Supersedes:** the "manual creation is out of scope" decision in the previous `04-flashcards.md`

## Context
The first flashcard spec made AI generation the *only* way to create cards and tied every card to a
PDF document. This had three problems:
1. SRS §3.5 requires "Create flashcard", and PROJECT_GOAL requires students to "review and edit" cards.
   AI-only creation did not meet the requirement.
2. Regenerating deleted every card of the document, so a student's corrections were lost.
3. Students could not study a subject that has no PDF, and the quality of their cards depended entirely
   on the AI.

## Decision
- Introduce a **`Deck`** model (the SRS "subject"). Every flashcard belongs to exactly one deck.
- Students **create, edit and delete cards manually**. This is the primary path.
- A deck may optionally link a **source document**. If it does, the student can ask the AI to *suggest*
  cards. AI cards are **appended** (deduplicated by question) and marked `source=AI`. Nothing is ever
  deleted by generation.
- **Quizzes start from a deck**, not a document. Quiz sessions keep a `deck_title` snapshot so history
  survives deck deletion.

## Consequences
- New endpoints `/api/v1/decks/…`. `/documents/{id}/start-quiz/` is removed, and
  `/documents/{id}/generate-flashcards/` becomes a convenience wrapper.
- A data migration creates one deck per document that already has cards.
- The frontend Flashcards area becomes deck-centric (deck list, then deck detail with card CRUD, study
  mode and quiz).
- Quiz generation rules are tightened (distinct answers, length-similar distractors, question count). See
  `05-quiz.md`.
- Spaced repetition (SM-2) can later be added per card without changing this structure.
