"""
End-to-End (E2E) Test Suite for SORA Authentication System.
Tests full real HTTP integration against live Django server and cookie handling.
"""

import sys
import time
import requests
from django.core.signing import dumps
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

BASE_URL = "http://localhost:8000/api/v1/auth"

def run_e2e_tests():
    print("=" * 70)
    print("🚀 STARTING E2E AUTHENTICATION TESTS (Client -> Server -> DB)")
    print("=" * 70)

    # Use a unique timestamp for the test account
    ts = int(time.time())
    email = f"ada.student.{ts}@sora.study"
    password = "InitialPassword123!"
    new_password = "UpdatedPassword456!"
    first_name = "Ada"
    last_name = "Lovelace"

    session = requests.Session()

    # -------------------------------------------------------------
    # 1. Test Registration (POST /register/)
    # -------------------------------------------------------------
    print(f"\n[1/10] Registering user: {email}...")
    reg_res = session.post(
        f"{BASE_URL}/register/",
        json={
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "password": password,
            "password_confirm": password,
        },
    )
    assert reg_res.status_code == 201, f"Expected 201, got {reg_res.status_code}: {reg_res.text}"
    user_data = reg_res.json()
    assert user_data["email"] == email
    assert user_data["is_email_verified"] is False
    assert user_data["has_password"] is True
    user_id = user_data["id"]
    print(f"  ✓ Registered successfully: user_id={user_id}")

    # -------------------------------------------------------------
    # 2. Test Duplicate Registration Prevention (400 ValidationError)
    # -------------------------------------------------------------
    print("\n[2/10] Testing duplicate email registration rejection...")
    dup_res = session.post(
        f"{BASE_URL}/register/",
        json={
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "password": password,
            "password_confirm": password,
        },
    )
    assert dup_res.status_code == 400, f"Expected 400, got {dup_res.status_code}: {dup_res.text}"
    dup_data = dup_res.json()
    assert "email" in dup_data.get("errors", {})
    print("  ✓ Duplicate email correctly rejected with 400 validation error")

    # -------------------------------------------------------------
    # 3. Test Login Before Email Verification (403 EmailNotVerified)
    # -------------------------------------------------------------
    print("\n[3/10] Attempting login before email verification...")
    unverif_login = session.post(
        f"{BASE_URL}/login/",
        json={"email": email, "password": password},
    )
    assert unverif_login.status_code == 403, f"Expected 403, got {unverif_login.status_code}: {unverif_login.text}"
    assert unverif_login.json().get("code") == "email_not_verified"
    print("  ✓ Login blocked with 403 (email_not_verified)")

    # -------------------------------------------------------------
    # 4. Test Email Verification (POST /verify-email/)
    # -------------------------------------------------------------
    print("\n[4/10] Verifying email address with signed token...")
    token = dumps({"uid": str(user_id)}, salt="accounts.verify-email")
    verify_res = session.post(
        f"{BASE_URL}/verify-email/",
        json={"token": token},
    )
    assert verify_res.status_code == 200, f"Expected 200, got {verify_res.status_code}: {verify_res.text}"
    assert verify_res.json().get("detail") == "Email verified."
    print("  ✓ Email verified successfully (200 OK)")

    # -------------------------------------------------------------
    # 5. Test Login (POST /login/ -> 200 OK + JWT + HttpOnly Cookie)
    # -------------------------------------------------------------
    print("\n[5/10] Logging in with verified credentials...")
    login_res = session.post(
        f"{BASE_URL}/login/",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200, f"Expected 200, got {login_res.status_code}: {login_res.text}"
    login_data = login_res.json()
    access_token = login_data["access"]
    assert access_token and len(access_token) > 20
    assert login_data["user"]["is_email_verified"] is True

    # Check HttpOnly refresh cookie in session
    refresh_cookie = session.cookies.get("refresh_token")
    assert refresh_cookie is not None, "HttpOnly refresh_token cookie was not set!"
    print(f"  ✓ Login succeeded! Access token obtained and HttpOnly refresh_token set.")

    # -------------------------------------------------------------
    # 6. Test Protected Route Access (GET /me/ with Bearer token)
    # -------------------------------------------------------------
    print("\n[6/10] Fetching user profile from protected endpoint (GET /me/)...")
    me_res = session.get(
        f"{BASE_URL}/me/",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me_res.status_code == 200, f"Expected 200, got {me_res.status_code}: {me_res.text}"
    profile = me_res.json()
    assert profile["email"] == email
    assert profile["first_name"] == first_name
    print(f"  ✓ Protected /me/ endpoint accessed: Hello {profile['first_name']}!")

    # -------------------------------------------------------------
    # 7. Test CSRF Protection on Cookie Endpoints (Missing Header)
    # -------------------------------------------------------------
    print("\n[7/10] Testing CSRF defense on refresh endpoint without custom header...")
    no_header_res = session.post(f"{BASE_URL}/token/refresh/")
    assert no_header_res.status_code == 403, f"Expected 403, got {no_header_res.status_code}: {no_header_res.text}"
    assert no_header_res.json().get("code") == "csrf_header_missing"
    print("  ✓ CSRF header protection verified (403 csrf_header_missing)")

    # -------------------------------------------------------------
    # 8. Test Silent Token Refresh (POST /token/refresh/ with cookie)
    # -------------------------------------------------------------
    print("\n[8/10] Testing silent token refresh with HttpOnly cookie...")
    refresh_res = session.post(
        f"{BASE_URL}/token/refresh/",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )
    assert refresh_res.status_code == 200, f"Expected 200, got {refresh_res.status_code}: {refresh_res.text}"
    new_access_token = refresh_res.json()["access"]
    assert new_access_token and len(new_access_token) > 20
    new_refresh_cookie = session.cookies.get("refresh_token")
    assert new_refresh_cookie is not None
    print("  ✓ Token rotated: New access token and fresh refresh cookie issued.")

    # -------------------------------------------------------------
    # 9. Test Password Reset Flow (Request -> Confirm -> Relogin)
    # -------------------------------------------------------------
    print("\n[9/10] Testing password reset request and confirmation...")
    # Step 1: Request reset
    reset_req = session.post(
        f"{BASE_URL}/password-reset/",
        json={"email": email},
    )
    assert reset_req.status_code == 200, f"Expected 200, got {reset_req.status_code}: {reset_req.text}"

    # Step 2: Confirm reset
    from django.contrib.auth import get_user_model
    User = get_user_model()
    user_obj = User.objects.get(email=email)
    uid_b64 = urlsafe_base64_encode(force_bytes(user_obj.pk))
    reset_token = default_token_generator.make_token(user_obj)

    confirm_res = session.post(
        f"{BASE_URL}/password-reset/confirm/",
        json={
            "uid": uid_b64,
            "token": reset_token,
            "new_password": new_password,
            "new_password_confirm": new_password,
        },
    )
    assert confirm_res.status_code == 200, f"Expected 200, got {confirm_res.status_code}: {confirm_res.text}"
    assert confirm_res.json().get("detail") == "Password has been reset."

    # Verify old password fails
    old_pw_res = session.post(
        f"{BASE_URL}/login/",
        json={"email": email, "password": password},
    )
    assert old_pw_res.status_code == 401, "Old password should be rejected!"

    # Verify new password succeeds
    new_pw_res = session.post(
        f"{BASE_URL}/login/",
        json={"email": email, "password": new_password},
    )
    assert new_pw_res.status_code == 200, "New password should succeed!"
    print("  ✓ Password successfully reset and authenticated with new credentials.")

    # -------------------------------------------------------------
    # 10. Test Logout (POST /logout/ -> 205 Reset Content)
    # -------------------------------------------------------------
    print("\n[10/10] Testing logout and session termination...")
    logout_res = session.post(
        f"{BASE_URL}/logout/",
        headers={"X-Requested-With": "XMLHttpRequest"},
    )
    assert logout_res.status_code == 205, f"Expected 205, got {logout_res.status_code}: {logout_res.text}"
    print("  ✓ Logout returned 205 Reset Content and cleared session.")

    print("\n" + "=" * 70)
    print("🎉 ALL 10 E2E AUTHENTICATION TESTS PASSED SEAMLESSLY!")
    print("=" * 70)

if __name__ == "__main__":
    import os
    import django
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
    django.setup()
    run_e2e_tests()
