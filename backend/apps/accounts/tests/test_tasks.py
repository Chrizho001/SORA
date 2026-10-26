from unittest.mock import patch

import pytest


@pytest.mark.django_db
def test_flush_expired_tokens():
    with patch("apps.accounts.tasks.call_command") as mock_call:
        from apps.accounts.tasks import flush_expired_tokens

        flush_expired_tokens()
        mock_call.assert_called_once_with("flushexpiredtokens")


def test_send_templated_email_task_dispatches_email():
    from django.core import mail

    from apps.accounts.tasks import send_templated_email_task

    mail.outbox.clear()
    send_templated_email_task(
        to="student@uni.edu",
        subject="Welcome!",
        template="accounts/email/verify_email",
        context={"first_name": "Student", "verification_url": "https://sora.study/verify"},
    )
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["student@uni.edu"]
    assert mail.outbox[0].subject == "Welcome!"


def test_send_templated_email_task_retry_configuration():
    from smtplib import SMTPException

    from apps.accounts.tasks import send_templated_email_task

    assert send_templated_email_task.autoretry_for == (SMTPException, OSError)
    assert send_templated_email_task.retry_backoff is True
    assert send_templated_email_task.max_retries == 3
