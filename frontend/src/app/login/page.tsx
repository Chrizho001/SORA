"use client";

import React, { useState, useEffect, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCardLayout } from "@/components/auth/AuthCardLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { MascotEmotion } from "@/components/auth/SoraMascot";
import { notify } from "@/components/auth/ToastProvider";
import { loginSchema, LoginFormData } from "@/lib/auth-schemas";
import { authApi, AuthApiError } from "@/lib/auth-api";
import { useAuth } from "@/lib/auth-context";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired");
  const { login } = useAuth();
  const [isPending, startTransition] = useTransition();

  // Show expired toast on mount if ?expired=1
  useEffect(() => {
    if (expired === "1") {
      notify.info("Your session expired — please sign in again", "Session Expired");
    }
  }, [expired]);

  // Form State
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
    remember_me: false,
  });

  // Validation Errors
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof LoginFormData, boolean>>>({});
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [lastSubmissionFailed, setLastSubmissionFailed] = useState(false);

  // Validate a single field in real-time
  const validateField = <K extends keyof LoginFormData>(
    field: K,
    value: LoginFormData[K]
  ) => {
    const fieldData = { ...formData, [field]: value };
    const result = loginSchema.safeParse(fieldData);

    if (!result.success) {
      const fieldIssue = result.error.issues.find((issue) => issue.path[0] === field);
      setErrors((prev) => ({
        ...prev,
        [field]: fieldIssue ? fieldIssue.message : undefined,
      }));
    } else {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleChange = <K extends keyof LoginFormData>(
    field: K,
    value: LoginFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setLastSubmissionFailed(false);
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleBlur = (field: keyof LoginFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
    setIsInputFocused(false);
  };

  // Determine SORA Mascot Emotion
  const hasErrors = Object.values(errors).some(Boolean) || lastSubmissionFailed;
  const isFormValid =
    formData.email.length > 0 &&
    formData.password.length > 0 &&
    !hasErrors;

  let mascotEmotion: MascotEmotion = "neutral";
  let mascotMessage: string | undefined = undefined;

  if (isPending) {
    mascotEmotion = "thinking";
    mascotMessage = "Verifying your credentials...";
  } else if (hasErrors) {
    mascotEmotion = "angry";
    mascotMessage = "Wait a second... please check your inputs!";
  } else if (isFormValid) {
    mascotEmotion = "happy";
    mascotMessage = "Looking crisp! Let's get you studying.";
  } else if (isInputFocused) {
    mascotEmotion = "focused";
    mascotMessage = "Type away, I'm watching!";
  }

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all as touched
    setTouched({ email: true, password: true });

    // Validate with Zod
    const validationResult = loginSchema.safeParse(formData);
    if (!validationResult.success) {
      const newErrors: Partial<Record<keyof LoginFormData, string>> = {};
      for (const issue of validationResult.error.issues) {
        const key = issue.path[0] as keyof LoginFormData;
        if (!newErrors[key]) {
          newErrors[key] = issue.message;
        }
      }
      setErrors(newErrors);
      setLastSubmissionFailed(true);
      notify.error(
        "Please fix the validation errors before submitting.",
        "Invalid Details"
      );
      return;
    }

    setErrors({});
    setLastSubmissionFailed(false);

    startTransition(async () => {
      try {
        const response = await authApi.login({
          email: formData.email,
          password: formData.password,
        });

        login(response.access, response.user);
        notify.success(
          `Welcome back, ${response.user.first_name}! Preparing your study dashboard.`,
          "Signed In Successfully"
        );

        // Redirect to target or dashboard
        const rawNext = searchParams?.get("next");
        const targetUrl =
          rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("\\")
            ? rawNext
            : "/dashboard";

        setTimeout(() => {
          router.push(targetUrl);
        }, 800);
      } catch (err: unknown) {
        setLastSubmissionFailed(true);
        if (err instanceof AuthApiError) {
          if (err.status === 401) {
            notify.error(
              "Invalid email or password. Please verify your credentials and try again.",
              "Authentication Failed"
            );
          } else if (err.status === 403 && err.code === "email_not_verified") {
            notify.error(
              "Your email is not verified yet. Please check your inbox or request a new verification link.",
              "Email Unverified"
            );
          } else if (err.status === 429) {
            notify.error(
              "Too many attempts from this IP address. Please wait a moment before trying again.",
              "Rate Limit Exceeded"
            );
          } else {
            notify.error(
              err.message || "Failed to log in. Please check your credentials.",
              "Sign In Error"
            );
          }
        } else {
          notify.error(
            "Could not connect to the authentication server. Please check your network connection.",
            "Connection Error"
          );
        }
      }
    });
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = () => {
    notify.info(
      "Connecting to Google Identity Services...",
      "Google Sign-In"
    );
  };

  const rawNext = searchParams?.get("next");

  return (
    <AuthCardLayout
      title="Welcome back"
      subtitle="Enter your credentials to continue your study sessions."
      mascotEmotion={mascotEmotion}
      mascotMessage={mascotMessage}
      footerLink={{
        prompt: "Don't have an account?",
        label: "Sign up for free",
        href: rawNext ? `/signup?next=${encodeURIComponent(rawNext)}` : "/signup",
      }}
      secondaryLink={{
        label: "Need help?",
        href: "mailto:support@sora.study",
      }}
    >
      <div className="space-y-4">
        {/* Google Authentication Button */}
        <GoogleAuthButton
          label="Sign in with Google"
          onClick={handleGoogleSignIn}
        />

        {/* Divider */}
        <div className="relative flex items-center justify-center my-6">
          <div className="w-full border-t border-line" />
          <span className="absolute bg-surface px-3 text-xs font-medium text-subtle uppercase tracking-wider">
            or continue with email
          </span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Email Input */}
          <AuthInput
            id="login-email"
            type="email"
            label="Email address"
            autoComplete="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            onFocusChange={setIsInputFocused}
            error={touched.email ? errors.email : undefined}
            isValid={touched.email && !errors.email && formData.email.length > 0}
            disabled={isPending}
            placeholder="student@university.edu"
          />

          {/* Password Input */}
          <AuthInput
            id="login-password"
            type="password"
            label="Password"
            autoComplete="current-password"
            value={formData.password}
            onChange={(e) => handleChange("password", e.target.value)}
            onBlur={() => handleBlur("password")}
            onFocusChange={setIsInputFocused}
            error={touched.password ? errors.password : undefined}
            isValid={touched.password && !errors.password && formData.password.length > 0}
            disabled={isPending}
            placeholder="••••••••"
          />

          {/* Remember Me & Forgot Password Row */}
          <div className="flex items-center justify-between pt-1 pb-2">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs sm:text-sm text-muted hover:text-ink transition-colors">
              <input
                type="checkbox"
                checked={formData.remember_me}
                onChange={(e) => handleChange("remember_me", e.target.checked)}
                className="size-4 rounded border-line text-night focus:ring-night/20 accent-night"
              />
              <span>Remember me</span>
            </label>

            <Link
              href="/forgot-password"
              className="text-xs sm:text-sm font-medium font-display text-muted hover:text-ink underline-offset-4 hover:underline transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <AuthButton
            type="submit"
            isLoading={isPending}
            loadingText="Verifying credentials..."
            className="w-full mt-2"
          >
            Sign In
          </AuthButton>
        </form>
      </div>
    </AuthCardLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-paper">
          <div className="text-center font-display text-muted text-sm animate-pulse">
            Loading...
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
