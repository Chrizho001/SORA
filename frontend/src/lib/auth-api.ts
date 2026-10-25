/**
 * Authentication API Client (Powered by Axios)
 * Adheres strictly to architecture/01-authentication.md
 *
 * Base path: /api/v1/auth/
 * Features:
 * - Credentials included for HttpOnly refresh cookie management
 * - Custom X-Requested-With header for CSRF defense
 * - In-memory JWT access token persistence
 */

import {
  authClient,
  refreshAccessToken,
  setStoredAccessToken,
} from "./axios-client";

export { AuthApiError } from "./axios-client";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_email_verified: boolean;
  has_password: boolean;
  auth_providers: string[];
  date_joined: string;
}

export interface AuthLoginResponse {
  access: string;
  user: User;
}

export interface GoogleLoginResponse extends AuthLoginResponse {
  created?: boolean;
}

export const authApi = {
  /**
   * POST /api/v1/auth/register/
   * Status 201 Created (no tokens issued, verification email dispatched)
   */
  async register(payload: {
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    password_confirm: string;
  }): Promise<User> {
    const res = await authClient.post<User>("/register/", {
      email: payload.email.trim().toLowerCase(),
      first_name: payload.first_name.trim(),
      last_name: payload.last_name.trim(),
      password: payload.password,
      password_confirm: payload.password_confirm,
    });
    return res.data;
  },

  /**
   * POST /api/v1/auth/login/
   * Status 200 OK -> { access, user } + Set-Cookie refresh
   * Status 401 invalid_credentials
   * Status 403 email_not_verified
   */
  async login(payload: {
    email: string;
    password: string;
  }): Promise<AuthLoginResponse> {
    const res = await authClient.post<AuthLoginResponse>("/login/", {
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    });
    setStoredAccessToken(res.data.access);
    return res.data;
  },

  /**
   * POST /api/v1/auth/google/
   * Handles Google Sign-in / Sign-up with Google ID token credential
   */
  async googleLogin(credential: string): Promise<GoogleLoginResponse> {
    const res = await authClient.post<GoogleLoginResponse>("/google/", {
      token: credential,
      credential: credential,
    });
    setStoredAccessToken(res.data.access);
    return res.data;
  },

  /**
   * POST /api/v1/auth/verify-email/
   * Request: { token }
   */
  async verifyEmail(token: string): Promise<{ detail: string }> {
    const res = await authClient.post<{ detail: string }>("/verify-email/", {
      token,
    });
    return res.data;
  },

  /**
   * POST /api/v1/auth/verify-email/resend/
   * Request: { email } -> always 200
   */
  async resendVerification(email: string): Promise<{ detail: string }> {
    const res = await authClient.post<{ detail: string }>(
      "/verify-email/resend/",
      {
        email: email.trim().toLowerCase(),
      }
    );
    return res.data;
  },

  /**
   * POST /api/v1/auth/password-reset/
   * Request: { email } -> always 200
   */
  async requestPasswordReset(email: string): Promise<{ detail: string }> {
    const res = await authClient.post<{ detail: string }>("/password-reset/", {
      email: email.trim().toLowerCase(),
    });
    return res.data;
  },

  /**
   * POST /api/v1/auth/password-reset/confirm/
   * Request: { uid, token, new_password, new_password_confirm }
   */
  async confirmPasswordReset(payload: {
    uid: string;
    token: string;
    new_password: string;
    new_password_confirm: string;
  }): Promise<{ detail: string }> {
    const res = await authClient.post<{ detail: string }>(
      "/password-reset/confirm/",
      payload
    );
    return res.data;
  },

  /**
   * POST /api/v1/auth/token/refresh/
   * Authenticated via HttpOnly cookie; requires X-Requested-With
   */
  async refreshToken(): Promise<{ access: string }> {
    const access = await refreshAccessToken();
    return { access };
  },

  /**
   * POST /api/v1/auth/logout/
   * Status 205 Reset Content; clears HttpOnly cookie and in-memory token
   */
  async logout(): Promise<void> {
    try {
      await authClient.post("/logout/");
    } finally {
      setStoredAccessToken(null);
    }
  },

  /**
   * GET /api/v1/auth/me/
   * Status 200 UserSerializer with Bearer access token
   */
  async getMe(accessToken?: string): Promise<User> {
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
    const res = await authClient.get<User>("/me/", { headers });
    return res.data;
  },
};
