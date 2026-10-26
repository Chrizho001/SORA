# 02 — Tasks & Schedule

Status: READY (implemented; Group 4 added 2026-10-25)

## 1. Purpose
The Tasks & Schedule system allows students to manage their workload. It unifies both simple to-do items (tasks without deadlines) and scheduled tasks (tasks with deadlines). 

## 2. Requirements
- FR-2.1 Add task (§3.2)
- FR-2.2 Edit task (§3.2)
- FR-2.3 Delete task (§3.2)
- FR-2.4 Mark task as completed (§3.2)
- FR-2.5 Create task with deadline (§3.3)
- FR-2.6 Assign priority (§3.3)
- FR-2.7 View tasks by date (§3.3), in the user's local timezone
- FR-2.8 Due-soon and overdue reminders (PROJECT_GOAL success criterion 2; delivered via `06-notifications.md`)

## 3. Data model
### `Task`
- `id`: UUID (Primary Key)
- `user`: ForeignKey to `User` (on_delete=CASCADE, index)
- `title`: CharField(max_length=255)
- `description`: TextField(blank=True)
- `due_at`: DateTimeField(null=True, blank=True)
- `priority`: IntegerField choices (1=Low, 2=Medium, 3=High) default=2 (Medium)
- `is_completed`: BooleanField(default=False)
- `completed_at`: DateTimeField(null=True, blank=True)
- `reminder_sent_at`: DateTimeField(null=True, blank=True) — set when the due-soon reminder is sent
- `overdue_notified_at`: DateTimeField(null=True, blank=True) — set when the overdue notice is sent (new)
- `created_at`: DateTimeField(auto_now_add=True)
- `updated_at`: DateTimeField(auto_now=True)

Indexes:
- `(user, due_at)` for fast date/schedule filtering
- `(user, is_completed)` for filtering open/completed tasks

## 4. API endpoints
Base path: `/api/v1/tasks/`
Auth: Required (`IsAuthenticated`)

### `GET /`
List tasks for the authenticated user.
Query params:
- `date=YYYY-MM-DD` (tasks due on that calendar day)
- `tz=<IANA zone>` optional, e.g. `Europe/London`; validated with `zoneinfo` (400 on unknown). `date` means that day in `tz` (default UTC). Implemented as a `due_at__gte/__lt` range so the `(user, due_at)` index is used
- `from=YYYY-MM-DD`, `to=YYYY-MM-DD` (date range filter on `due_at`)
- `is_completed=true|false`
- `priority=1|2|3`
- `ordering=due_at` or `ordering=-priority`

Response: 200 OK (Paginated list of tasks)

### `POST /`
Create a new task.
Request: `{ title, description?, due_at?, priority? }`
Response: 201 Created

### `GET /{id}/`
Retrieve a single task.
Response: 200 OK (or 404 Not Found if unowned/missing)

### `PATCH /{id}/`
Update a task (e.g., edit title, change due_at, or mark completed).
Request: `{ title?, description?, due_at?, priority?, is_completed? }`
Response: 200 OK

### `DELETE /{id}/`
Delete a task.
Response: 204 No Content

## 5. Business rules
- **To-Do vs Schedule:** A task is considered a simple "To-Do" if `due_at` is null.
- **Completion logic:** If `is_completed` is set to `True`, `completed_at` should automatically be set to the current timestamp. If `is_completed` is set back to `False`, `completed_at` should be set to null.
- **Ownership:** All requests must be scoped to the authenticated user. A user cannot view, edit, or delete another user's tasks.
- **Reminders (Celery beat, every 15 min, `send_due_task_reminders`):**
  - *Due soon:* open tasks with `now < due_at <= now + 24h` and `reminder_sent_at IS NULL` → `TASK_DUE_SOON`, then set `reminder_sent_at`.
  - *Overdue:* open tasks with `due_at < now` and `overdue_notified_at IS NULL` → `TASK_OVERDUE` once, then set `overdue_notified_at`.
  - *Re-arming:* when `due_at` changes, or `is_completed` goes from True to False, both `reminder_sent_at` and `overdue_notified_at` are reset to NULL (in `Task.save()`, comparing against the original values captured in `from_db()`, so the API and admin behave the same way).
  - Notification failures are logged and never abort the loop.

## 6. Security & permissions
- All endpoints require authentication (`IsAuthenticated`).
- Viewset must filter the queryset: `Task.objects.filter(user=request.user)`.
- Standard rate limiting applies (e.g., `throttle_scope = "tasks"`).

## 7. Test plan (TDD)
### Group 1 — Task CRUD
- [x] POST `/` with valid data creates a task and returns 201
- [x] POST `/` without title returns 400
- [x] GET `/` returns paginated tasks for the current user
- [x] GET `/` does not return tasks belonging to other users
- [x] GET `/{id}/` returns 200 for owned task
- [x] GET `/{id}/` returns 404 for another user's task
- [x] PATCH `/{id}/` updates task fields and returns 200
- [x] DELETE `/{id}/` deletes the task and returns 204

### Group 2 — Completion Logic
- [x] PATCH `is_completed=True` automatically sets `completed_at`
- [x] PATCH `is_completed=False` automatically clears `completed_at`

### Group 3 — Filtering and Ordering
- [x] GET `/?is_completed=true` filters completed tasks
- [x] GET `/?is_completed=false` filters open tasks
- [x] GET `/?priority=3` filters by high priority
- [x] GET `/?date=YYYY-MM-DD` filters tasks due on a specific date
- [x] GET `/?from=YYYY-MM-DD&to=YYYY-MM-DD` filters tasks within a date range
- [x] Tasks are ordered by `due_at` (ascending) by default, with null `due_at` (to-dos) appearing at the end

### Group 4 — Reminders & timezone (added 2026-10-25)
- [x] Due-soon reminder sent once for a task due within 24 h; not for completed or far-future tasks
- [x] Changing `due_at` resets `reminder_sent_at`, so the reminder is sent again for the new time
- [x] Re-opening a completed task resets reminder flags
- [x] Overdue task gets exactly one `TASK_OVERDUE` notification
- [x] `?date=2026-10-25&tz=America/New_York` returns a task due at `2026-10-26T02:00Z` (22:00 local) and excludes one due at `2026-10-25T03:00Z`
- [x] Unknown `tz` → 400 `validation_error`


## 8. Out of scope
- Recurring tasks (v1).
- Per-task custom reminder offsets (v1 uses a fixed 24 h window).
- Sharing tasks between users.
- Subjects/tags shared with flashcards (can be added later).

## 9. Open questions
- None. Timezone decision: the client sends `tz` (or exact `from`/`to` ISO datetimes); stored times are UTC.
