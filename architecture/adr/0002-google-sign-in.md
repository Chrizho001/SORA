# ADR 0002 — Google sign-in via Google Identity Services ID tokens

- **Status:** Accepted
- **Date:** 2026-10-03

## Context
SRS v1.1 §3.1 requires users to be able to sign up and log in with Google, alongside
email/password. The API already issues its own JWTs (access token in the body, refresh token in an httpOnly cookie,
see ADR 0001). Google sign-in has to end up in exactly the same session model.

Options considered:
1. **django-allauth + dj-rest-auth.** Full-featured, but heavy. It brings session/allauth tables and
   its own flows, and overlaps with the auth endpoints we are specifying and test-driving ourselves.
2. **Server-side OAuth authorization-code redirect flow.** The backend handles the redirect and code exchange.
   It needs a client secret, redirect handling and state management on the API, which is awkward for an SPA/PWA.
3. **Google Identity Services (GIS) ID-token flow.** The PWA renders the "Sign in with Google"
   button, Google returns a signed **ID token** (JWT) to the browser, and the PWA POSTs it to our API.
   The API verifies the signature, `aud`, `iss` and `exp` with the `google-auth` library, then
   finds or creates the user and issues our own tokens.

## Decision
Use **option 3** (GIS ID-token flow), with a single endpoint: `POST /api/v1/auth/google/`.
- Verification uses `google.oauth2.id_token.verify_oauth2_token(token, Request(), GOOGLE_CLIENT_ID)`,
  wrapped in `apps/accounts/google.py::verify_google_id_token` so tests can patch it (no network in tests).
- Linked identities are stored in a `SocialAccount(user, provider, provider_uid)` model, so other
  providers can be added later without changing the user table.
- Accounts are matched by Google `sub` first, then by verified email (auto-link).

## Consequences
- No client secret is needed on the backend. Only the public `GOOGLE_CLIENT_ID` is configured on both sides.
- The frontend loads `https://accounts.google.com/gsi/client`. The CSP must allow it.
- Google-only users have an unusable password. They can set one through the password-reset flow.
- Auto-linking by email is safe only because Google asserts `email_verified=true`. Tokens
  without it are rejected.
