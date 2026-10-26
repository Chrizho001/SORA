"""
Branded email images: inline CID attachments (SMTP) or absolute URLs (HTTP APIs such as Brevo,
which reject inline attachments).
"""

from django.core import mail
from django.test import override_settings

from apps.accounts.emails import send_templated_email


def _send():
    send_templated_email(
        subject="Verify",
        template_prefix="accounts/email/verify_email",
        context={"verify_url": "https://app.example/verify-email?token=t", "user_name": "Ada"},
        recipient_email="ada@example.com",
    )
    return mail.outbox[-1]


def _html(message):
    return next(body for body, mime in message.alternatives if mime == "text/html")


def test_inline_images_by_default():
    message = _send()
    content_ids = {part["Content-ID"] for part in message.attachments}
    assert content_ids == {"<sora_logo>", "<sora_mascot>"}
    assert 'src="cid:sora_mascot"' in _html(message)


@override_settings(EMAIL_INLINE_IMAGES=False, EMAIL_ASSET_BASE_URL="https://app.example/email/")
def test_hosted_images_when_inline_disabled():
    message = _send()
    assert message.attachments == []
    html = _html(message)
    assert 'src="https://app.example/email/sora_mascot_welcome.png"' in html
    assert 'src="https://app.example/email/sora_logo.png"' in html
    assert "cid:" not in html
