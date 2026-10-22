import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1/auth";

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
    const detail =
      data?.detail ||
      (typeof data === "string" ? data : error.message) ||
      "An unexpected error occurred.";
    const code = data?.code;
    const errors = data?.errors;

    throw new AuthApiError(status, detail, code, errors);
  }
);
