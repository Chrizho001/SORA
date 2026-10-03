# 02 — Tasks & Schedule

**Status:** STUB — write the full spec (template in `00-overview.md`) and get it reviewed before building.
**Django app:** `apps.tasks`
**SRS refs:** §3.2 To-Do List, §3.3 Task & Schedule Manager
**Depends on:** 01-authentication

## SRS requirements to cover
SRS 3.2 (To-Do) and 3.3 (Task & Schedule) are merged into one model: a to-do is a task with no deadline.
- FR-2.1 Add task (§3.2)
- FR-2.2 Edit task (§3.2)
- FR-2.3 Delete task (§3.2)
- FR-2.4 Mark task as completed (§3.2)
- FR-2.5 Create task with deadline (§3.3)
- FR-2.6 Assign priority (§3.3)
- FR-2.7 View tasks by date (§3.3)

## Initial thinking (to be confirmed in the spec)
- `Task`: id, owner, title, description, due_at (nullable), priority (low/medium/high), is_completed, completed_at, timestamps.
- Filters: `?date=YYYY-MM-DD`, `?from=&to=`, `?completed=`, `?priority=`. Ordering by due_at and priority.
- Ownership scoping: another user's task → 404.

## Open questions
- Recurring tasks? Reminders/push notifications (PWA Push API)? Subjects/tags shared with flashcards?
