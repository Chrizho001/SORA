import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
django.setup()

from django.template.loader import render_to_string
from django.conf import settings
from pathlib import Path
from email.mime.image import MIMEImage
from django.core.mail import EmailMultiAlternatives

scratch_dir = Path("/home/chris-friday/.gemini/antigravity-ide/brain/663d7a65-bea4-423b-9eec-6eef69f735bc/scratch")
scratch_dir.mkdir(parents=True, exist_ok=True)

# 1. Render Verify Email Template
verify_context = {
    "first_name": "Ada",
    "verification_url": "http://localhost:3000/verify-email?token=example-signed-token-12345",
    "frontend_url": "http://localhost:3000",
    "logo_src": "http://localhost:3000/images/email/sora_logo.png",
    "mascot_src": "http://localhost:3000/images/email/sora_mascot_welcome.png",
}
verify_html = render_to_string("accounts/email/verify_email.html", verify_context)
(scratch_dir / "verify_email_preview.html").write_text(verify_html, encoding="utf-8")
print("✓ Rendered verify_email_preview.html")

# 2. Render Password Reset Template
reset_context = {
    "first_name": "Ada",
    "reset_url": "http://localhost:3000/reset-password?uid=example-uid&token=example-reset-token-67890",
    "frontend_url": "http://localhost:3000",
    "logo_src": "http://localhost:3000/images/email/sora_logo.png",
    "mascot_src": "http://localhost:3000/images/email/sora_mascot_security.png",
}
reset_html = render_to_string("accounts/email/password_reset.html", reset_context)
(scratch_dir / "password_reset_preview.html").write_text(reset_html, encoding="utf-8")
print("✓ Rendered password_reset_preview.html")

# 3. Test sending MIME message with CID attachments
from apps.accounts.emails import send_templated_email

try:
    print("Testing send_templated_email for verification...")
    send_templated_email(
        subject="Verify your email — SORA",
        template_prefix="accounts/email/verify_email",
        context={
            "first_name": "Ada",
            "verification_url": "http://localhost:3000/verify-email?token=test-token",
        },
        recipient_email="delivered@resend.dev",
        mascot_filename="sora_mascot_welcome.png",
    )
    print("✓ send_templated_email for verification succeeded!")

    print("Testing send_templated_email for password reset...")
    send_templated_email(
        subject="Reset your password — SORA",
        template_prefix="accounts/email/password_reset",
        context={
            "first_name": "Ada",
            "reset_url": "http://localhost:3000/reset-password?uid=test&token=test",
        },
        recipient_email="delivered@resend.dev",
        mascot_filename="sora_mascot_security.png",
    )
    print("✓ send_templated_email for password reset succeeded!")
except Exception as e:
    print(f"Email dispatch error: {e}")
    raise
