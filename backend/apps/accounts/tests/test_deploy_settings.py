"""
Deployment settings guard rails (DEP-01, DEP-02).

Each test imports a settings module in a subprocess with a controlled environment, so
`config.settings.prod` / `config.settings.demo` are evaluated exactly as a server would see them.
"""

import json
import os
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[3]

# A hostile-looking environment: DEBUG=True and a wildcard host must never survive prod/demo.
BASE_ENV = {
    "SECRET_KEY": "test-only-not-secret",
    "DEBUG": "True",
    "ALLOWED_HOSTS": "sora.example.com,api.railway.internal",
    "DATABASE_URL": "postgres://u:p@localhost:5432/db",
    "FRONTEND_URL": "https://sora.example.com",
    "EMAIL_HOST": "smtp.example.com",
    "GOOGLE_CLIENT_ID": "client-id.apps.googleusercontent.com",
    "AI_PROVIDER": "gemini",
    "AI_API_KEY": "test-only",
}

DUMP = """
import json
from django.conf import settings
print(json.dumps({
    "DEBUG": settings.DEBUG,
    "ALLOWED_HOSTS": settings.ALLOWED_HOSTS,
    "CORS_ALLOWED_ORIGINS": settings.CORS_ALLOWED_ORIGINS,
    "CORS_ALLOW_ALL_ORIGINS": getattr(settings, "CORS_ALLOW_ALL_ORIGINS", False),
    "EMAIL_BACKEND": settings.EMAIL_BACKEND,
    "SECURE_SSL_REDIRECT": settings.SECURE_SSL_REDIRECT,
    "AUTH_COOKIE_SECURE": settings.AUTH_COOKIE_SECURE,
    "AUTH_COOKIE_PATH": settings.AUTH_COOKIE_PATH,
    "MIDDLEWARE": settings.MIDDLEWARE,
    "STATIC_ROOT": str(settings.STATIC_ROOT),
    "STATICFILES_BACKEND": settings.STORAGES["staticfiles"]["BACKEND"],
    "NUM_PROXIES": settings.REST_FRAMEWORK.get("NUM_PROXIES"),
}))
"""


def load_settings(module, **extra_env):
    env = {
        "PATH": os.environ.get("PATH", ""),
        "DJANGO_SETTINGS_MODULE": module,
        # Keep the developer's backend/.env out of the picture.
        "DJANGO_READ_DOT_ENV": "0",
        **BASE_ENV,
        **extra_env,
    }
    proc = subprocess.run(
        [sys.executable, "-c", "import django; django.setup()\n" + DUMP],
        env=env,
        cwd=BACKEND_DIR,
        capture_output=True,
        text=True,
    )
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout.strip().splitlines()[-1])


class TestDemoSettings:
    def test_demo_debug_is_false_even_if_env_says_true(self):
        assert load_settings("config.settings.demo")["DEBUG"] is False

    def test_demo_allowed_hosts_has_no_wildcard(self):
        assert "*" not in load_settings("config.settings.demo")["ALLOWED_HOSTS"]

    def test_demo_does_not_open_cors(self):
        s = load_settings("config.settings.demo")
        assert s["CORS_ALLOW_ALL_ORIGINS"] is False
        assert s["CORS_ALLOWED_ORIGINS"] == ["https://sora.example.com"]

    def test_demo_uses_smtp_by_default(self):
        s = load_settings("config.settings.demo")
        assert s["EMAIL_BACKEND"] == "django.core.mail.backends.smtp.EmailBackend"

    def test_demo_console_email_only_when_flag_set(self):
        s = load_settings("config.settings.demo", DEMO_CONSOLE_EMAIL="1")
        assert s["EMAIL_BACKEND"] == "django.core.mail.backends.console.EmailBackend"

    def test_demo_ssl_redirect_can_be_relaxed_for_tls_terminating_tunnel(self):
        assert load_settings("config.settings.demo")["SECURE_SSL_REDIRECT"] is True
        relaxed = load_settings("config.settings.demo", DEMO_SSL_REDIRECT="0")
        assert relaxed["SECURE_SSL_REDIRECT"] is False
        # The refresh cookie stays Secure no matter what.
        assert relaxed["AUTH_COOKIE_SECURE"] is True


class TestProdSettings:
    def test_prod_serves_admin_static_with_whitenoise(self):
        s = load_settings("config.settings.prod")
        mw = s["MIDDLEWARE"]
        security = mw.index("django.middleware.security.SecurityMiddleware")
        assert mw[security + 1] == "whitenoise.middleware.WhiteNoiseMiddleware"
        assert s["STATIC_ROOT"].endswith("staticfiles")
        assert s["STATICFILES_BACKEND"] == (
            "whitenoise.storage.CompressedManifestStaticFilesStorage"
        )

    def test_prod_num_proxies_comes_from_env(self):
        assert load_settings("config.settings.prod", NUM_PROXIES="2")["NUM_PROXIES"] == 2

    def test_prod_refresh_cookie_path_matches_same_origin_api(self):
        s = load_settings("config.settings.prod")
        assert s["AUTH_COOKIE_PATH"] == "/api/v1/auth/"
        assert s["AUTH_COOKIE_SECURE"] is True
        assert s["DEBUG"] is False
