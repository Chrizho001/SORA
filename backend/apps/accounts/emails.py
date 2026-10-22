"""
Email dispatching service for SORA Authentication.
Renders responsive HTML emails containing SORA branding, mascot, and styled buttons,
attaching inline graphics via standard MIME Content-ID (CID).
"""

import logging
from email.mime.image import MIMEImage
from pathlib import Path
from typing import Dict, Any, Optional

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)

ASSETS_DIR = Path(__file__).resolve().parent / "static" / "accounts" / "email"


def send_templated_email(
    subject: str,
    template_prefix: str,
    context: Dict[str, Any],
    recipient_email: str,
    mascot_filename: str = "sora_mascot_welcome.png",
) -> None:
    """
    Render and dispatch a multipart HTML + Plain Text email with inline CID image attachments.
    """
    # Provide default template contexts for branding
    email_context = {
        "frontend_url": getattr(settings, "FRONTEND_URL", "http://localhost:3000"),
        "logo_src": "cid:sora_logo",
        "mascot_src": "cid:sora_mascot",
        **context,
    }

    # Render HTML and Text versions
    html_template = f"{template_prefix}.html"
    txt_template = f"{template_prefix}.txt"

    html_content = render_to_string(html_template, email_context)
    text_content = render_to_string(txt_template, email_context)

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "SORA <noreply@sora.study>")

    message = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=from_email,
        to=[recipient_email],
    )
    message.attach_alternative(html_content, "text/html")

    # Attach SORA Logo as inline CID
    logo_path = ASSETS_DIR / "sora_logo.png"
    if logo_path.exists():
        try:
            with open(logo_path, "rb") as f:
                logo_mime = MIMEImage(f.read(), _subtype="png")
                logo_mime.add_header("Content-ID", "<sora_logo>")
                logo_mime.add_header("Content-Disposition", "inline", filename="sora_logo.png")
                message.attach(logo_mime)
        except Exception as e:
            logger.warning("Failed to attach inline logo to email: %s", e)

    # Attach SORA Mascot as inline CID
    mascot_path = ASSETS_DIR / mascot_filename
    if mascot_path.exists():
        try:
            with open(mascot_path, "rb") as f:
                mascot_mime = MIMEImage(f.read(), _subtype="png")
                mascot_mime.add_header("Content-ID", "<sora_mascot>")
                mascot_mime.add_header("Content-Disposition", "inline", filename=mascot_filename)
                message.attach(mascot_mime)
        except Exception as e:
            logger.warning("Failed to attach inline mascot to email: %s", e)

    message.send(fail_silently=False)
    logger.info("Templated email '%s' successfully sent to %s", subject, recipient_email)
