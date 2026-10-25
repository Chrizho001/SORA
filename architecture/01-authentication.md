# 01 — Authentication

**Status:** READY
**Django app:** `apps.accounts`
**SRS refs:** §3.1 User Authentication, §4 Security (JWT, password encryption, Google token verification), §5 (Google Identity Services)
**ADRs:** 0001 (PWA + JWT cookie model), 0002 (Google sign-in)

## 1. Purpose
Let students create an account with email/password **or Google**, prove they own their email
address, sign in, stay signed in securely in the PWA, recover a forgotten password, and manage
their profile. Every other system depends on `request.user` provided by this one.

## 2. Requirements

### Functional
| ID | Requirement | SRS |
|----|-------------|-----|
| FR-1.1 | A user can register with email, password and name | 3.1 |
| FR-1.2 | A new password user receives an email verification link and must verify before logging in | 3.1 |
| FR-1.3 | A user can request the verification email again | 3.1 |
| FR-1.4 | A verified user can log in with email + password | 3.1 |
| FR-1.5 | On login the user receives an authentication token (JWT) | 3.1 |
| FR-1.6 | The session can be silently renewed with a refresh token | 3.1 |
| FR-1.7 | A user can log out, which invalidates the refresh token | 3.1 |
| FR-1.8 | A user can reset a forgotten password via an emailed link | 3.1 |
| FR-1.9 | A user can view and update their profile (names) | 3.1 |
| FR-1.10 | A logged-in user can change their password | 3.1 |
| FR-1.11 | A user can sign up / log in with their Google account in one step (no separate registration) | 3.1 |
| FR-1.12 | An existing email/password user who signs in with Google (same verified email) gets the Google identity linked to their existing account | 3.1 |
| FR-1.13 | A Google-only user can set a password later through password reset | 3.1 |

### Non-functional
| ID | Requirement |
|----|-------------|
| NFR-1.1 | Passwords are hashed with Argon2 (SRS §4 "password encryption") |
| NFR-1.2 | JWT access tokens are short-lived (15 min). Refresh tokens last 7 days, rotate, and are blacklisted after use |
| NFR-1.3 | Refresh token is never readable by JavaScript (httpOnly cookie) |
| NFR-1.4 | Endpoints don't reveal whether an email is registered (except register's duplicate check, see §5) |
| NFR-1.5 | Brute-force protection through rate limiting on login, register, password reset, and resend |
| NFR-1.6 | Auth endpoints respond in < 1 s (excluding email delivery, which is sent after commit) |
| NFR-1.7 | Google ID tokens are verified server-side (signature, `aud` = our client ID, `iss`, `exp`, `email_verified`). The client is never trusted for identity |

## 3. Data model

### `accounts.User` (custom user, `AUTH_USER_MODEL = "accounts.User"`)
Must exist **before the first migration** of the project.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUIDField | PK, default `uuid4`, not editable |
| `email` | EmailField(254) | unique, `USERNAME_FIELD`. Stored lower-cased and trimmed |
| `first_name` | CharField(150) | required on register |
| `last_name` | CharField(150) | `blank=True` at model level (Google may omit `family_name`). Required by the register serializer |
| `password` | (from AbstractBaseUser) | Google-created users get an **unusable** password (`set_unusable_password()`) |
| `is_active` | Boolean | default `True` (admin can deactivate) |
| `is_email_verified` | Boolean | default `False` |
| `is_staff` | Boolean | default `False` |
| `date_joined` | DateTime | default `timezone.now` |
| `updated_at` | DateTime | `auto_now` |

- Base classes: `AbstractBaseUser`, `PermissionsMixin`.
- `REQUIRED_FIELDS = ["first_name", "last_name"]`.
- `UserManager.create_user(email, password, **extra)`: raises `ValueError` if there's no email;
  normalises the email (lower-case the whole address, strip whitespace); hashes the password.
- `UserManager.create_superuser(...)`: sets `is_staff`, `is_superuser`, `is_email_verified` = True.
- Uniqueness is case-insensitive. Normalising on save guarantees this, and a DB constraint
  `UniqueConstraint(Lower("email"), name="user_email_ci_unique")` enforces it.

- Read-only property `has_password` → `self.has_usable_password()` (exposed in `UserSerializer` so the
  PWA knows whether to show "change password" or "set a password").

### `accounts.SocialAccount`
Links an external identity to a user. One user can have at most one account per provider.

| Field | Type | Constraints |
|-------|------|-------------|
| `id` | UUIDField | PK |
| `user` | FK → User | `on_delete=CASCADE`, `related_name="social_accounts"` |
| `provider` | CharField(30) | choices: `google` (more can be added later) |
| `provider_uid` | CharField(255) | the provider's stable subject id (Google `sub`) |
| `email` | EmailField | email asserted by the provider at the last login (informational) |
| `extra_data` | JSONField | `default=dict`. Selected claims (name, picture, locale). Never stores tokens |
| `created_at` / `last_login_at` | DateTime | |

Constraints: `UniqueConstraint(provider, provider_uid)` and `UniqueConstraint(user, provider)`.

### Token storage
- JWT blacklist: `rest_framework_simplejwt.token_blacklist` (`OutstandingToken`, `BlacklistedToken`).
- Email verification and password reset tokens are **stateless** (no table):
  - **Verification:** `django.core.signing.dumps({"uid": str(user.id)}, salt="accounts.verify-email")`,
    validated with `max_age = ACCOUNTS_EMAIL_VERIFICATION_MAX_AGE` (default 24 h).
  - **Password reset:** Django's `PasswordResetTokenGenerator` with `uidb64` of the user id.
    `PASSWORD_RESET_TIMEOUT = 3600` (1 h). The token stops working once the password changes,
    because the generator hashes the password, which makes it single-use.

## 4. API endpoints
Base path: **`/api/v1/auth/`**. URL namespace: `accounts`. All bodies are JSON.

### Shared response shapes
`UserSerializer`:
```json
{ "id": "uuid", "email": "a@b.com", "first_name": "Ada", "last_name": "Lovelace",
  "is_email_verified": true, "has_password": true, "auth_providers": ["google"],
  "date_joined": "2026-10-03T10:00:00Z" }
```
(`auth_providers` lists the linked social providers. It is `[]` for password-only users.)
Error envelope: `{ "detail": "...", "code": "...", "errors": {...}? }`

---
### POST `register/` — name `accounts:register` — AllowAny, throttle scope `auth_register`
Request:
```json
{ "email": "ada@uni.edu", "password": "S3cure!pass", "password_confirm": "S3cure!pass",
  "first_name": "Ada", "last_name": "Lovelace" }
```
| Status | When | Body |
|--------|------|------|
| 201 | Created (`is_email_verified=False`), verification email sent | `UserSerializer` |
| 400 `validation_error` | missing fields, invalid email, password fails `AUTH_PASSWORD_VALIDATORS`, `password_confirm` mismatch, email already registered (`errors.email`) | envelope |
| 429 `throttled` | rate exceeded | envelope |

No tokens are issued on register.

### POST `verify-email/` — `accounts:verify-email` — AllowAny
Request: `{ "token": "<signed token>" }`
| Status | When |
|--------|------|
| 200 | Valid token → `is_email_verified=True`. Idempotent: an already-verified user also gets 200. Body: `{"detail": "Email verified."}` |
| 400 `invalid_token` | bad signature, tampered, unknown user |
| 400 `token_expired` | older than max age |

### POST `verify-email/resend/` — `accounts:verify-email-resend` — AllowAny, throttle `auth_email`
Request: `{ "email": "ada@uni.edu" }` → **always 200** `{"detail": "If the account exists and is unverified, an email has been sent."}`.
An email is only sent if the user exists, is active, and is unverified.

### POST `login/` — `accounts:login` — AllowAny, throttle `auth_login`
Request: `{ "email": "ADA@uni.edu ", "password": "..." }` (the email is normalised before lookup)
| Status | When | Body / side effects |
|--------|------|---------------------|
| 200 | valid credentials, active, verified | `{ "access": "<jwt>", "user": UserSerializer }` + **Set-Cookie** refresh (see §6) |
| 401 `invalid_credentials` | unknown email, wrong password, **or inactive user** (same message for all) | envelope |
| 403 `email_not_verified` | correct credentials but unverified | envelope |
| 429 `throttled` | rate exceeded | envelope |

Updates `last_login`. A Google-only user (unusable password) trying a password login gets
401 `invalid_credentials`, the same as a wrong password.

### POST `google/` — `accounts:google` (implemented name) — AllowAny, throttle `auth_login`
The PWA obtains a Google **ID token** from Google Identity Services ("Sign in with Google" button /
One Tap) and posts it here. This single endpoint handles both sign-up and login.

Request: `{ "credential": "<google id token (JWT)>" }`

| Status | When | Body / side effects |
|--------|------|---------------------|
| 200 | existing linked user, or existing email user now linked | `{ "access", "user", "created": false }` + Set-Cookie refresh |
| 201 | new user created from Google profile | `{ "access", "user", "created": true }` + Set-Cookie refresh |
| 400 `validation_error` | `credential` missing/blank | envelope |
| 401 `google_token_invalid` | signature/`aud`/`iss`/`exp` check fails, or malformed token | envelope |
| 401 `google_email_unverified` | token's `email_verified` is not true | envelope |
| 401 `invalid_credentials` | the matched user is inactive (`is_active=False`) | envelope |
| 409 `account_conflict` | the email belongs to a user who already has a **different** Google account linked | envelope |
| 429 `throttled` | rate exceeded | envelope |
| 503 `google_unavailable` | Google's public keys can't be fetched (network error) | envelope |

Resolution algorithm (`services.google_login(claims) -> (user, created)`), inside a transaction:
1. Look up `SocialAccount(provider="google", provider_uid=sub)`. If found → that user.
2. Otherwise look up a user by normalised `email`. If found → create a `SocialAccount` link.
   - If the user was **already verified**: keep their password (they can log in both ways).
   - If the user was **unverified**: whoever registered that password never proved they own the inbox,
     so call `set_unusable_password()`, blacklist all of the user's outstanding refresh tokens, then set
     `is_email_verified=True`. This prevents a pre-registration takeover, where an attacker registers the
     victim's email first. The rightful owner can add a password later via password reset.
3. Otherwise → create a user: `email`, `first_name=given_name or ""`, `last_name=family_name or ""`,
   `is_email_verified=True`, unusable password, plus a `SocialAccount`. Do **not** send a verification email.
4. Update `SocialAccount.email`, `extra_data`, `last_login_at` and `user.last_login`.
5. Reject inactive users (401). Then issue tokens exactly as `login/` does.

### POST `token/refresh/` — `accounts:token-refresh` — AllowAny (authenticated by cookie)
Requires header `X-Requested-With: XMLHttpRequest` (CSRF defence, see §6). No body.
| Status | When | Body / side effects |
|--------|------|---------------------|
| 200 | valid, non-blacklisted refresh cookie, user still active | `{ "access": "<jwt>" }` + Set-Cookie with the **rotated** refresh token. The old one is blacklisted |
| 401 `refresh_missing` | no cookie | envelope + cookie cleared |
| 401 `refresh_invalid` | expired, malformed, blacklisted, or user inactive/deleted | envelope + cookie cleared |
| 403 `csrf_header_missing` | custom header absent | envelope |

### POST `logout/` — `accounts:logout` — AllowAny (cookie-based), header `X-Requested-With` required
- Blacklists the refresh token from the cookie if one is present and valid. Always clears the cookie.
- **205 Reset Content**, empty body. It still returns 205 if the cookie is missing or invalid (idempotent).
- 403 `csrf_header_missing` without the header.

### POST `password-reset/` — `accounts:password-reset` — AllowAny, throttle `auth_email`
Request: `{ "email": "ada@uni.edu" }` → **always 200** `{"detail": "If the account exists, a reset email has been sent."}`.
Sends an email only to an existing, active user, **including Google-only users with an unusable
password** (this is how they set a password, FR-1.13). Link: `{FRONTEND_URL}/reset-password?uid=<uidb64>&token=<token>`.

### POST `password-reset/confirm/` — `accounts:password-reset-confirm` — AllowAny
Request: `{ "uid": "<uidb64>", "token": "<token>", "new_password": "...", "new_password_confirm": "..." }`
| Status | When |
|--------|------|
| 200 | Password set. **All outstanding refresh tokens for the user are blacklisted.** `{"detail": "Password has been reset."}` |
| 400 `invalid_token` | bad uid/token, already used, expired |
| 400 `validation_error` | weak password / mismatch |

Resetting a password also marks the email as verified, because the user proved they own the inbox.

### GET / PATCH `me/` — `accounts:me` — IsAuthenticated (Bearer)
- GET → 200 `UserSerializer`.
- PATCH `{ "first_name"?, "last_name"? }` → 200 `UserSerializer`. `email`, `id`, `is_email_verified`,
  and `date_joined` are **read-only** and silently ignored.
- 401 `not_authenticated` / `token_not_valid` without a valid Bearer token.

### POST `password/change/` — `accounts:password-change` (implemented path) — IsAuthenticated
Request: `{ "old_password", "new_password", "new_password_confirm" }`
| Status | When |
|--------|------|
| 200 | Password changed. All outstanding refresh tokens are blacklisted. A **new** access token and refresh cookie are issued so the current session survives: `{ "access": "<jwt>" }` + Set-Cookie |
| 400 `validation_error` | wrong `old_password` (`errors.old_password`), weak or mismatched new password |
| 400 `password_not_set` | the user has no usable password (Google-only). They must use password reset to set one |
| 401 | not authenticated |

## 5. Business rules
1. Emails are case-insensitive and whitespace-trimmed everywhere (register, login, resend, reset).
2. Register returns 400 on a duplicate email. This is a deliberate trade-off for UX; NFR-1.4 is
   relaxed here only. Registration is throttled.
3. Unverified users can't log in. They get 403 `email_not_verified` so the PWA can offer
   "resend verification".
4. Inactive users are treated like non-existent users in login, resend, and reset.
5. Emails go out through `transaction.on_commit` from `services.py`
   (`send_verification_email(user)`, `send_password_reset_email(user)`). Link targets are frontend
   routes built from `settings.FRONTEND_URL`:
   - `{FRONTEND_URL}/verify-email?token=<token>`
   - `{FRONTEND_URL}/reset-password?uid=<uidb64>&token=<token>`

   Links are **always** built from `settings.FRONTEND_URL` and **never** from request headers
   (`Origin`, `Referer`, `Host`, `X-Forwarded-Host`). Building them from headers lets an attacker get a
   genuine email that sends the victim's reset token to the attacker's site.
6. Any password change (reset or change) blacklists all of the user's outstanding refresh tokens.
7. Access tokens carry `user_id` (UUID) as the subject claim. No PII beyond that.
8. **Google accounts:** one Google identity maps to exactly one user. A user can have both a
   password and a linked Google account and log in either way.
9. Auto-linking a Google identity to an existing email account happens only when Google asserts
   `email_verified=true`. Linking to a previously **unverified** password account verifies it **and
   removes its password** (see the resolution algorithm in §4, step 2) and revokes its sessions.
10. Google sign-in never overwrites names a user has already set. Names are only filled in on user creation.
11. Registering with email/password using an email that already exists (including a Google-created
    account) → 400 duplicate. The user should sign in with Google, or use password reset to add a password.

## 6. Security & permissions

### JWT settings (`SIMPLE_JWT`)
```python
ACCESS_TOKEN_LIFETIME = timedelta(minutes=15)
REFRESH_TOKEN_LIFETIME = timedelta(days=7)
ROTATE_REFRESH_TOKENS = True
BLACKLIST_AFTER_ROTATION = True
UPDATE_LAST_LOGIN = True
AUTH_HEADER_TYPES = ("Bearer",)
USER_ID_FIELD = "id"
```

### Refresh cookie (`apps/accounts/cookies.py`: `set_refresh_cookie(response, token)`, `clear_refresh_cookie(response)`)
| Attribute | Value |
|-----------|-------|
| name | `settings.AUTH_REFRESH_COOKIE_NAME` (default `"refresh_token"`) |
| HttpOnly | `True` |
| Secure | `settings.AUTH_COOKIE_SECURE` (False in dev/test, True in prod) |
| SameSite | `"Lax"` |
| Path | `/api/v1/auth/` (so the cookie is only sent to auth endpoints) |
| Max-Age | refresh lifetime in seconds |

### CSRF
Refresh and logout are authenticated by a cookie, so they're CSRF-sensitive. Defences:
1. `SameSite=Lax`: browsers don't send the cookie on cross-site POSTs.
2. They require the custom header `X-Requested-With: XMLHttpRequest`. A cross-origin request with a
   custom header triggers a CORS preflight, which `django-cors-headers` rejects for any origin
   not in `CORS_ALLOWED_ORIGINS`.
3. `CORS_ALLOW_CREDENTIALS = True` and `CORS_ALLOWED_ORIGINS = [FRONTEND_URL]` only.

Bearer-authenticated endpoints aren't CSRF-sensitive, because browsers never attach the header automatically.

### Passwords
- `PASSWORD_HASHERS = ["django.contrib.auth.hashers.Argon2PasswordHasher", ...]`
- Validators: UserAttributeSimilarity, MinimumLength(8), CommonPassword, NumericPassword.

### Google token verification (`apps/accounts/google.py`)
- `verify_google_id_token(credential: str) -> dict` calls
  `google.oauth2.id_token.verify_oauth2_token(credential, google.auth.transport.requests.Request(), settings.GOOGLE_CLIENT_ID)`.
  It also checks `iss in {"accounts.google.com", "https://accounts.google.com"}`.
- It maps `ValueError` (bad signature/aud/exp/malformed) → `GoogleTokenInvalid`, and transport errors →
  `GoogleUnavailable`. The view turns these into 401 / 503.
- Settings: `GOOGLE_CLIENT_ID` (env var, required; the same public client ID the PWA uses). No client secret.
- Only the ID token is accepted, never Google access tokens. Tokens are never stored or logged.
- **Tests always patch `apps.accounts.google.verify_google_id_token`** (or the underlying
  `verify_oauth2_token`) and never call Google.
- Google Cloud console: add the frontend origins (`http://localhost:3000`, prod URL) as
  *Authorized JavaScript origins* for the OAuth client.

### Throttling (`DEFAULT_THROTTLE_RATES`)
| Scope | Rate |
|-------|------|
| `auth_login` (password + Google) | 5/min |
| `auth_register` | 10/hour |
| `auth_email` (resend + reset) | 5/hour |

Tests clear the cache before each test (autouse fixture) so throttles don't leak between tests.

### Frontend contract (for the Next.js PWA)
- Keep `access` **in memory** (React context). Never store it in localStorage.
- On app load, and on any 401 from an API call: `POST /auth/token/refresh/` with
  `credentials: "include"` and `X-Requested-With`. On success, retry the request. On 401, go to `/login`.
- All auth requests use `credentials: "include"`.
- **Google:** load Google Identity Services (`https://accounts.google.com/gsi/client`), initialise it with
  `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, and render the "Sign in with Google" button. In the callback, POST
  `response.credential` to `/auth/google/`, then treat the response exactly like a password login.
  Show "Continue with Google" on both the login and register screens. On 409 `account_conflict`, show a
  message telling the user to sign in with their original method.
- If `user.has_password` is false, the profile screen shows "Set a password" (it starts password reset)
  instead of "Change password".

## 7. Test plan (TDD backlog — implement in order)
Files: `apps/accounts/tests/`. Fixtures in `backend/conftest.py`: `api_client`, `user` (verified),
`unverified_user`, `auth_client` (Bearer), `password` (a known strong password).

### Group 0 — Scaffold
- [x] `pytest` runs against Postgres with `config.settings.test` (smoke test: `assert True`, DB access works)
- [x] `AUTH_USER_MODEL == "accounts.User"`

### Group 1 — User model & manager (`test_models.py`)
- [x] `create_user` stores the email lower-cased and trimmed
- [x] `create_user` without an email raises `ValueError`
- [x] the password is hashed with Argon2 and `check_password` works
- [x] new users default to `is_active=True`, `is_email_verified=False`, `is_staff=False`
- [x] a duplicate email (different case) raises `IntegrityError`
- [x] `create_superuser` sets `is_staff`, `is_superuser`, and `is_email_verified`
- [x] `id` is a UUID; `str(user)` returns the email

### Group 2 — Register (`test_api_register.py`)
- [x] valid payload → 201, `UserSerializer` shape, no `password` in the response
- [x] the user is created unverified, with a hashed password
- [x] exactly one verification email goes to the user, containing `{FRONTEND_URL}/verify-email?token=`
- [x] duplicate email (any case) → 400 with `errors.email`
- [x] weak password → 400 with `errors.password`
- [x] `password_confirm` mismatch → 400
- [x] missing required fields → 400 listing each field
- [x] the response follows the error envelope (`detail`, `code="validation_error"`, `errors`)
- [x] exceeding `auth_register` rate → 429

### Group 3 — Email verification (`test_api_verify_email.py`)
- [x] a valid token → 200, user `is_email_verified=True`
- [x] verifying again → 200 (idempotent)
- [x] a tampered token → 400 `invalid_token`
- [x] an expired token (freezegun, > 24 h) → 400 `token_expired`
- [x] a token for a deleted user → 400 `invalid_token`
- [x] resend for an unverified user → 200 + email sent
- [x] resend for an unknown email / verified user / inactive user → 200 + **no** email (identical body)

### Group 4 — Login (`test_api_login.py`)
- [x] valid credentials → 200 with `access` and `user`
- [x] the response sets the refresh cookie: HttpOnly, SameSite=Lax, path `/api/v1/auth/`, max-age 7 d
- [x] the `access` token authenticates against `me/`
- [x] the email is matched case-insensitively and trimmed
- [x] wrong password → 401 `invalid_credentials`
- [x] unknown email → 401 `invalid_credentials` (same body as a wrong password)
- [x] inactive user → 401 `invalid_credentials`
- [x] unverified user with correct password → 403 `email_not_verified`
- [x] `last_login` is updated
- [x] the 6th attempt within a minute → 429

### Group 5 — Token refresh (`test_api_refresh.py`)
- [x] a valid cookie + header → 200 with a new `access` and a rotated refresh cookie (different value)
- [x] the old refresh token is blacklisted after rotation; reusing it → 401 `refresh_invalid`
- [x] no cookie → 401 `refresh_missing`
- [x] a malformed cookie → 401 `refresh_invalid`, cookie cleared
- [x] an expired refresh token (freezegun, > 7 d) → 401
- [x] the user deactivated since login → 401
- [x] a missing `X-Requested-With` header → 403 `csrf_header_missing`

### Group 6 — Logout (`test_api_logout.py`)
- [x] with a valid cookie → 205, the token is blacklisted, the cookie is cleared (max-age 0)
- [x] refresh after logout → 401
- [x] without a cookie → 205 (idempotent)
- [x] a missing header → 403

### Group 7 — Password reset (`test_api_password_reset.py`)
- [x] a known active email → 200 + one email containing `{FRONTEND_URL}/reset-password?uid=…&token=…`
- [x] an unknown or inactive email → 200, identical body, no email
- [x] confirm with a valid uid/token → 200; the new password works for login; the old one doesn't
- [x] confirm marks the email as verified
- [x] confirm blacklists the existing refresh tokens
- [x] reusing the same token → 400 `invalid_token`
- [x] an expired token (> 1 h) → 400 `invalid_token`
- [x] a bad uid → 400 `invalid_token`
- [x] a weak or mismatched new password → 400 `validation_error`
- [x] throttled → 429

### Group 8 — Profile (`test_api_me.py`)
- [x] unauthenticated GET → 401
- [x] GET → 200 `UserSerializer` for the requesting user
- [ ] PATCH names → 200, persisted *(was ticked but not implemented on `main` — re-opened 2026-10-25, Code_Review FEAT-03)*
- [ ] PATCH `email` / `is_email_verified` → ignored (unchanged in the DB) *(re-opened, FEAT-03)*
- [x] an expired access token (freezegun, > 15 min) → 401

### Group 9 — Password change (`test_api_password_change.py`)
- [x] unauthenticated → 401
- [x] wrong `old_password` → 400 `errors.old_password`
- [x] weak or mismatched new password → 400
- [x] success → 200 with a new `access` + refresh cookie; login works with the new password
- [x] refresh tokens issued before the change are blacklisted
- [x] a Google-only user (unusable password) → 400 `password_not_set`

### Group 10 — Google sign-in (`test_google.py`, `test_api_google_login.py`)
Fake claims fixture: `{"sub": "1234567890", "email": "ada@gmail.com", "email_verified": True,
"given_name": "Ada", "family_name": "Lovelace", "iss": "https://accounts.google.com", "aud": GOOGLE_CLIENT_ID}`.
- [x] `SocialAccount` model: `(provider, provider_uid)` unique; `(user, provider)` unique; cascades on user delete
- [x] `verify_google_id_token` returns the claims when `verify_oauth2_token` succeeds (patched)
- [x] `verify_google_id_token` raises `GoogleTokenInvalid` when `verify_oauth2_token` raises `ValueError`
- [x] `verify_google_id_token` raises `GoogleTokenInvalid` for a wrong `iss`
- [x] `verify_google_id_token` raises `GoogleUnavailable` on a transport error
- [x] new Google user → 201, `created: true`, user verified, unusable password, `SocialAccount` created, refresh cookie set, **no** verification email
- [x] returning Google user (same `sub`) → 200, `created: false`, no duplicate user or link
- [x] existing password user with the same email (any case) → 200, Google linked, `is_email_verified` becomes True, password still works
- [x] existing **unverified** password user → linked and now verified
- [ ] existing **unverified** password user → after Google link `has_password` is false, the old password no longer logs in, and old refresh tokens are blacklisted (Code_Review SEC-01)
- [x] names are not overwritten for an existing user
- [x] missing `family_name` → user created with `last_name=""`
- [x] `email_verified=false` → 401 `google_email_unverified`, no user created
- [x] invalid token → 401 `google_token_invalid`
- [x] Google unavailable → 503 `google_unavailable`
- [x] inactive linked user → 401 `invalid_credentials`
- [x] the email's user already linked to a different Google `sub` → 409 `account_conflict`
- [x] missing `credential` → 400
- [x] the returned `access` token works on `me/`, and `me/` shows `auth_providers: ["google"]`, `has_password: false`
- [x] password login for a Google-only user → 401 `invalid_credentials`
- [x] password reset for a Google-only user sends an email; after confirm, `has_password` is true and password login works
- [x] email/password register with a Google user's email → 400 duplicate
- [x] throttled → 429

### Group 11 — Cross-cutting
- [x] the exception handler produces the envelope for 401/403/404/429 as well as 400
- [x] the CORS preflight from `FRONTEND_URL` is allowed with credentials; another origin is not allowed
- [ ] register and password-reset with `Origin: https://evil.example` and `Referer: https://evil.example/x` → emailed link starts with `FRONTEND_URL` (Code_Review SEC-12)
- [ ] `verify-email/`, `token/refresh/`, `password-reset/confirm/` are throttled (`auth_verify` 10/min, `auth_refresh` 30/min, `auth_password` 10/min) (Code_Review SEC-02)
- [ ] no log record contains a user's email address (Code_Review SEC-06)

## 8. Out of scope (v1)
- Social providers other than Google (the `SocialAccount` model allows adding them later).
- Unlinking a Google account from the profile.
- Using Google APIs on the user's behalf (Drive, Calendar). We only need identity, so we never request OAuth scopes or access tokens.
- MFA/2FA, changing the email address, account deletion, admin-facing user management APIs,
  "remember me" variations, session management UI.

## 9. Open questions
- Production email provider (SMTP vs. a transactional service). This only affects `prod.py` settings.
- ~~Production domain layout~~ **Decided 2026-10-25:** the Next.js app proxies `/api/v1/*` to Django
  (same origin), so the `SameSite=Lax` refresh cookie is always first-party. See `00-overview.md` "Deployment".
- Should we store the Google profile picture URL and show it as the avatar? (Currently it's only kept in `extra_data`.)
