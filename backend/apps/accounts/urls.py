"""
URL configuration for the accounts app.

Base path (set in config/urls.py): /api/v1/auth/
Namespace: accounts

Architecture ref: 01-authentication.md §4.
"""

from django.urls import path

from . import views

app_name = "accounts"

urlpatterns = [
    path("register/", views.RegisterAPIView.as_view(), name="register"),
    path("verify-email/", views.VerifyEmailAPIView.as_view(), name="verify-email"),
    path(
        "verify-email/resend/",
        views.VerifyEmailResendAPIView.as_view(),
        name="verify-email-resend",
    ),
    path("login/", views.LoginAPIView.as_view(), name="login"),
    path("token/refresh/", views.TokenRefreshAPIView.as_view(), name="token-refresh"),
    path("logout/", views.LogoutAPIView.as_view(), name="logout"),
    path("me/", views.MeAPIView.as_view(), name="me"),
    path("password-reset/", views.PasswordResetAPIView.as_view(), name="password-reset"),
    path(
        "password-reset/confirm/",
        views.PasswordResetConfirmAPIView.as_view(),
        name="password-reset-confirm",
    ),
    path("password/change/", views.ChangePasswordAPIView.as_view(), name="password-change"),
    path("google/", views.GoogleLoginAPIView.as_view(), name="google"),
]
