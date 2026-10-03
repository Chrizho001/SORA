"""
Custom DRF exception handler — error envelope.

Every error response follows a consistent shape:
    {
        "detail": "Human-readable message",
        "code":   "machine_code",
        "errors": {"field": ["msg"]}    # only for validation errors
    }

Architecture ref: CLAUDE.md, architecture/00-overview.md, 01-authentication.md §4.
"""

import logging

from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Wrap DRF's default exception handler to normalise every error response
    into the ``{detail, code, errors?}`` envelope.
    """
    response = exception_handler(exc, context)

    if response is None:
        # Unhandled exceptions bubble up to Django's 500 handler.
        return None

    # --- Build the envelope ------------------------------------------------
    view = context.get("view", None)
    view_name = view.__class__.__name__ if view else "UnknownView"

    # Determine the machine code
    code = _get_code(exc, response)

    # Determine the human-readable detail
    detail = _get_detail(exc, response)

    # Determine field-level errors (validation errors only)
    errors = _get_field_errors(exc, response)

    envelope = {"detail": detail, "code": code}
    if errors:
        envelope["errors"] = errors

    response.data = envelope

    # --- Logging -----------------------------------------------------------
    _log_exception(exc, response, view_name, code, detail)

    return response


def _get_code(exc, response):
    """Extract or derive a machine-readable error code."""
    # The exception itself may carry a `default_code` or `code` attribute.
    if hasattr(exc, "get_codes"):
        codes = exc.get_codes()
        # For DRF ValidationError, get_codes() returns a dict of field → [codes].
        # We want the top-level code to be 'validation_error'.
        from rest_framework.exceptions import ValidationError
        if isinstance(exc, ValidationError):
            return "validation_error"
            
        if isinstance(codes, dict):
            # For non-validation errors with dict details (like SimpleJWT), 
            # the literal code we want is often the string value in exc.detail["code"].
            if hasattr(exc, "detail") and isinstance(exc.detail, dict) and "code" in exc.detail:
                return str(exc.detail["code"])
            return codes.get("code") or getattr(exc, "default_code", "error")
        if isinstance(codes, list):
            return codes[0] if codes else "error"
        return codes

    if hasattr(exc, "default_code"):
        return exc.default_code

    # Fallback based on status code
    status_to_code = {
        401: "not_authenticated",
        403: "permission_denied",
        404: "not_found",
        405: "method_not_allowed",
        429: "throttled",
    }
    return status_to_code.get(response.status_code, "error")


def _get_detail(exc, response):
    """Extract a human-readable detail message."""
    if hasattr(exc, "detail"):
        from rest_framework.exceptions import ValidationError
        detail = exc.detail
        
        if isinstance(exc, ValidationError):
            return "Validation error."
            
        if isinstance(detail, dict) and "detail" in detail:
            return str(detail["detail"])
            
        return str(detail)
    return response.reason_phrase or "An error occurred."


def _get_field_errors(exc, response):
    """
    Extract field-level error messages for validation errors.

    Returns a dict of {field: [messages]} or None if not a validation error.
    """
    if not hasattr(exc, "detail"):
        return None

    detail = exc.detail
    if not isinstance(detail, dict):
        return None

    # Convert DRF's ErrorDetail objects to plain strings
    errors = {}
    for field, messages in detail.items():
        if isinstance(messages, list):
            errors[field] = [str(m) for m in messages]
        else:
            errors[field] = [str(messages)]

    return errors or None


def _log_exception(exc, response, view_name, code, detail):
    """
    Log the exception at the appropriate level.

    - 4xx client errors → WARNING (expected, but worth tracking)
    - 5xx server errors → ERROR (unexpected, needs attention)

    NEVER log secrets, tokens, passwords, or sensitive request bodies.
    """
    status = response.status_code

    log_msg = (
        f"API error: status={status} code={code} view={view_name} "
        f"detail={detail!r}"
    )

    if status >= 500:
        logger.error(log_msg, exc_info=True)
    elif status in (401, 403):
        # Auth failures are security-relevant — log at WARNING
        logger.warning(log_msg)
    elif status == 429:
        logger.warning(log_msg)
    else:
        # 400, 404, etc.
        logger.info(log_msg)
