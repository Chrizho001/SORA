"""
Demo settings (DEP-02): production settings for a public demo URL.

Derived from prod. Only two things may be relaxed, each behind an explicit flag:
- DEMO_SSL_REDIRECT=0 turns off SECURE_SSL_REDIRECT when a tunnel terminates TLS and talks plain
  HTTP to Django (cookies stay Secure).
- DEMO_CONSOLE_EMAIL=1 prints emails to the log instead of sending them.

Never relax DEBUG, ALLOWED_HOSTS, CORS or account verification here.
"""

# ruff: noqa: F405

from .prod import *  # noqa: F401, F403

SECURE_SSL_REDIRECT = env.bool("DEMO_SSL_REDIRECT", default=True)

if env.bool("DEMO_CONSOLE_EMAIL", default=False):
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
