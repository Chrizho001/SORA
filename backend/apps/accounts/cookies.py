"""
Refresh-token cookie helpers.

The refresh token is stored as an httpOnly cookie scoped to the auth
endpoints path. This module provides ``set_refresh_cookie`` and
``clear_refresh_cookie`` so that cookie details are defined in one place.

Architecture ref: 01-authentication.md §6 (Refresh cookie).
"""

import logging

from django.conf import settings

logger = logging.getLogger(__name__)


def set_refresh_cookie(response, token: str) -> None:
    """
    Set the refresh-token cookie on the given response.

    Cookie attributes (from 01-authentication.md §6):
    - HttpOnly: True (JS cannot read it — XSS mitigation)
    - Secure: per settings (True in prod, False in dev/test)
    - SameSite: Lax (browser won't send on cross-site POSTs)
    - Path: /api/v1/auth/ (only sent to auth endpoints)
    - Max-Age: refresh token lifetime in seconds

    Args:
        response: The DRF/Django response object to set the cookie on.
        token: The refresh token string. Never logged.
    """
    max_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())

    response.set_cookie(
        key=settings.AUTH_REFRESH_COOKIE_NAME,
        value=token,
        max_age=max_age,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path=settings.AUTH_COOKIE_PATH,
    )

    logger.debug(
        "Refresh cookie set: name=%s path=%s max_age=%d secure=%s samesite=%s",
        settings.AUTH_REFRESH_COOKIE_NAME,
        settings.AUTH_COOKIE_PATH,
        max_age,
        settings.AUTH_COOKIE_SECURE,
        settings.AUTH_COOKIE_SAMESITE,
    )


def clear_refresh_cookie(response) -> None:
    """
    Delete the refresh-token cookie by setting max-age to 0.

    Args:
        response: The DRF/Django response object to clear the cookie on.
    """
    response.delete_cookie(
        key=settings.AUTH_REFRESH_COOKIE_NAME,
        path=settings.AUTH_COOKIE_PATH,
        samesite=settings.AUTH_COOKIE_SAMESITE,
    )

    logger.debug(
        "Refresh cookie cleared: name=%s path=%s",
        settings.AUTH_REFRESH_COOKIE_NAME,
        settings.AUTH_COOKIE_PATH,
    )
