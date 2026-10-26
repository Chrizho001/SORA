#!/usr/bin/env bash
# API container entrypoint (DEP-01, docs/deployment.md).
# One container runs gunicorn + a Celery worker with embedded beat, because the worker reads
# uploaded PDFs from the same local disk (/app/media), which a separate worker could not see.
# If either process exits, the container exits and the platform restarts it.
set -euo pipefail

python manage.py migrate --noinput
python manage.py collectstatic --noinput

# First admin account on hosts without a shell (Render free): set DJANGO_SUPERUSER_EMAIL and
# DJANGO_SUPERUSER_PASSWORD once, then remove them. An existing account is left untouched.
if [ -n "${DJANGO_SUPERUSER_EMAIL:-}" ] && [ -n "${DJANGO_SUPERUSER_PASSWORD:-}" ]; then
  export DJANGO_SUPERUSER_FIRST_NAME="${DJANGO_SUPERUSER_FIRST_NAME:-SORA}"
  export DJANGO_SUPERUSER_LAST_NAME="${DJANGO_SUPERUSER_LAST_NAME:-Admin}"
  python manage.py createsuperuser --noinput || echo "createsuperuser skipped (see message above)."
fi

celery -A config worker --beat --loglevel info --concurrency "${CELERY_CONCURRENCY:-2}" \
  --schedule "${MEDIA_ROOT:-/app/media}/celerybeat-schedule" &

# [::] listens on IPv4 and IPv6.
# The access log includes X-Forwarded-For so NUM_PROXIES can be measured (docs/deployment.md §4).
gunicorn config.wsgi --bind "[::]:${PORT:-8000}" --workers "${WEB_CONCURRENCY:-3}" --timeout 60 \
  --access-logfile - \
  --access-logformat '%(h)s xff="%({x-forwarded-for}i)s" "%(r)s" %(s)s %(b)s %(M)sms' &

trap 'kill -TERM $(jobs -p) 2>/dev/null' TERM INT
wait -n
exit 1
