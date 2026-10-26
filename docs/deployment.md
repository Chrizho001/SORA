# SORA Deployment & Configuration Guide

This document describes environment configuration, VAPID key generation for Web Push, and deployment steps for the SORA full-stack application (Next.js PWA + Django REST API + Celery).

---

## 1. Web Push (VAPID) Key Generation

SORA uses standard VAPID (Voluntary Application Server Identification) for browser web push notifications.

### Generating Keys
Run the standard web-push utility to generate a new key pair:

```bash
npx web-push generate-vapid-keys
```

This command outputs a **Public Key** and a **Private Key**, for example:
```text
=======================================
Public Key:
BNj...your-public-key...
Private Key:
...your-private-key...
=======================================
```

### Where Each Key Goes

1. **Frontend (`frontend/.env.local` / production environment)**:
   - Variable: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - Value: The generated **Public Key**.
   - Example:
     ```bash
     NEXT_PUBLIC_VAPID_PUBLIC_KEY=BNj...your-public-key...
     ```

2. **Backend (`backend/.env` / production environment)**:
   - Variable: `VAPID_PUBLIC_KEY`
     - Value: The generated **Public Key**.
   - Variable: `VAPID_PRIVATE_KEY`
     - Value: The generated **Private Key** (keep secret; never expose to frontend or git).
   - Variable: `VAPID_CLAIM_EMAIL`
     - Value: A contact URI formatted as `mailto:admin@yourdomain.com`.
   - Example:
     ```bash
     VAPID_PUBLIC_KEY=BNj...your-public-key...
     VAPID_PRIVATE_KEY=...your-private-key...
     VAPID_CLAIM_EMAIL=mailto:support@sora.study
     ```

---

## 2. Environment Variables Checklist

### Frontend (`frontend/.env.local`)
- `NEXT_PUBLIC_API_URL`: Backend auth root (e.g. `http://localhost:8000/api/v1/auth`)
- `NEXT_PUBLIC_BACKEND_API_URL`: Backend API root (e.g. `http://localhost:8000/api/v1`)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth 2.0 Client ID for Identity Services
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: Web push VAPID public key

### Backend (`backend/.env`)
- `SECRET_KEY`: Django secret key
- `DEBUG`: `False` in production
- `ALLOWED_HOSTS`: Domain names / hosts allowed
- `DATABASE_URL`: PostgreSQL connection string (`postgres://...`)
- `FRONTEND_URL`: URL of the frontend PWA (e.g. `https://sora.study`)
- `VAPID_PUBLIC_KEY`: VAPID Public key
- `VAPID_PRIVATE_KEY`: VAPID Private key
- `VAPID_CLAIM_EMAIL`: `mailto:support@sora.study`
- `RESEND_API_KEY`: API key for email delivery
- `DEFAULT_FROM_EMAIL`: Sender address for auth emails
- `AI_API_KEY`: Google Gemini API key

---

## 3. Web Push on iOS Devices

- On iOS (iOS 16.4+), Web Push notifications require the web application to be installed to the user's **Home Screen** (standalone PWA mode).
- If accessed directly inside Mobile Safari or an in-app webview without being added to the Home Screen, `PushManager` and background push notifications are disabled by Apple's platform security policies.
- SORA automatically informs iOS users to add the application to their Home Screen before enabling notifications.

---

## 4. Production Build & Run

### Frontend
```bash
cd frontend
npm run build
npm start
```
*Note: Service Worker and Web Push subscriptions operate in production builds (`npm run build && npm start`) as service workers are disabled during local `next dev` development mode.*

### Backend & Celery
```bash
cd backend
python manage.py migrate
python manage.py runserver

# Celery Worker
celery -A config worker -l info

# Celery Beat (Scheduled Reminders)
celery -A config beat -l info
```
