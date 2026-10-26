FROM python:3.12-slim

# DJANGO_READ_DOT_ENV=0: configuration comes only from the platform's env vars, never a .env file.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_READ_DOT_ENV=0 \
    MEDIA_ROOT=/app/media

WORKDIR /app

COPY requirements/ /app/requirements/
RUN pip install --no-cache-dir -r requirements/base.txt

COPY . /app/
RUN mkdir -p /app/media

# docker-compose overrides this per service (worker / beat); Railway uses it as-is.
CMD ["bash", "deploy/start.sh"]
