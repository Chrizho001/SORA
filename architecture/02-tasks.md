# 02 — Tasks & Schedule

Status: DRAFT

## 1. Purpose
The Tasks & Schedule system allows students to manage their workload. It unifies both simple to-do items (tasks without deadlines) and scheduled tasks (tasks with deadlines). 

## 2. Requirements
- FR-2.1 Add task (§3.2)
- FR-2.2 Edit task (§3.2)
- FR-2.3 Delete task (§3.2)
- FR-2.4 Mark task as completed (§3.2)
- FR-2.5 Create task with deadline (§3.3)
- FR-2.6 Assign priority (§3.3)
- FR-2.7 View tasks by date (§3.3)

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
- `date=YYYY-MM-DD` (filters `due_at` by specific date)
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

## 8. Out of scope
- Recurring tasks (v1).
- Reminders via Web Push API (v1).
- Sharing tasks between users.
- Subjects/tags shared with flashcards (can be added later).

## 9. Open questions
- **Timezones:** When filtering by `date=YYYY-MM-DD`, how do we handle timezones? 
  *Recommendation:* The frontend should send full ISO 8601 strings for `due_at` (in UTC). The `date` filter can either assume UTC, or the frontend can use `from` and `to` with exact ISO datetimes representing the start and end of the user's local day. Using `from` and `to` is more precise for timezone-aware clients.
