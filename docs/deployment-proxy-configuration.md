# Deployment Reverse Proxy Configuration

This document specifies the reverse proxy configuration requirements for deploying the Study Assistant API (Django + Next.js).

When deploying behind a reverse proxy (e.g., Nginx, Caddy, Traefik, AWS ALB, or Cloudflare), the proxy must enforce body size limits and forward client identification headers securely.

---

## 1. Request Body Size Limits (Pre-Application Rejection)

To protect server storage and memory from denial-of-service via oversized payloads, uploads must be rejected at the reverse proxy layer before buffering into disk (`/tmp`) or memory.

- **Maximum Allowed PDF Upload:** `10 MB`
- **Maximum Request Body (including multipart boundaries/headers):** `12 MB`

### Nginx Directive
```nginx
# Reject any request body exceeding 12 MB with HTTP 413 (Payload Too Large)
client_max_body_size 12M;
```

### Caddy Directive
```caddy
request_body {
    max_size 12MB
}
```

---

## 2. Trusted Proxy & Client IP Headers (DRF Throttling)

The Django application uses Django REST Framework's `ScopedRateThrottle`. To prevent rate-limit bypass via spoofed `X-Forwarded-For` headers while accurately throttling per client IP:

1. **Proxy Headers:**
   The proxy must append or set the real client IP in `X-Forwarded-For`.
2. **`NUM_PROXIES` Setting:**
   In `backend/config/settings/prod.py`, `REST_FRAMEWORK["NUM_PROXIES"]` is configured to `1` by default (or set via `NUM_PROXIES=1` environment variable).
   DRF will inspect the rightmost `NUM_PROXIES` IP addresses from `X-Forwarded-For` added by trusted proxies, ignoring spoofed client-supplied headers.

### Nginx Directives
```nginx
proxy_set_header Host $http_host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

---

## 3. Complete Nginx Server Example

```nginx
upstream django_backend {
    server 127.0.0.1:8000;
}

server {
    listen 443 ssl http2;
    server_name api.sora-study.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/api.sora-study.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.sora-study.com/privkey.pem;

    # Enforce request body limits before buffering
    client_max_body_size 12M;

    location / {
        proxy_pass http://django_backend;
        proxy_http_version 1.1;

        # Forward headers for HTTPS and real client IP
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        # Timeouts for streaming AI responses
        proxy_connect_timeout 60s;
        proxy_read_timeout 120s;
        proxy_send_timeout 60s;
    }
}
```
