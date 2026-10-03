# ADR 0001 — Build as a PWA with a Django/DRF API

- **Status:** Accepted
- **Date:** 2026-10-03

## Context
The first version of the SRS (v1.0) described a native mobile application with a backend API.
We want one codebase that runs on phones, tablets and computers, needs no app-store
distribution, and is quick to iterate on for a final-year project timeline. The SRS has been
revised (v1.1) to specify a PWA.

## Decision
1. The client is a **Progressive Web App** built with **Next.js** (App Router, TypeScript). It is
   installable, mobile-first, and caches its app shell offline through a service worker (Serwist).
2. The backend is a **Django + Django REST Framework** JSON API under `/api/v1/`, backed by
   **PostgreSQL**.
3. **Authentication uses JWT** (SRS §4 Security) through `djangorestframework-simplejwt`:
   - The **access token** (short-lived) is returned in the response body and held **in memory** by the PWA.
     It is sent as `Authorization: Bearer <token>`.
   - The **refresh token** is set as an **httpOnly, Secure, SameSite=Lax cookie** scoped to
     `/api/v1/auth/`, so JavaScript can't read it, which limits the damage from XSS.
     Refresh tokens rotate, and old ones are blacklisted.
4. Development follows **spec-first TDD**. Each system has a spec in `architecture/`.

## Consequences
- No native-mobile code, app-store packaging, or device-only APIs.
- The frontend and API must be **same-site** in production (e.g. `app.example.com` and
  `api.example.com`, or the API proxied through Next.js rewrites), so the SameSite=Lax refresh
  cookie is sent. In dev, `localhost:3000` → `localhost:8000` is same-site.
- CORS must allow credentials, and only for the configured frontend origin.
- Offline support is limited to the app shell and already-loaded data. AI features and Google
  sign-in need a network connection (SRS §2.4).
- Browser PWA support varies (notably iOS Safari), which is accepted as a constraint (SRS §2.4).
