"""
Google ID-token verification wrapper.

Isolates the Google ``google-auth`` library behind a small interface
so that tests can patch ``apps.accounts.google.verify_google_id_token``
without making any network calls.

Architecture ref: 01-authentication.md §6 (Google token verification).
ADR: 0002-google-sign-in.md.
"""

import logging

from django.conf import settings

logger = logging.getLogger(__name__)


class GoogleTokenInvalid(Exception):
    """Raised when the Google ID token fails verification (bad signature, aud, iss, exp)."""


class GoogleUnavailable(Exception):
    """Raised when Google's public keys cannot be fetched (network error)."""


def verify_google_id_token(credential: str) -> dict:
    """
    Verify a Google ID token and return the decoded claims.

    Args:
        credential: The raw Google ID token (JWT string) from the frontend.

    Returns:
        dict: The decoded claims (sub, email, email_verified, given_name, etc.).

    Raises:
        GoogleTokenInvalid: If the token is malformed, expired, has a wrong
            audience, or a wrong issuer.
        GoogleUnavailable: If Google's public keys cannot be fetched.

    .. warning::
        Never log the ``credential`` value — it is a bearer token.
    """
    # Lazy imports so that the google-auth library is only loaded when needed
    # and tests that patch this function don't need it installed.
    from google.auth.exceptions import TransportError
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    logger.debug("Verifying Google ID token (token value redacted)")

    try:
        claims = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        logger.warning("Google ID token verification failed: %s", exc)
        raise GoogleTokenInvalid(str(exc)) from exc
    except TransportError as exc:
        logger.error("Google public key fetch failed (network error): %s", exc)
        raise GoogleUnavailable(str(exc)) from exc

    # Additional issuer check (spec §6)
    valid_issuers = {"accounts.google.com", "https://accounts.google.com"}
    if claims.get("iss") not in valid_issuers:
        logger.warning(
            "Google ID token has invalid issuer: iss=%s",
            claims.get("iss"),
        )
        raise GoogleTokenInvalid(f"Invalid issuer: {claims.get('iss')}")

    logger.info("Google ID token verified successfully for sub=%s", claims.get("sub"))
    return claims
