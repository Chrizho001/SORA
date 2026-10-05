# 05 — Quiz Mode

Status: DRAFT

## 1. Purpose
The Quiz system allows students to test their knowledge on a specific document. Quizzes are dynamically generated using the AI-generated flashcards associated with that document, creating multiple-choice questions where the distractors (wrong answers) are intelligently pulled from other flashcards in the same deck.

## 2. Requirements
- FR-5.1 Start quiz (Builds a session from a Document's flashcards)
- FR-5.2 Answer questions (Client submits answers, server grades them securely)
- FR-5.3 View score (Display final grade and correct/incorrect breakdown)

## 3. Data model
### `QuizSession`
- `id`: UUID (Primary Key)
- `user`: ForeignKey to `User` (on_delete=CASCADE, index)
- `document`: ForeignKey to `documents.Document` (on_delete=CASCADE, related_name="quiz_sessions")
- `score`: IntegerField(null=True, blank=True)
- `total_questions`: IntegerField(default=0)
- `created_at`: DateTimeField(auto_now_add=True)
- `finished_at`: DateTimeField(null=True, blank=True)

### `QuizQuestion`
- `id`: UUID (Primary Key)
- `session`: ForeignKey to `QuizSession` (on_delete=CASCADE, related_name="questions")
- `flashcard`: ForeignKey to `flashcards.Flashcard` (on_delete=CASCADE)
- `choices`: JSONField()  # An array of 4 shuffled string answers (1 correct, 3 distractors)
- `selected_choice`: TextField(blank=True, null=True)
- `is_correct`: BooleanField(null=True, blank=True)

## 4. API endpoints
Base path: `/api/v1/`
Auth: Required (`IsAuthenticated`)

### `POST /documents/{id}/start_quiz/`
Initializes a new quiz session using the document's flashcards.
- Requires the document to have at least 4 flashcards to generate valid distractors.
- Response: 201 Created. Returns the `QuizSession` along with its nested `QuizQuestion`s. *Crucially, the API must omit the `is_correct` flags and the correct answer identity to prevent client-side cheating.*

### `GET /quiz-sessions/`
Lists the user's past and ongoing quiz sessions.

### `GET /quiz-sessions/{id}/`
Retrieve a specific quiz session.
- If `finished_at` is null, returns the questions without the correct answers.
- If `finished_at` is set, returns the full breakdown including the correct answers and the user's score.

### `POST /quiz-sessions/{id}/submit/`
Submits the entire quiz for grading.
Request payload:
```json
{
  "answers": [
    {"question_id": "uuid", "selected_choice": "string"}
  ]
}
```
Response: 200 OK. Server evaluates all answers against the original flashcards, sets `is_correct`, calculates the `score`, sets `finished_at`, and returns the fully graded session.

## 5. Business rules
- A quiz can only be started if the document has >= 4 flashcards.
- Each `QuizQuestion` uses the `flashcard.question` as the prompt, `flashcard.answer` as the correct choice, and randomly picks 3 other flashcards' answers from the same document as the distractors.
- The `choices` array must be randomly shuffled during creation so the correct answer isn't always at the same index.
- Once a quiz is submitted (`finished_at` is set), it cannot be submitted again.

## 6. Security & permissions
- All endpoints require authentication (`IsAuthenticated`).
- A user can only start a quiz on their own documents.
- A user can only view/submit their own quiz sessions.
- Correct answers must NEVER be sent to the client until the quiz is submitted.

## 7. Test plan (TDD)
### Group 1 — Quiz Generation
- [x] POST `/documents/{id}/start_quiz/` returns 400 if document has < 4 flashcards
- [x] POST `/documents/{id}/start_quiz/` creates `QuizSession` and `QuizQuestion`s with shuffled choices, returning 201
- [x] Ensure the returned payload from `start_quiz` does NOT leak the correct answer or `is_correct` status

### Group 2 — Session Retrieval & Submission
- [x] GET `/quiz-sessions/{id}/` returns session and questions (hiding answers if unfinished)
- [x] POST `/quiz-sessions/{id}/submit/` with valid answers correctly grades the test, calculates the score, and sets `finished_at`
- [x] GET `/quiz-sessions/{id}/` on a finished session reveals the correct answers and `is_correct` flags
- [x] POST `/quiz-sessions/{id}/submit/` returns 400 if the session is already finished

## 8. Out of scope
- Partial submissions (saving progress midway). For now, it's an all-at-once submission.
- Timers. Time limits can be enforced client-side, but the server won't strictly invalidate a session based on time in v1.

## 9. Open questions
- None at this time. The dynamic generation from flashcards is elegant and requires no extra AI dependencies!
