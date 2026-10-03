import os
import sys
import json
import re

# Setup django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")

import django
django.setup()

from rest_framework.test import APIClient
from django.core import mail
from django.contrib.auth import get_user_model

User = get_user_model()

# Ensure fresh DB for test
User.objects.filter(email="demo@example.com").delete()

client = APIClient()
from django.conf import settings
settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
settings.ALLOWED_HOSTS = ['*']

if hasattr(mail, 'outbox'):
    mail.outbox.clear()
else:
    mail.outbox = []

print("==================================================")
print("     AUTHENTICATION SYSTEM FLOW DEMONSTRATION")
print("==================================================\n")

# 1. REGISTER
print(">> 1. POST /api/v1/auth/register/")
payload = {
    "email": "demo@example.com",
    "password": "StrongPassword123!",
    "password_confirm": "StrongPassword123!",
    "first_name": "Demo",
    "last_name": "User"
}
print(f"Request: {json.dumps(payload, indent=2)}")
res = client.post("/api/v1/auth/register/", payload, format="json")
print(f"Status: {res.status_code}")
print(f"Response: {json.dumps(res.data, indent=2)}\n")

# 2. GET VERIFICATION TOKEN FROM EMAIL
print(">> 2. Intercepting Email for Verification Token...")
verification_email = mail.outbox[0]
print(f"Email Subject: {verification_email.subject}")
match = re.search(r'token=([^ \n]+)', verification_email.body)
verify_token = match.group(1)
print(f"Extracted Token: {verify_token[:15]}...\n")

# 3. VERIFY EMAIL
print(">> 3. POST /api/v1/auth/verify-email/")
payload = {"token": verify_token}
res = client.post("/api/v1/auth/verify-email/", payload, format="json")
print(f"Status: {res.status_code}")
print(f"Response: {json.dumps(res.data, indent=2)}\n")

# 4. LOGIN
print(">> 4. POST /api/v1/auth/login/")
payload = {"email": "demo@example.com", "password": "StrongPassword123!"}
res = client.post("/api/v1/auth/login/", payload, format="json")
print(f"Status: {res.status_code}")
access_token = res.data["access"]
res.data["access"] = f"{access_token[:15]}... (truncated)"
print(f"Response: {json.dumps(res.data, indent=2)}")
refresh_cookie = res.cookies.get("refresh_token")
print(f"Refresh Cookie Received: {bool(refresh_cookie)}\n")

# 5. PROFILE
print(">> 5. GET /api/v1/auth/me/")
client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
res = client.get("/api/v1/auth/me/")
print(f"Status: {res.status_code}")
print(f"Response: {json.dumps(res.data, indent=2)}\n")
client.credentials() # clear credentials

# 6. FORGOT PASSWORD
print(">> 6. POST /api/v1/auth/password-reset/")
mail.outbox.clear()
payload = {"email": "demo@example.com"}
res = client.post("/api/v1/auth/password-reset/", payload, format="json")
print(f"Status: {res.status_code}")
print(f"Response: {json.dumps(res.data, indent=2)}\n")

# 7. GET RESET TOKEN FROM EMAIL
print(">> 7. Intercepting Email for Password Reset...")
reset_email = mail.outbox[0]
print(f"Email Subject: {reset_email.subject}")
match_uid = re.search(r'uid=([^&]+)', reset_email.body)
match_reset_token = re.search(r'&token=([^ \n]+)', reset_email.body)
uid = match_uid.group(1)
reset_token = match_reset_token.group(1)
print(f"Extracted UID: {uid}")
print(f"Extracted Reset Token: {reset_token}\n")

# 8. CONFIRM PASSWORD RESET
print(">> 8. POST /api/v1/auth/password-reset/confirm/")
payload = {
    "uid": uid,
    "token": reset_token,
    "new_password": "New!StrongPassword123",
    "new_password_confirm": "New!StrongPassword123"
}
res = client.post("/api/v1/auth/password-reset/confirm/", payload, format="json")
print(f"Status: {res.status_code}")
print(f"Response: {json.dumps(res.data, indent=2)}\n")

# 9. LOGIN WITH NEW PASSWORD
print(">> 9. POST /api/v1/auth/login/ (with new password)")
payload = {"email": "demo@example.com", "password": "New!StrongPassword123"}
res = client.post("/api/v1/auth/login/", payload, format="json")
print(f"Status: {res.status_code}")
access_token_new = res.data["access"]
res.data["access"] = f"{access_token_new[:15]}... (truncated)"
print(f"Response: {json.dumps(res.data, indent=2)}\n")

# 10. LOGOUT
print(">> 10. POST /api/v1/auth/logout/")
client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token_new}")
res = client.post("/api/v1/auth/logout/", HTTP_X_REQUESTED_WITH="XMLHttpRequest")
print(f"Status: {res.status_code}")
print(f"Cookie cleared: {res.cookies.get('refresh_token').value == ''}")
print("\nFLOW COMPLETE!")
