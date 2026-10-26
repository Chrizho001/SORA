import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "/api/v1/auth";

/**
 * Custom Error Class for Auth API
 */
export class AuthApiError extends Error {
  status: number;
  code?: string;
  errors?: Record<string, string[]>;

  constructor(
    status: number,
    message: string,
    code?: string,
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

// In-memory token store accessor (never in localStorage per security architecture §6)
let inMemoryAccessToken: string | null = null;

export const setStoredAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

export const getStoredAccessToken = (): string | null => {
  return inMemoryAccessToken;
};

type SessionExpiredHandler = () => void;
let sessionExpiredHandler: SessionExpiredHandler | null = null;

export const registerSessionExpiredHandler = (fn: SessionExpiredHandler | null) => {
  sessionExpiredHandler = fn;
};

let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }
  refreshPromise = (async () => {
    try {
      const res = await authClient.post<{ access: string }>("/token/refresh/");
      const newAccess = res.data.access;
      setStoredAccessToken(newAccess);
      return newAccess;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

/**
 * Extracts a human-friendly, informative error message from any API error.
 * Ensures no errors fail silently or leave the user guessing.
 */
export function formatApiErrorMessage(error: unknown): string {
  if (!error) return "An unexpected error occurred. Please try again.";

  // Handle AuthApiError
  if (error instanceof AuthApiError) {
    if (error.errors && typeof error.errors === "object") {
      const fieldMsgs = Object.entries(error.errors)
        .map(([field, msgs]) => {
          const joined = Array.isArray(msgs) ? msgs.join(" ") : String(msgs);
          return field === "non_field_errors" || field === "detail" ? joined : `${field}: ${joined}`;
        })
        .filter(Boolean);
      if (fieldMsgs.length > 0) return fieldMsgs.join(" | ");
    }
    return error.message;
  }

  // Handle AxiosError
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.trim()) {
      return data;
    }
    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      if (record.detail && typeof record.detail === "string") return record.detail;
      if (record.error && typeof record.error === "string") return record.error;
      if (record.message && typeof record.message === "string") return record.message;
      if (record.errors && typeof record.errors === "object") {
        const fieldMsgs = Object.entries(record.errors as Record<string, unknown>)
          .map(([field, msgs]) => {
            const joined = Array.isArray(msgs) ? (msgs as string[]).join(" ") : String(msgs);
            return field === "non_field_errors" || field === "detail" ? joined : `${field}: ${joined}`;
          })
          .filter(Boolean);
        if (fieldMsgs.length > 0) return fieldMsgs.join(" | ");
      }
      // Direct DRF field errors dictionary (e.g. { file: ["Only PDF allowed."] })
      const entries = Object.entries(record);
      if (entries.length > 0) {
        const fieldMsgs = entries
          .map(([field, msgs]) => {
            const joined = Array.isArray(msgs)
              ? msgs.join(" ")
              : typeof msgs === "string"
              ? msgs
              : JSON.stringify(msgs);
            return field === "non_field_errors" || field === "detail" ? joined : `${field}: ${joined}`;
          })
          .filter(Boolean);
        if (fieldMsgs.length > 0) return fieldMsgs.join(" | ");
      }
    }

    // Status code fallbacks
    const status = error.response?.status;
    if (status === 400) return "Invalid request. Please check your document and inputs.";
    if (status === 401) return "Your session has expired. Please sign in again.";
    if (status === 403) return "You do not have permission to perform this action.";
    if (status === 404) return "The requested study resource could not be found.";
    if (status === 413) return "File exceeds maximum size limit (10MB). Please choose a smaller PDF.";
    if (status === 429) return "AI rate limit reached. Please wait a moment and try again.";
    if (status === 500) return "Internal server error. Please try again shortly.";
    if (status === 502 || status === 503 || status === 504) {
      return "The study server is temporarily unavailable. Please try again in a moment.";
    }

    if (error.message?.includes("Network Error")) {
      return "Unable to connect to the study server. Please check your connection.";
    }
    if (error.message?.includes("timeout")) {
      return "The request timed out. Please try again.";
    }
    return error.message || "An unexpected error occurred.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}

/**
 * Configured Axios instance for SORA Authentication
 * - withCredentials: true ensures HttpOnly refresh cookies are transmitted across origins
 * - X-Requested-With: XMLHttpRequest triggers Django CSRF protections for cookie endpoints
 */
export const authClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  timeout: 10000,
});

// Request interceptor: attach Bearer token if present
authClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (inMemoryAccessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle errors & normalize error responses
authClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ detail?: string; code?: string; errors?: Record<string, string[]> }>) => {
    if (!error.response) {
      throw new AuthApiError(
        0,
        "Network connection failed. Please ensure the backend server is reachable.",
        "network_error"
      );
    }

    const { status, data } = error.response;
    const detail = formatApiErrorMessage(error);
    const code = data?.code;
    const errors = data?.errors;

    throw new AuthApiError(status, detail, code, errors);
  }
);

export const BACKEND_API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL || "/api/v1";

/**
 * General API Client for SORA Backend (Documents, Flashcards, Quizzes, Tasks, Notifications)
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: BACKEND_API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  timeout: 15000,
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const isRefreshOrLogin =
      config.url?.includes("/token/refresh/") ||
      config.url?.includes("/login/");

    if (!inMemoryAccessToken && !isRefreshOrLogin) {
      try {
        await refreshAccessToken();
      } catch {
        // If refresh fails, proceed without token; response interceptor handles 401
      }
    }

    if (inMemoryAccessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ detail?: string; code?: string; errors?: Record<string, string[]> }>) => {
    if (!error.response) {
      throw new AuthApiError(
        0,
        "Network connection failed. Please ensure the backend server is reachable.",
        "network_error"
      );
    }

    const { status, data, config } = error.response;

    // Handle token refresh on 401 for authenticated endpoints
    const originalRequest = config as InternalAxiosRequestConfig & { _retry?: boolean };
    const isRefreshOrLogin =
      originalRequest.url?.includes("/token/refresh/") ||
      originalRequest.url?.includes("/login/");

    if (status === 401 && !originalRequest._retry && !isRefreshOrLogin) {
      originalRequest._retry = true;
      const failedToken = inMemoryAccessToken;
      try {
        const newAccess = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch {
        if (inMemoryAccessToken === failedToken) {
          setStoredAccessToken(null);
        }
        sessionExpiredHandler?.();
        throw new AuthApiError(401, "Your session has expired. Please sign in again.", "token_expired");
      }
    }

    const detail = formatApiErrorMessage(error);
    const code = data?.code;
    const errors = data?.errors;

    throw new AuthApiError(status, detail, code, errors);
  }
);
