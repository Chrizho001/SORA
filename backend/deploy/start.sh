#!/usr/bin/env bash
# Railway "api" service entrypoint (DEP-01, docs/deployment.md).
# One container runs gunicorn + a Celery worker with embedded beat, because the worker reads
# uploaded PDFs from the same volume (/app/media) and a Railway volume attaches to one service.
# If either process exits, the container exits and Railway restarts it.
set -euo pipefail

python manage.py migrate --noinput
python manage.py collectstatic --noinput

celery -A config worker --beat --loglevel info --concurrency "${CELERY_CONCURRENCY:-2}" \
  --schedule "${MEDIA_ROOT:-/app/media}/celerybeat-schedule" &

# [::] listens on IPv4 and IPv6 (Railway's private network can be IPv6-only).
gunicorn config.wsgi --bind "[::]:${PORT:-8000}" --workers "${WEB_CONCURRENCY:-3}" --timeout 60 \
  --access-logfile - &

trap 'kill -TERM $(jobs -p) 2>/dev/null' TERM INT
wait -n
exit 1
