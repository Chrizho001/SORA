# Project Goal: Study Assistant

> Read this first. Every feature, fix, and design decision should move the project toward the goal below.
> If a piece of work doesn't serve this goal, question whether it belongs.

## The goal

**Build a secure, reliable, installable web app (PWA) that helps students study more effectively by bringing their
task planning, reading, and revision into one place. Students write their own flashcards in decks, quiz
themselves on them, and use AI to summarise their PDFs and suggest extra flashcards.**

This is a final-year project. It must be a **working, demonstrable product** with professional engineering
quality (tested, secure, documented). A prototype that only runs in the test suite doesn't count.

## The problem we are solving
Students juggle deadlines, long PDFs (lecture notes, papers, readings) and revision across many disconnected tools. Turning a
50-page PDF into something they can revise from takes hours. Planning *when* to study is a separate chore.
Writing good revision cards takes time, and nothing tells you which cards you still get wrong.

## Who it is for
- **Primary users:** students, mostly on their phones and sometimes on laptops, with ordinary web-browsing skills.
- They expect it to feel like an app: fast, simple, installable, and usable on a small screen.

## What success looks like
A student can, end to end, on their phone:
1. **Sign up or sign in** with email and password, or with Google, and stay signed in securely.
2. **Plan their work:** add tasks with deadlines and priorities, see what is due by date, tick things off, and get
   reminded before deadlines.
3. **Upload a PDF** and get back a clear, accurate **AI summary** within a reasonable time, with a notification when it's ready.
4. **Create flashcards** in a deck (a subject), edit and delete them, and optionally ask the AI to
   suggest extra cards from an uploaded PDF. The suggestions are added to the deck, never replacing the
   student's own cards.
5. **Take a quiz** built from a deck and see their score and which answers were right or wrong, with past
   results kept in a history.
6. **Install the app** to their home screen and open the app shell even when offline.

## Product scope

| Area | What it must do | SRS ref |
|------|-----------------|---------|
| Authentication | Email/password with email verification, Google sign-in, logout, password reset and change, profile | §3.1 |
| Tasks & schedule | Add, edit, delete and complete tasks; deadlines; priority; view by date; due-soon reminders | §3.2, §3.3 |
| PDF summary | Upload a PDF, extract text, AI summary, display it; runs asynchronously | §3.4 |
| Flashcards & decks | Create, edit, delete cards **manually**; organise them in decks (= subjects); optional AI suggestions from a PDF summary, appended to a deck | §3.5, ADR 0003 |
| Quiz | Start a quiz from a deck (choose the number of questions), answer, see score, per-question review and results history | §3.6 |
| Notifications | In-app and web push for summaries ready, quiz results, task reminders, security events; user preferences | supports all of the above |

**Platform:** a **Progressive Web App** (Next.js frontend) backed by a **Django REST Framework API** with
**PostgreSQL**. There is no native mobile app (see `architecture/adr/0001-mobile-to-pwa.md`).

## Out of scope (for this project)
Native iOS/Android apps · collaboration or sharing between students · payments · teacher/admin dashboards ·
non-PDF documents · social providers other than Google · offline AI features · sharing or importing decks.

## Quality bar (non-negotiable)
These come from the SRS non-functional requirements and the project's engineering rules. A feature isn't finished
until it meets all of them.

| Quality | Bar |
|---------|-----|
| **Security** | Hashed passwords (Argon2) and JWT auth with the refresh token in an httpOnly cookie. Users only ever see their own data. Rate limiting that can't be bypassed. Untrusted input (uploads, URLs, query params) is validated. No secrets in the repo |
| **Correctness** | Built test-first (TDD). Every spec requirement has a test. Coverage ≥ 90% per app. Bad input returns a clear 4xx, never a 500 |
| **Performance** | API responses within 2–3 seconds. Slow work (AI, PDF parsing, push) runs in background jobs. List endpoints use a fixed number of queries, with no N+1s |
| **Reliability** | Failures are handled gracefully, logged, and shown to the user in plain language. Background jobs have time limits and retries |
| **Usability** | Clean, intuitive, mobile-first UI. Installable as a PWA. The app shell works offline |
| **Maintainability** | Every system has a spec in `architecture/`. Code follows the conventions in `CLAUDE.md` and `architecture/00-overview.md`. `ruff` is clean |

## How we work
1. **Spec first:** each system is specified in `architecture/NN-<system>.md` before it's built. When the work and the
   spec disagree, update the spec first.
2. **Test first:** red → green → refactor, following each spec's test plan.
3. **Review before calling it done:** security, performance and spec conformance are checked. Open findings
   are tracked in `Code_Review.md`.

## Where we are now (2026-10-25)
**Delivery: 2026-10-26.** The plan for the remaining day is `Code_Review.md` (one checkbox per item),
executed with the prompts in `docs/reviews/AGENT_PROMPTS.md` in order, **P0 first**.

- **Backend:** all systems are implemented on `main` (171 passing tests, 93% coverage). Open items
  include:
  - a quiz score-inflation bug
  - the Google auto-link takeover risk
  - document-pipeline idempotency and retry
  - missing throttles
  - `PATCH /auth/me/`
  - 250 `ruff` errors
- **AI:** real provider in place: Google Gemini (`AI_PROVIDER=gemini`); `mock` is used in tests only.
- **Flashcards (scope change 2026-10-25):** cards are now created manually and grouped into **decks**.
  AI generation stays as an optional add-on, and quizzes run on decks (ADR 0003, specs 04/05 rewritten).
  This still has to be implemented.
- **Frontend:** the Next.js app is built (landing page, auth, dashboard with tasks, documents, flashcards,
  quizzes, notifications). Still missing:
  - **The PWA layer** (manifest, service worker, offline shell).
  - Robust session refresh, and clearing the cache on logout.
  - Real routes.
  - Deck and card CRUD, task edit, profile and password, notification preferences.
- **Deployment:** not yet deployed over HTTPS.

## Definition of "project complete"
- [ ] Every SRS §3 feature works end to end in the PWA against the real backend, with the real AI provider
- [ ] All review findings are closed and the quality bar above is met
- [ ] The app is deployed over HTTPS and installable on a phone
- [ ] The documentation (SRS, architecture specs, ADRs) matches what was built
- [ ] Every **P0** item in `Code_Review.md` is ticked

## Stretch goals (only after all P0 items; these make the project stand out)
1. **Spaced repetition:** an SM-2 schedule per card (`ease`, `interval`, `due_at`) and a "Due today"
   review queue on the dashboard. Quiz results feed into it.
2. **Adaptive quizzes:** weight question selection toward cards the student previously got wrong, and
   offer "Retake my mistakes".
3. **Real progress analytics:** a study streak and an activity chart computed from quiz and review
   history (no placeholder numbers).
4. **Study planner:** suggest review sessions on the calendar before task deadlines that are linked to a
   deck.
5. **Engineering showcase:**
   - OpenAPI docs (`drf-spectacular`) at `/api/docs/`
   - GitHub Actions CI badge
   - Lighthouse report (PWA, Accessibility ≥ 90)
   - Playwright smoke test video
   - a live HTTPS URL with a QR code for examiners
