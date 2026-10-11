# Project Goal: Study Assistant

> Read this first. Every feature, fix, and design decision should move the project toward the goal below.
> If a piece of work doesn't serve this goal, question whether it belongs.

## The goal

**Build a secure, reliable, installable web app (PWA) that helps students study more effectively by bringing their
task planning, reading, and revision into one place, using AI to turn their own study material into summaries,
flashcards, and quizzes.**

This is a final-year project. It must be a **working, demonstrable product** with professional engineering
quality (tested, secure, documented). A prototype that only runs in the test suite doesn't count.

## The problem we are solving
Students juggle deadlines, long PDFs (lecture notes, papers, readings) and revision across many disconnected tools. Turning a
50-page PDF into something they can revise from takes hours. Planning *when* to study is a separate chore.
Revision tools usually need cards to be written by hand.

## Who it is for
- **Primary users:** students, mostly on their phones and sometimes on laptops, with ordinary web-browsing skills.
- They expect it to feel like an app: fast, simple, installable, and usable on a small screen.

## What success looks like
A student can, end to end, on their phone:
1. **Sign up or sign in** with email and password, or with Google, and stay signed in securely.
2. **Plan their work:** add tasks with deadlines and priorities, see what is due by date, tick things off, and get
   reminded before deadlines.
3. **Upload a PDF** and get back a clear, accurate **AI summary** within a reasonable time, with a notification when it's ready.
4. **Generate flashcards** from that material, then review and edit them.
5. **Take a quiz** built from their flashcards and see their score and which answers were right or wrong.
6. **Install the app** to their home screen and open the app shell even when offline.

## Product scope

| Area | What it must do | SRS ref |
|------|-----------------|---------|
| Authentication | Email/password with email verification, Google sign-in, logout, password reset and change, profile | §3.1 |
| Tasks & schedule | Add, edit, delete and complete tasks; deadlines; priority; view by date; due-soon reminders | §3.2, §3.3 |
| PDF summary | Upload a PDF, extract text, AI summary, display it; runs asynchronously | §3.4 |
| Flashcards | Create, edit, delete; view by subject/document; AI generation from a summary | §3.5 |
| Quiz | Start a quiz from flashcards, answer questions, see score and results history | §3.6 |
| Notifications | In-app and web push for summaries ready, quiz results, task reminders, security events; user preferences | supports all of the above |

**Platform:** a **Progressive Web App** (Next.js frontend) backed by a **Django REST Framework API** with
**PostgreSQL**. There is no native mobile app (see `architecture/adr/0001-mobile-to-pwa.md`).

## Out of scope (for this project)
Native iOS/Android apps · collaboration or sharing between students · payments · teacher/admin dashboards ·
non-PDF documents · social providers other than Google · offline AI features.

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
   are tracked in `docs/reviews/`.

## Where we are now (2026-10-11)
- **Backend:** all systems implemented, 130 passing tests. The critical security findings from
  `docs/reviews/2026-10-08-backend-review.md` are fixed and verified. Regressions and partial fixes remain open
  (see the review's "Re-verification" section). **Closing that review is the current priority.**
- **AI:** there is **no AI API access yet**. PDF summaries and AI-generated flashcards and quizzes run on a mock
  provider until access is available. Manual flashcard creation is what gives quizzes real content in the meantime.
- **Frontend:** the Next.js PWA hasn't been built yet.

## Definition of "project complete"
- [ ] Every SRS §3 feature works end to end in the PWA against the real backend, with the real AI provider
- [ ] All review findings are closed and the quality bar above is met
- [ ] The app is deployed over HTTPS and installable on a phone
- [ ] The documentation (SRS, architecture specs, ADRs) matches what was built
