from django.conf import settings
from django.http import JsonResponse


class RequestSizeLimitMiddleware:
    """
    Rejects requests whose Content-Length exceeds MAX_REQUEST_BODY_SIZE early,
    before Django or DRF reads/buffers the entire payload into memory or temp files.

    Architecture ref: architecture/03-pdf-summary.md §5 rule 8, Code_Review.md SEC-04.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        content_length = request.META.get("CONTENT_LENGTH")
        if content_length:
            try:
                length = int(content_length)
                max_size = getattr(settings, "MAX_REQUEST_BODY_SIZE", 12 * 1024 * 1024)
                if length > max_size:
                    return JsonResponse(
                        {
                            "detail": "Request body too large.",
                            "code": "request_entity_too_large",
                        },
                        status=413,
                    )
            except (ValueError, TypeError):
                pass

        return self.get_response(request)
