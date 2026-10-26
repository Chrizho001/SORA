# SORA Deployment Guide (Railway)

*Last updated 2026-10-26 (P-18: DEP-01, DEP-02, FE-23).*

SORA runs on [Railway](https://railway.com) on **one public HTTPS origin**. The browser only ever talks to
the Next.js `web` service. Next.js forwards `/api/v1/*` to Django over Railway's private network, so the
refresh cookie is first-party and Django has no public URL.

```
 phone / browser ──HTTPS──▶ web  (Next.js `npm start`, public domain *.up.railway.app)
                              │  rewrites /api/v1/* → http://api.railway.internal:8000/api/v1/*/
                              ▼
                            api  (Docker: gunicorn + Celery worker with embedded beat)
                              │   └── volume mounted at /app/media (uploaded PDFs, beat schedule)
                              ├──▶ Postgres (Railway plugin)
                              └──▶ Redis    (Railway plugin: Celery broker + throttle cache)
```

**Why the API and the worker share one container.** The Celery worker opens the uploaded PDF from disk,
and a Railway volume attaches to exactly one service. Running gunicorn and `celery worker --beat` together
(`backend/deploy/start.sh`) keeps the PDFs on one volume without adding object storage. If either process
exits, the container exits and Railway restarts it. To scale out later, move uploads to S3-compatible
storage and split the worker into its own service.

| Piece | File |
|---|---|
| API image | `backend/Dockerfile`, `backend/.dockerignore` |
| API start (migrate, collectstatic, worker + beat, gunicorn) | `backend/deploy/start.sh` |
| API Railway config | `backend/railway.json` |
| Web Railway config | `frontend/railway.json` |
| Same-origin proxy | `frontend/next.config.ts` (`rewrites`, `skipTrailingSlashRedirect`) |
| Settings | `config.settings.prod` (the deployment); `config.settings.demo` (prod + two flags, below) |

---

## 1. Environment variables

Set these in the Railway dashboard (service → Variables) or with `railway variables --set`. **Never commit
values.** `${{...}}` are Railway reference variables.

### `api` service
| Variable | Value |
|---|---|
| `DJANGO_SETTINGS_MODULE` | `config.settings.prod` |
| `SECRET_KEY` | 50+ random characters: `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `ALLOWED_HOSTS` | `api.railway.internal` (the Host that Next.js sends when proxying) |
| `FRONTEND_URL` | `https://<web public domain>` (email links are built only from this) |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `NUM_PROXIES` | `1` (see §4) |
| `PORT` | `8000` (fixed, so the web service knows where to proxy) |
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_USE_TLS` | `True` |
| `EMAIL_HOST_USER` | the Gmail address |
| `EMAIL_HOST_PASSWORD` | a Gmail **app password** (Google Account → Security → App passwords) |
| `DEFAULT_FROM_EMAIL` | `SORA <the Gmail address>` |
| `GOOGLE_CLIENT_ID` | the OAuth web client ID |
| `AI_PROVIDER` | `gemini` |
| `AI_API_KEY` | Gemini API key |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | generate with `npx web-push generate-vapid-keys` (§5) |
| `VAPID_CLAIM_EMAIL` | `mailto:<the Gmail address>` |
| `MEDIA_ROOT` | `/app/media` (already the image default; the volume is mounted here) |

### `web` service
| Variable | Value |
|---|---|
| `BACKEND_INTERNAL_URL` | `http://api.railway.internal:8000` (read at **build** time; redeploy after changing it) |
| `NEXT_PUBLIC_API_URL` | `/api/v1/auth` |
| `NEXT_PUBLIC_BACKEND_API_URL` | `/api/v1` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | same as `GOOGLE_CLIENT_ID` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | same as `VAPID_PUBLIC_KEY` |

`NEXT_PUBLIC_*` values are compiled into the browser bundle, so they must never hold secrets.

### `config.settings.demo`
Only for a tunnel demo (e.g. a laptop behind a TLS-terminating tunnel), never instead of a real deploy.
It is `prod` with two optional flags: `DEMO_SSL_REDIRECT=0` (the tunnel already did TLS) and
`DEMO_CONSOLE_EMAIL=1` (print emails to the log). `DEBUG` stays `False`, `ALLOWED_HOSTS` and CORS stay
closed, and accounts must still verify their email. `config.settings.dev` is **never** exposed publicly.

---

## 2. Step-by-step checklist

1. **Log in:** `railway login`, then from the repo root `railway init` (project name `sora`).
2. **Databases:** add the Postgres and Redis plugins (`railway add --database postgres`,
   `railway add --database redis`).
3. **api service:** create an empty service named `api`, set its variables (§1), and attach a volume
   mounted at `/app/media`. Deploy from `backend/`: `cd backend && railway up --service api`.
   Do **not** generate a public domain for it.
4. **web service:** create an empty service named `web` and set its variables (§1). Generate a public
   domain (Settings → Networking). Put that URL in the api service's `FRONTEND_URL` and redeploy api.
   Deploy: `cd frontend && railway up --service web`.
5. **Google sign-in (manual):** Google Cloud Console → APIs & Services → Credentials → the OAuth web
   client → *Authorized JavaScript origins* → add `https://<web public domain>`.
6. **Admin user (optional):** `railway ssh --service api`, then `python manage.py createsuperuser`.
   The Django admin is not proxied, so it is only reachable from inside Railway.

Migrations and `collectstatic` run on every start of the api container (`deploy/start.sh`).

---

## 3. Smoke test (after every deploy)

- [ ] `https://<domain>/` loads over HTTPS with a valid certificate.
- [ ] `https://<domain>/api/v1/tasks/` returns `401` JSON in the error envelope (proxy works; DEBUG off).
- [ ] Sign up with a real address, receive the verification email, click the link, log in.
- [ ] Reload the dashboard: you stay logged in (refresh cookie works through the proxy).
- [ ] Upload a PDF and see its summary appear (worker running, volume readable).
- [ ] Create a deck with 4 cards, take a quiz and see the score.
- [ ] Open the URL on a phone and install it to the Home Screen; it opens full-screen.
- [ ] Turn on airplane mode and open the installed app: the app shell or offline page opens.
- [ ] Enable notifications in Settings and receive a push (iOS: only from the installed app).
- [ ] `NUM_PROXIES` (§4): log in from two different networks (Wi-Fi and mobile data) and confirm they are
      not throttled together.

---

## 4. `NUM_PROXIES` (SEC-03)

DRF's throttles identify a client by the `X-Forwarded-For` entry that is `NUM_PROXIES` from the right.
Measured in the local rehearsal (2026-10-26): Next.js rewrites **pass `X-Forwarded-For` through unchanged**
and do not append an entry of their own. So the only proxy that appends the client's address is Railway's
edge, and the correct value is **`NUM_PROXIES=1`**. A higher value lets a client spoof its IP by sending
its own `X-Forwarded-For`; a lower value (0) would put every user in one throttle bucket.

To re-check after a platform change, log `request.META["HTTP_X_FORWARDED_FOR"]` once from the api service
and confirm the rightmost entry is your real public IP.

---

## 5. Web Push (VAPID) keys

```bash
npx web-push generate-vapid-keys
```
- **Public key** → `VAPID_PUBLIC_KEY` (api) and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (web).
- **Private key** → `VAPID_PRIVATE_KEY` (api only; keep secret, never in the frontend or git).
- `VAPID_CLAIM_EMAIL` → a contact URI such as `mailto:you@example.com`.

Generate a separate pair for production; don't reuse the development keys.

### Web Push on iOS
On iOS 16.4+ web push only works once the app is installed to the Home Screen (standalone PWA). In Safari
or an in-app webview, `PushManager` is unavailable. SORA tells iOS users to install the app before enabling
notifications.

---

## 6. Local development

```bash
docker compose up -d db redis
cd backend && source .venv/bin/activate
python manage.py migrate && python manage.py runserver      # :8000
celery -A config worker -l info                              # second terminal
celery -A config beat -l info                                # third terminal
cd frontend && npm run dev                                   # :3000, proxies /api/v1 to :8000
```
The frontend uses the same relative `/api/v1` URLs locally; `BACKEND_INTERNAL_URL` defaults to
`http://localhost:8000`. Service workers are disabled in `next dev`. To test install/offline locally, run
`npm run build && npm start`.
