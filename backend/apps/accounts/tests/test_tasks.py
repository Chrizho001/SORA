from unittest.mock import patch

import pytest


@pytest.mark.django_db
def test_flush_expired_tokens():
    with patch("apps.accounts.tasks.call_command") as mock_call:
        from apps.accounts.tasks import flush_expired_tokens

        flush_expired_tokens()
        mock_call.assert_called_once_with("flushexpiredtokens")
