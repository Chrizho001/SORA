# 06 — Notifications

Status: READY (v1 subset implemented — see §0). App: `apps.notifications`.
Renamed from `notification_system_architecture_specification.md` on 2026-10-25 to follow the `NN-<system>.md` convention.

## 0. Implementation status (v1, for delivery 2026-10-26)
The rest of this document describes the full target architecture. v1 delivers this subset:

| Capability | v1 | Where |
|---|---|---|
| In-app notifications (list, mark read, mark all read, unread count) | ✅ backend · ✅ frontend | `NotificationViewSet` · `NotificationsView`, `NotificationDrawer` |
| Notification types | `TASK_DUE_SOON`, `TASK_OVERDUE`, `PDF_SUMMARY_READY`, `PDF_SUMMARY_FAILED`, `FLASHCARDS_READY`, `FLASHCARDS_FAILED` (new), `QUIZ_READY`, `QUIZ_GRADED`, `SECURITY_NEW_LOGIN`, `SECURITY_PASSWORD_CHANGED`, `SECURITY_EMAIL_CHANGED` | `models.NotificationType`; the frontend mapping must mirror it exactly (Code_Review FE-10) |
| Per-type preferences (in-app / push) | ✅ backend · ⏳ frontend (FE-14) | `NotificationPreferenceViewSet` |
| Web push (VAPID) | ✅ backend (`send_web_push_task`, HTTPS endpoint allowlist) · ⏳ SW + subscribe UI (FE-01, FE-14) | `PushSubscriptionViewSet` |
| Scheduled: task due-soon / overdue | ✅ due-soon · ⏳ overdue (BUG-07) | Celery beat `send_due_task_reminders` (15 min) |
| Push dispatch after commit, failures never break the caller | ⏳ (BUG-09) | `NotificationService.notify` |
| Broadcast / admin notifications, `notification_deliveries` table, templates registry, email channel | ❌ out of scope for v1 | — |

**Rules every caller must follow (v1):** create notifications only through `NotificationService.notify(recipient, notification_type, title, body, data)`. `body` and `data` never contain raw exception text or secrets. A notification failure is logged and never raised to the caller.

---

## 1. Purpose

This document defines the architecture, design principles, data model,
processing flows, security requirements, reliability requirements, and
implementation rules for the notification subsystem of the AI Study
Assistant PWA.

The application is a **Progressive Web App built with Next.js**. Its
existing core systems include:

-   Authentication
-   Tasks
-   PDF summarization
-   Flashcards
-   Quizzes

The notification subsystem must be designed as a **standalone, reusable
platform subsystem** that can serve all existing and future application
features.

The notification system must support:

1.  In-app notifications.
2.  Web push notifications.
3.  Individual/user-specific notifications.
4.  Broadcast/general notifications.
5.  Scheduled notifications.
6.  Notification preferences.
7.  Multiple devices/browsers per user.
8.  Background delivery.
9.  Retry and failure handling.
10. Idempotent processing.
11. Strong authentication and authorization.
12. Security-sensitive notifications.
13. Extensibility to additional channels such as email in the future.

------------------------------------------------------------------------

# 2. Core Architectural Principle

The notification system must separate:

> **Application events → Notification decisions → Notification records →
> Delivery channels**

A feature must **not** directly implement browser push logic.

For example:

``` text
Task Service
    |
    | TASK_DUE_SOON
    v
Notification Service
    |
    +----> Create in-app notification
    |
    +----> Queue web push delivery
```

The Tasks, PDF, Flashcards, Quiz, and Authentication systems should only
communicate that an event has occurred. The notification subsystem
determines whether, how, and through which channels the user should be
notified.

This separation of concerns is mandatory.

------------------------------------------------------------------------

# 3. High-Level Architecture

``` text
                         +----------------------+
                         |      Next.js PWA      |
                         |                      |
                         |  Notification UI     |
                         |  Notification Bell   |
                         |  Preferences UI      |
                         |  Service Worker      |
                         +----------+-----------+
                                    |
                           HTTPS / API
                                    |
                                    v
                 +---------------------------------------+
                 |              Backend API               |
                 |                                       |
                 | Authentication                         |
                 | Tasks                                  |
                 | PDF Summarizer                         |
                 | Flashcards                             |
                 | Quiz                                   |
                 |                                       |
                 |        Notification Service            |
                 +------------------+--------------------+
                                    |
                    +---------------+----------------+
                    |                                |
                    v                                v
             PostgreSQL                         Job Queue
                    |                                |
                    |                                v
                    |                       Notification Worker
                    |                                |
                    |                                v
                    |                         Web Push Service
                    |                                |
                    v                                v
          Notification History              Browser Push Service
                                                     |
                                                     v
                                              Service Worker
                                                     |
                                                     v
                                             OS Notification
```

The database is the source of truth.

Push delivery is a delivery mechanism, not the authoritative
representation of a notification.

------------------------------------------------------------------------

# 4. Notification Layers

The system consists of three conceptual layers.

## 4.1 Event Layer

An event represents something that happened in the application.

Examples:

``` text
TASK_CREATED
TASK_DUE_SOON
TASK_OVERDUE

PDF_SUMMARY_READY
PDF_SUMMARY_FAILED

FLASHCARDS_READY

QUIZ_READY
QUIZ_GRADED

SECURITY_NEW_LOGIN
SECURITY_PASSWORD_CHANGED
SECURITY_EMAIL_CHANGED
```

Events should be typed and predictable.

Do not use arbitrary notification strings as event identifiers.

------------------------------------------------------------------------

## 4.2 Notification Layer

An application event is transformed into a user-facing notification.

Example:

``` text
Event:
TASK_DUE_SOON

Notification:
title = "Task due soon"
body = "Your task 'Study Operating Systems' is due tomorrow."
recipient = user_123
type = TASK_DUE_SOON
data = {
    task_id: "task_123"
}
```

The notification layer is responsible for:

-   Determining whether notification is appropriate.
-   Resolving the notification type.
-   Applying user preferences.
-   Creating the persistent notification record.
-   Determining delivery channels.
-   Scheduling delivery work.

------------------------------------------------------------------------

## 4.3 Delivery Layer

Delivery determines how the notification reaches the user.

Initial supported channels:

``` text
IN_APP
WEB_PUSH
```

Future channels may include:

``` text
EMAIL
```

The architecture must allow new channels to be added without redesigning
the notification domain model.

------------------------------------------------------------------------

# 5. In-App Notifications

In-app notifications are persistent records stored in the database.

Example UI:

``` text
Notification Bell: 🔔 3

Notifications

- Your quiz is ready.
- Your task is due tomorrow.
- Your PDF summary is complete.
```

The user must be able to:

-   List notifications.
-   View unread count.
-   Mark a notification as read.
-   Mark all notifications as read.
-   Open the associated resource.
-   Optionally delete notifications if deletion is part of the product
    requirements.

In-app notifications must continue to work even if the user has disabled
browser push notifications.

------------------------------------------------------------------------

# 6. Web Push Notifications

Web push allows the server to notify the user even when the PWA is not
currently open.

The conceptual flow is:

``` text
Backend
   |
   v
Browser Push Service
   |
   v
Browser
   |
   v
Service Worker
   |
   v
OS Notification
```

The system must use the standard Web Push architecture.

Relevant browser technologies:

-   Service Worker
-   Push API
-   Notifications API
-   PushManager
-   Web Push protocol
-   VAPID

HTTPS is required for the relevant browser APIs.

The service worker must handle incoming push events and notification
clicks.

------------------------------------------------------------------------

# 7. Push Subscription Lifecycle

## 7.1 User Enables Notifications

A user should explicitly opt into notifications.

Do not automatically trigger the browser permission prompt immediately
when the user visits the application.

Prefer contextual permission requests such as:

``` text
Task created successfully.

Would you like reminders when your tasks are due?

[ Enable notifications ]
```

or a dedicated settings page:

``` text
Settings
  -> Notifications
      -> Enable browser notifications
```

Notification permission should be requested in response to an
intentional user action.

------------------------------------------------------------------------

## 7.2 Service Worker Registration

The PWA registers its service worker.

The service worker is responsible for:

-   Receiving push events.
-   Displaying notifications.
-   Handling notification clicks.
-   Navigating/opening the correct PWA route.

------------------------------------------------------------------------

## 7.3 Push Subscription Creation

The browser creates a `PushSubscription`.

Conceptually:

``` json
{
  "endpoint": "...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

The client sends the subscription to the authenticated backend.

------------------------------------------------------------------------

## 7.4 Backend Storage

The backend stores the subscription against the authenticated user.

The backend must NOT trust a client-provided `user_id` to determine
ownership.

The relationship must be:

``` text
Authenticated User
        |
        v
Authenticated Request
        |
        v
Push Subscription
```

not:

``` text
Request body user_id
        |
        v
Push Subscription
```

------------------------------------------------------------------------

# 8. Multiple Subscriptions Per User

A user may have:

-   Laptop browser.
-   Phone browser.
-   Tablet browser.
-   Multiple browser profiles.
-   Multiple browsers on the same device.

Therefore:

``` text
User
 |
 +---- Push Subscription A
 |
 +---- Push Subscription B
 |
 +---- Push Subscription C
```

must be supported.

Never model the system as one push subscription per user.

------------------------------------------------------------------------

# 9. VAPID

Web Push must use VAPID for application-server authentication.

The architecture must maintain:

``` text
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
```

The public key may be provided to the client during push subscription.

The private key must remain server-side and must never be exposed to the
browser.

VAPID credentials must be managed as secrets through
environment/configuration management.

Never commit VAPID private keys to source control.

------------------------------------------------------------------------

# 10. Database Model

The notification system should use separate database concerns.

Recommended initial tables:

``` text
notifications
push_subscriptions
notification_preferences
notification_deliveries
```

------------------------------------------------------------------------

## 10.1 notifications

Recommended fields:

``` text
id
recipient_id
type
title
body
data
read_at
created_at
expires_at
```

### Field semantics

`id` - Unique notification identifier.

`recipient_id` - User who owns the notification. - Must reference an
authenticated application user.

`type` - Typed notification identifier. - Examples: `TASK_DUE_SOON`,
`QUIZ_READY`.

`title` - User-facing notification title.

`body` - User-facing notification body.

`data` - Structured metadata required to navigate or act on the
notification. - Example:

``` json
{
    "task_id": "task_123"
}
```

`read_at` - Null when unread. - Timestamp when read.

`created_at` - Notification creation timestamp.

`expires_at` - Optional expiration/retention timestamp.

------------------------------------------------------------------------

# 11. Notification Data

Do not encode resource identifiers only inside human-readable
notification text.

Prefer:

``` json
{
    "type": "TASK_DUE_SOON",
    "data": {
        "task_id": "task_123"
    }
}
```

over relying on:

``` text
"Your task #123 is due tomorrow."
```

The frontend can use the structured data to navigate:

``` text
TASK_DUE_SOON
      |
      v
/task/task_123
```

The backend must still authorize access to the target resource.

Notification metadata is not an authorization mechanism.

------------------------------------------------------------------------

# 12. push_subscriptions

Recommended fields:

``` text
id
user_id
endpoint
p256dh
auth
user_agent
created_at
updated_at
last_used_at
revoked_at
```

The endpoint and cryptographic subscription information must be treated
as sensitive.

Do not expose push subscriptions through normal user-facing APIs.

Do not unnecessarily log complete push endpoints or cryptographic keys.

------------------------------------------------------------------------

# 13. notification_preferences

The user must have control over normal notification categories and
channels.

A normalized model may contain:

``` text
id
user_id
notification_type
in_app_enabled
push_enabled
email_enabled
updated_at
```

Example:

``` text
Task reminders
    In-app: ON
    Push: ON

Quiz notifications
    In-app: ON
    Push: ON

PDF notifications
    In-app: ON
    Push: OFF

Flashcard notifications
    In-app: ON
    Push: OFF
```

Security-critical notifications should be treated separately and should
not necessarily be disableable through ordinary preferences.

------------------------------------------------------------------------

# 14. notification_deliveries

A notification record represents the notification itself.

A delivery record represents an attempt to deliver that notification
through a specific channel.

Recommended fields:

``` text
id
notification_id
channel
status
attempts
sent_at
failed_at
error_code
```

Possible channels:

``` text
IN_APP
WEB_PUSH
EMAIL
```

Possible states:

``` text
QUEUED
SENT
FAILED
EXPIRED
```

Additional delivery states may be introduced when technically justified.

Do not claim that a notification was "seen" unless the system actually
has evidence of user interaction.

------------------------------------------------------------------------

# 15. Notification Service

The backend should provide a central notification service.

Conceptually:

``` python
notification_service.notify(
    recipient=user,
    notification_type="TASK_DUE_SOON",
    data={
        "task_id": task.id
    }
)
```

The notification service is responsible for:

1.  Validating the notification type.
2.  Resolving the notification template.
3.  Determining the recipient.
4.  Checking notification policy/preferences.
5.  Creating the persistent in-app notification.
6.  Determining enabled delivery channels.
7.  Creating delivery jobs.
8.  Handling delivery failures.
9.  Supporting retries.
10. Enforcing idempotency.

Feature modules should not implement these responsibilities themselves.

------------------------------------------------------------------------

# 16. Notification Templates

Notification text should be generated server-side from typed
notification events.

Avoid APIs where arbitrary users can submit:

``` json
{
    "title": "Anything",
    "body": "Anything"
}
```

for notification creation.

Prefer:

``` text
TASK_DUE_SOON
       |
       v
Server-side notification template
       |
       v
"Task due soon"
"Your task 'Study OS' is due tomorrow."
```

Templates provide:

-   Consistency.
-   Security.
-   Localization potential.
-   Easier testing.
-   Centralized product copy.
-   Protection against arbitrary notification abuse.

------------------------------------------------------------------------

# 17. Notification Types

Use explicit notification types.

Initial recommended set:

``` text
TASK_DUE_SOON
TASK_OVERDUE

PDF_SUMMARY_READY
PDF_SUMMARY_FAILED

FLASHCARDS_READY

QUIZ_READY
QUIZ_GRADED

SECURITY_NEW_LOGIN
SECURITY_PASSWORD_CHANGED
SECURITY_EMAIL_CHANGED
```

Additional notification types may be introduced as features require
them.

Notification types should be defined centrally rather than scattered
throughout the codebase.

------------------------------------------------------------------------

# 18. End-to-End Example: PDF Summary

Example flow:

``` text
User uploads PDF
        |
        v
PDF API
        |
        v
Create background job
        |
        v
Return 202 Accepted
        |
        v
PDF Worker
        |
        v
Process PDF
        |
        +---- success
        |       |
        |       v
        |   PDF_SUMMARY_READY
        |
        +---- failure
                |
                v
        PDF_SUMMARY_FAILED
                |
                v
        Notification Service
                |
        +-------+-------+
        |               |
        v               v
   DB notification   Push job
                        |
                        v
                  Web Push Service
                        |
                        v
                  Service Worker
                        |
                        v
                  OS notification
```

Example:

``` text
Title:
Summary Ready

Body:
Your Operating Systems summary is ready.

Data:
{
    "summary_id": "summary_123"
}
```

When clicked:

``` text
Notification click
        |
        v
/summary/summary_123
        |
        v
Backend authorization
        |
        v
Display protected resource
```

------------------------------------------------------------------------

# 19. Individual Notifications

Individual notifications must be targeted to an authenticated user.

Conceptually:

``` text
notification_service.notify(
    recipient=user_123,
    notification_type=QUIZ_READY,
    data={
        "quiz_id": "quiz_456"
    }
)
```

The system then:

``` text
User 123
    |
    +---- Database notification
    |
    +---- Push subscription A
    |
    +---- Push subscription B
```

All active subscriptions belonging to that user may receive the push.

------------------------------------------------------------------------

# 20. Broadcast Notifications

Broadcast notifications must not be implemented as an unbounded
synchronous loop inside a normal HTTP request.

Avoid:

``` python
for user in all_users:
    create_notification(user)
    send_push(user)
```

inside a request handler.

Instead:

``` text
Admin Broadcast
       |
       v
Broadcast Job
       |
       v
Batch Users
       |
       v
Create Notifications
       |
       v
Queue Push Deliveries
       |
       v
Notification Workers
```

Broadcasts should be processed asynchronously and in batches.

------------------------------------------------------------------------

# 21. Admin Broadcast Security

Broadcast functionality must be restricted to authorized administrative
users.

The backend must enforce:

-   Authentication.
-   Role/permission checks.
-   Rate limiting.
-   Audit logging.
-   Validation.
-   Appropriate audience selection.
-   Optional scheduling.
-   Safe retry behavior.

Audit information should include:

``` text
initiating admin
notification type
audience
channels
created_at
scheduled_at
result/status
```

Never rely solely on frontend UI restrictions for administrative
authorization.

------------------------------------------------------------------------

# 22. Scheduled Notifications

Task reminders are a primary use case.

Example:

``` text
Task:
Study Computer Networks

Due:
Tomorrow at 19:00
```

Possible reminders:

``` text
24 hours before
1 hour before
```

Scheduling must be server-side.

Do not rely on the browser to periodically check for reminders.

Avoid:

``` javascript
setInterval(checkTasks, 60000)
```

because the browser may be:

-   Closed.
-   Suspended.
-   Offline.
-   Killed by the operating system.
-   Sleeping.
-   Unavailable.

Use a backend scheduler/background-job system.

------------------------------------------------------------------------

# 23. Background Jobs

Push delivery and scheduled notification processing should be
asynchronous.

Conceptually:

``` text
Application Event
      |
      v
Notification Service
      |
      v
Job Queue
      |
      v
Notification Worker
      |
      v
Web Push
```

If the backend already uses Celery + Redis for background processing,
the notification subsystem should reuse that infrastructure rather than
introducing another queue unnecessarily.

------------------------------------------------------------------------

# 24. Reliability and Retries

Notification delivery is inherently failure-prone.

Possible failures include:

-   Network failure.
-   Temporary push service failure.
-   Invalid subscription.
-   Browser permission revoked.
-   Expired subscription.
-   Worker crash.
-   Database transaction failure.
-   Process restart.

The worker must support safe retries.

However, retries must not create duplicate notifications.

------------------------------------------------------------------------

# 25. Idempotency

Idempotency is mandatory for notification creation and delivery jobs.

Example failure:

``` text
Worker
  |
  v
Send push
  |
  v
Push succeeds
  |
  v
Worker crashes before recording success
  |
  v
Job retries
  |
  v
Push sent again
```

This can produce duplicate notifications.

Use an idempotency/deduplication strategy.

Examples:

``` text
event_id
```

or:

``` text
deduplication_key
```

Example:

``` text
quiz_ready:quiz_123
```

The notification system should be able to determine whether the same
logical notification has already been created or processed.

Do not assume that background jobs execute exactly once.

Design for at-least-once execution.

------------------------------------------------------------------------

# 26. Invalid Push Subscriptions

Subscriptions can become invalid.

Possible causes:

-   User revoked permission.
-   Browser data was cleared.
-   Subscription expired.
-   Browser/device changed.
-   Push service rejected the endpoint.

When the push service reports an invalid subscription:

``` text
Push delivery
      |
      v
Invalid subscription response
      |
      v
Mark subscription revoked/inactive
```

Do not continuously retry permanently invalid subscriptions.

------------------------------------------------------------------------

# 27. Security Model

The notification subsystem must follow strict authentication and
authorization rules.

## 27.1 User Isolation

A user may:

``` text
Read own notifications
Mark own notifications as read
Manage own notification preferences
Register own push subscriptions
Revoke own push subscriptions
```

A user must NOT be able to:

``` text
Read another user's notifications
Mark another user's notifications as read
Modify another user's preferences
Register a subscription for another user
Send arbitrary notifications to another user
Access another user's push subscription
```

------------------------------------------------------------------------

# 28. Never Trust Client-Supplied User IDs

Bad:

``` http
POST /notifications/send
{
    "user_id": "user_123"
}
```

The server must not blindly trust this value.

For ordinary user operations:

``` text
Authenticated session/token
        |
        v
request.user
        |
        v
Authorization
```

The authenticated identity should determine ownership.

------------------------------------------------------------------------

# 29. IDOR/BOLA Protection

Notification APIs are susceptible to Insecure Direct Object Reference /
Broken Object Level Authorization vulnerabilities.

For example:

``` http
GET /notifications/123
```

must verify:

``` text
Does notification 123 belong to authenticated user?
```

Likewise:

``` http
PATCH /notifications/123/read
```

must verify ownership before modification.

Never assume that knowing an object ID gives permission to access it.

------------------------------------------------------------------------

# 30. Push Subscription Security

Push subscription endpoints and cryptographic keys are sensitive.

Requirements:

-   Require authentication to register subscriptions.
-   Associate subscriptions with the authenticated user.
-   Validate subscription payloads.
-   Protect the subscription endpoint against CSRF where applicable.
-   Avoid unnecessary logging.
-   Do not expose subscriptions through normal public APIs.
-   Revoke invalid subscriptions.
-   Do not accept a subscription with an arbitrary user identity
    supplied by the client.

------------------------------------------------------------------------

# 31. CSRF Protection

Endpoints that mutate notification state must use the application's
appropriate CSRF protections when the authentication architecture is
cookie-based.

Particular attention should be paid to:

``` text
POST /push/subscribe
POST /push/unsubscribe
PATCH /notifications/:id/read
PATCH /notification-preferences
```

Do not assume that authentication alone automatically eliminates CSRF
risk.

------------------------------------------------------------------------

# 32. Rate Limiting

Rate-limit security-sensitive and potentially expensive notification
endpoints.

At minimum consider rate limiting:

``` text
push subscription registration
push subscription removal
notification preference changes
notification mutation endpoints
admin broadcast creation
```

Broadcast operations should have particularly strong protection.

------------------------------------------------------------------------

# 33. Sensitive Data in Push Payloads

Do not put unnecessary sensitive data in browser push payloads.

Prefer:

``` json
{
    "type": "QUIZ_READY",
    "notification_id": "notification_123",
    "quiz_id": "quiz_456"
}
```

over including private content such as:

``` json
{
    "quiz_answers": [...]
}
```

The notification can tell the user that something is ready.

The authenticated application can fetch the protected resource after the
user opens it.

------------------------------------------------------------------------

# 34. Push Payloads Are Not Authorization

A notification payload may contain:

``` text
quiz_id
task_id
summary_id
```

but that does not grant access.

When the user opens the resource:

``` text
Frontend
    |
    v
GET /quiz/quiz_456
    |
    v
Backend
    |
    v
Check authenticated user's authorization
    |
    v
Return resource or 403/404
```

Every protected resource must enforce its own authorization.

------------------------------------------------------------------------

# 35. Security Notifications

Security events require special handling.

Examples:

``` text
SECURITY_NEW_LOGIN
SECURITY_PASSWORD_CHANGED
SECURITY_EMAIL_CHANGED
```

Security notifications should generally not be disabled through ordinary
marketing/UX notification preferences.

For example:

``` text
Security alerts
    In-app: REQUIRED
    Push: REQUIRED/RECOMMENDED
```

The exact product policy may vary, but security-critical events must not
be treated like ordinary study reminders.

------------------------------------------------------------------------

# 36. Notification Spam Prevention

Notifications must provide meaningful value.

Avoid notifying users about every small application event.

Bad:

``` text
TASK_CREATED
TASK_UPDATED
TASK_VIEWED
TASK_OPENED
TASK_CHECKED
TASK_SYNCED
```

Better:

``` text
TASK_DUE_SOON
TASK_OVERDUE
PDF_SUMMARY_READY
QUIZ_READY
SECURITY_EVENT
```

Before adding a notification type, ask:

> Does the user genuinely benefit from knowing this now?

------------------------------------------------------------------------

# 37. Notification Grouping and Deduplication

The system should be designed so that repetitive events can be grouped
or deduplicated where appropriate.

For example, do not generate ten separate notifications if a single
event can communicate the important information.

Potential future capabilities:

``` text
notification grouping
notification collapsing
digest notifications
quiet hours
daily summaries
```

These are optional extensions, not requirements for the initial
implementation.

------------------------------------------------------------------------

# 38. Database as Source of Truth

The database is authoritative.

For example:

``` text
notifications
    |
    +-- created
    +-- read_at
    +-- type
    +-- recipient
```

A browser push notification is only a delivery representation.

If push is unavailable:

``` text
Push disabled
      |
      v
In-app notification still exists
```

This is required.

------------------------------------------------------------------------

# 39. Delivery Does Not Mean User Saw It

The system must distinguish between:

``` text
Notification created
Notification queued
Push sent
Push failed
Notification clicked
```

Do not automatically label a notification as:

``` text
DELIVERED
```

just because a push request was accepted.

If user interaction tracking is implemented later, use explicit states
such as:

``` text
CLICKED
```

based on actual evidence.

------------------------------------------------------------------------

# 40. Service Worker Responsibilities

The service worker should:

1.  Receive push events.
2.  Parse validated notification payloads.
3.  Display notifications.
4.  Handle notification clicks.
5.  Open/focus the PWA.
6.  Navigate to the relevant application route when appropriate.

It should not contain business authorization logic.

For example:

``` text
Push:
TASK_DUE_SOON
task_id=123

Service Worker:
display notification

User clicks

PWA:
open /tasks/123

Backend:
authorize access
```

------------------------------------------------------------------------

# 41. Notification Click Handling

Notification clicks should route users to useful application locations.

Example:

``` text
PDF_SUMMARY_READY
       |
       v
/summary/123
```

``` text
QUIZ_READY
       |
       v
/quiz/123
```

``` text
TASK_DUE_SOON
       |
       v
/tasks/123
```

The target route must not bypass backend authorization.

------------------------------------------------------------------------

# 42. API Design

The exact route names may follow the existing project's API conventions,
but the subsystem should conceptually expose endpoints for:

``` text
GET    /notifications
GET    /notifications/unread-count
PATCH  /notifications/:id/read
PATCH  /notifications/read-all

GET    /notification-preferences
PATCH  /notification-preferences

POST   /push-subscriptions
DELETE /push-subscriptions/:id
```

Administrative endpoints should be separated and protected:

``` text
POST /admin/notifications/broadcast
```

The exact API structure should follow the existing backend architecture
rather than introducing inconsistent conventions.

------------------------------------------------------------------------

# 43. API Authorization Rules

For normal user endpoints:

``` text
Authenticated user only.
```

For object operations:

``` text
Verify ownership.
```

For administrative operations:

``` text
Authenticated + explicit admin permission.
```

Never rely on:

``` text
Frontend route protection
```

alone.

Backend authorization is mandatory.

------------------------------------------------------------------------

# 44. Recommended Event Flow

The preferred general flow is:

``` text
Feature
  |
  v
Domain Event
  |
  v
Notification Service
  |
  +--> Check notification policy
  |
  +--> Create persistent notification
  |
  +--> Determine enabled channels
  |
  +--> Queue delivery jobs
  |
  v
Notification Worker
  |
  v
Delivery Provider
```

The feature must not directly call:

``` text
web-push
```

or manipulate push subscriptions.

------------------------------------------------------------------------

# 45. Example: Task Reminder

``` text
Task
  |
  | due_at approaching
  v
Scheduler
  |
  v
TASK_DUE_SOON event
  |
  v
Notification Service
  |
  +--> Check user preferences
  |
  +--> Check idempotency
  |
  +--> Create notification
  |
  +--> Queue push delivery
  |
  v
Push Worker
  |
  v
Web Push
```

------------------------------------------------------------------------

# 46. Example: Quiz Ready

``` text
Quiz Worker
    |
    v
Quiz generated successfully
    |
    v
QUIZ_READY
    |
    v
Notification Service
    |
    +--> Database notification
    |
    +--> Push delivery job
```

------------------------------------------------------------------------

# 47. Example: Security Event

``` text
Password changed
      |
      v
SECURITY_PASSWORD_CHANGED
      |
      v
Notification Service
      |
      +--> In-app notification
      |
      +--> Push notification
      |
      +--> Optional email
```

Security notification policy may override ordinary user notification
preferences.

------------------------------------------------------------------------

# 48. Common Beginner Mistakes

The implementation must explicitly avoid these patterns.

## Mistake 1: Notification logic scattered across features

Bad:

``` text
Task code -> push
Quiz code -> push
PDF code -> push
Flashcard code -> push
```

Correct:

``` text
Features -> events -> Notification Service
```

------------------------------------------------------------------------

## Mistake 2: One push subscription per user

Incorrect:

``` text
User
  |
  +-- subscription
```

Correct:

``` text
User
  |
  +-- subscription A
  +-- subscription B
  +-- subscription C
```

------------------------------------------------------------------------

## Mistake 3: Trusting client user IDs

Never trust:

``` json
{
    "user_id": "..."
}
```

for determining authorization.

------------------------------------------------------------------------

## Mistake 4: Sending push synchronously

Avoid:

``` text
HTTP request
   |
   +-- send push
   |
   v
HTTP response
```

Prefer:

``` text
HTTP request
   |
   v
Create/queue work
   |
   v
HTTP response

Worker
   |
   v
Send push
```

------------------------------------------------------------------------

## Mistake 5: Using push as the source of truth

The database must contain the notification.

------------------------------------------------------------------------

## Mistake 6: Allowing arbitrary notification text from clients

Use typed notification events and server-side templates.

------------------------------------------------------------------------

## Mistake 7: No idempotency

Background jobs can execute more than once.

The system must safely handle retries.

------------------------------------------------------------------------

## Mistake 8: No invalid subscription cleanup

Remove/revoke subscriptions that the push service reports as permanently
invalid.

------------------------------------------------------------------------

## Mistake 9: Sending sensitive information in push payloads

Use resource IDs and notification types where possible.

Fetch protected content through authenticated APIs.

------------------------------------------------------------------------

## Mistake 10: Requesting browser permission immediately

Use contextual, user-initiated permission requests.

------------------------------------------------------------------------

## Mistake 11: Making the browser responsible for scheduling

Scheduling belongs on the backend.

------------------------------------------------------------------------

## Mistake 12: No authorization checks on notification objects

Every notification operation must verify ownership or appropriate
administrative permission.

------------------------------------------------------------------------

## Mistake 13: Treating push acceptance as user visibility

A successful push request does not prove the user saw the notification.

------------------------------------------------------------------------

## Mistake 14: No rate limits

Protect subscription, mutation, and broadcast endpoints.

------------------------------------------------------------------------

## Mistake 15: Over-notifying

Notifications should be meaningful, not a stream of implementation
events.

------------------------------------------------------------------------

# 49. Observability

The notification subsystem should produce useful structured logs and
metrics.

Useful metrics include:

``` text
notifications_created
notifications_queued
push_attempts
push_successes
push_failures
invalid_subscriptions
retry_count
notifications_clicked
```

Logs should contain useful identifiers such as:

``` text
notification_id
delivery_id
notification_type
channel
status
error_code
```

Do not log sensitive push credentials or private notification payloads
unnecessarily.

------------------------------------------------------------------------

# 50. Retention

Notifications should not necessarily remain forever.

A retention policy should eventually be defined.

Example:

``` text
Read notifications:
retain for X days

Unread notifications:
retain longer

Security notifications:
retain according to security/audit requirements
```

Do not implement arbitrary deletion without considering whether records
are required for auditing.

The exact retention period should be decided based on product and
project requirements.

------------------------------------------------------------------------

# 51. Extensibility

The initial system supports:

``` text
IN_APP
WEB_PUSH
```

The architecture should allow:

``` text
EMAIL
```

to be added later.

For example:

``` text
Notification
     |
     +---- In-App Delivery
     |
     +---- Web Push Delivery
     |
     +---- Email Delivery (future)
```

Adding email must not require rewriting Tasks, Quiz, PDF, or Flashcard
services.

------------------------------------------------------------------------

# 52. Recommended Initial Architecture for This Project

Do not over-engineer this system.

The project is an academic AI Study Assistant, not a globally
distributed social network.

A strong implementation is:

``` text
Next.js PWA
    |
    +-- Notification UI
    +-- Service Worker
    +-- Push API

Backend
    |
    +-- Notification module
    +-- Existing feature modules
    +-- Existing authentication
    |
    +-- PostgreSQL
    |
    +-- Existing background job infrastructure
         (Celery + Redis if already used)
```

Use the existing infrastructure where possible.

Do not introduce Kafka, RabbitMQ, Kubernetes, microservices, or
additional distributed infrastructure unless the existing project
genuinely requires them.

------------------------------------------------------------------------

# 53. Implementation Phases

Implement the subsystem in the following order.

## Phase 1 --- Domain Model

Define:

``` text
Notification
NotificationType
NotificationPreference
PushSubscription
NotificationDelivery
```

Establish:

-   Foreign keys.
-   Indexes.
-   Constraints.
-   Ownership rules.
-   Notification types.
-   Delivery channels.
-   Status values.
-   Idempotency strategy.

------------------------------------------------------------------------

## Phase 2 --- In-App Notifications

Implement:

``` text
Create notification
List notifications
Unread count
Mark read
Mark all read
```

Secure every endpoint with object-level authorization.

------------------------------------------------------------------------

## Phase 3 --- PWA Push Infrastructure

Implement:

``` text
Service worker
Push permission
Push subscription
VAPID
Subscription registration API
Subscription revocation
```

Test across supported browsers.

------------------------------------------------------------------------

## Phase 4 --- Push Delivery

Implement:

``` text
Notification
   |
   v
Delivery Job
   |
   v
Worker
   |
   v
Web Push
   |
   v
Service Worker
   |
   v
OS notification
```

Add retry handling and invalid-subscription cleanup.

------------------------------------------------------------------------

## Phase 5 --- Feature Integration

Integrate with:

``` text
Tasks
PDF Summarizer
Flashcards
Quiz
Authentication/Security
```

Each integration should emit typed notification events rather than
directly performing notification delivery.

------------------------------------------------------------------------

## Phase 6 --- Reliability and Security

Implement and verify:

``` text
Authorization
CSRF protection where applicable
Rate limiting
Idempotency
Retry policies
Dead subscription cleanup
Structured logging
Audit logging for admin actions
Notification preferences
Security notification policy
```

------------------------------------------------------------------------

# 54. Definition of Done

The notification subsystem should not be considered complete until all
of the following are true:

### Architecture

-   [ ] Notification logic is centralized.
-   [ ] Feature modules do not directly implement push delivery.
-   [ ] Events and notification delivery are separated.
-   [ ] Database is the source of truth.

### In-App

-   [ ] Notifications persist.
-   [ ] Users can list their notifications.
-   [ ] Users can see unread count.
-   [ ] Users can mark notifications as read.
-   [ ] Users cannot access another user's notifications.

### Push

-   [ ] Service worker is registered.
-   [ ] Push permission is user initiated.
-   [ ] Push subscriptions are stored securely.
-   [ ] Multiple subscriptions per user are supported.
-   [ ] VAPID private key is never exposed client-side.
-   [ ] Push clicks navigate correctly.
-   [ ] Invalid subscriptions are revoked/removed.

### Reliability

-   [ ] Push delivery is asynchronous.
-   [ ] Retry behavior exists.
-   [ ] Idempotency/deduplication exists.
-   [ ] Permanent failures do not retry forever.
-   [ ] Delivery states are tracked.

### Security

-   [ ] Authentication is required.
-   [ ] Object-level authorization is enforced.
-   [ ] Client-provided user IDs are not trusted for ownership.
-   [ ] Subscription endpoints are protected.
-   [ ] CSRF protections are applied where appropriate.
-   [ ] Sensitive data is not unnecessarily included in push payloads.
-   [ ] Admin broadcast endpoints are strongly protected.
-   [ ] Rate limiting is implemented where appropriate.

### UX

-   [ ] Users can control normal notification preferences.
-   [ ] The system avoids notification spam.
-   [ ] Permission is requested contextually.
-   [ ] Notifications contain useful actions/links.
-   [ ] Security notifications receive appropriate priority.

------------------------------------------------------------------------

# 55. Non-Negotiable Engineering Rules

The coding agent MUST follow these rules when modifying or extending the
notification system:

1.  **Never bypass the central Notification Service for application
    notifications.**
2.  **Never trust a client-supplied user ID to establish notification
    ownership.**
3.  **Never allow ordinary users to create arbitrary notification
    content for themselves or other users.**
4.  **Never expose VAPID private keys to the client.**
5.  **Never store only one push subscription per user.**
6.  **Never make browser-side polling the primary mechanism for
    scheduled notifications.**
7.  **Never send push notifications synchronously when the operation can
    be queued.**
8.  **Never assume background jobs execute exactly once.**
9.  **Always design notification creation and delivery to be
    idempotent.**
10. **Always handle permanently invalid push subscriptions.**
11. **Never treat push delivery as the source of truth.**
12. **Never place unnecessary sensitive information in push payloads.**
13. **Never use notification payloads as authorization.**
14. **Always re-authorize protected resources after a notification is
    clicked.**
15. **Always enforce object-level authorization on notification APIs.**
16. **Always protect administrative broadcast functionality.**
17. **Always use server-side notification types/templates.**
18. **Do not introduce a new queue, message broker, or infrastructure
    component if the existing project infrastructure already satisfies
    the requirement.**
19. **Do not over-engineer the subsystem beyond the project's actual
    scale and requirements.**
20. **When adding a new notification type, document its event, audience,
    channels, preference behavior, payload data, and idempotency
    strategy.**

------------------------------------------------------------------------

# 56. Target Mental Model

The entire subsystem should ultimately follow this model:

``` text
                 APPLICATION EVENT
                        |
                        v
              +-------------------+
              | Notification      |
              | Policy / Service  |
              +---------+---------+
                        |
              +---------+---------+
              |                   |
              v                   v
       Persistent Record      Delivery Jobs
              |                   |
              v                   v
          IN-APP              WEB PUSH
                                  |
                                  v
                            PUSH SERVICE
                                  |
                                  v
                           SERVICE WORKER
                                  |
                                  v
                          OS NOTIFICATION
```

The most important architectural principle is:

> **Features generate events. The Notification Service decides whether
> and how users should be notified. The database records the
> notification, and asynchronous delivery mechanisms deliver it through
> one or more channels.**

This architecture keeps notification concerns isolated, secure,
testable, retryable, extensible, and suitable for the AI Study Assistant
PWA.
