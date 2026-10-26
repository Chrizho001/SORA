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
import { registerSchema, RegisterFormData } from "@/lib/auth-schemas";
import { authApi, AuthApiError } from "@/lib/auth-api";
import { useAuth } from "@/lib/auth-context";
import { Check, ShieldCheck } from "lucide-react";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams?.get("next");
  const { user, isLoading } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  // Redirect logged-in users away to /dashboard
  useEffect(() => {
    if (!isLoading && user) {
      const targetUrl =
        rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("\\")
          ? rawNext
          : "/dashboard";
      router.replace(targetUrl);
    }
  }, [user, isLoading, router, rawNext]);

  // Form State
  const [formData, setFormData] = useState<RegisterFormData>({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    password_confirm: "",
  });

  // Validation State
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof RegisterFormData, boolean>>>({});
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [lastSubmissionFailed, setLastSubmissionFailed] = useState(false);

  // Real-time Field Validation
  const validateField = (field: keyof RegisterFormData, value: string) => {
    const updatedData = { ...formData, [field]: value };
    const result = registerSchema.safeParse(updatedData);

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

  const handleChange = (field: keyof RegisterFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setLastSubmissionFailed(false);
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleBlur = (field: keyof RegisterFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
    setIsInputFocused(false);
  };

  // Determine SORA Mascot Emotion
  const hasErrors = Object.values(errors).some(Boolean) || lastSubmissionFailed;
  const isFormValid =
    formData.first_name.trim().length > 0 &&
    formData.last_name.trim().length > 0 &&
    formData.email.trim().length > 0 &&
    formData.password.length >= 8 &&
    formData.password === formData.password_confirm &&
    !hasErrors;

  let mascotEmotion: MascotEmotion = "neutral";
  let mascotMessage: string | undefined = undefined;

  if (registrationSuccess) {
    mascotEmotion = "happy";
    mascotMessage = "Woohoo! Welcome to the SORA family!";
  } else if (isPending) {
    mascotEmotion = "thinking";
    mascotMessage = "Setting up your student workspace...";
  } else if (hasErrors) {
    mascotEmotion = "angry";
    mascotMessage = "Hold on! Check the form errors below.";
  } else if (isFormValid) {
    mascotEmotion = "happy";
    mascotMessage = "Everything looks stellar! Ready to sign up.";
  } else if (isInputFocused) {
    mascotEmotion = "focused";
    mascotMessage = "Type it in, I'm watching your back!";
  }

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      first_name: true,
      last_name: true,
      email: true,
      password: true,
      password_confirm: true,
    });

    const validationResult = registerSchema.safeParse(formData);
    if (!validationResult.success) {
      const newErrors: Partial<Record<keyof RegisterFormData, string>> = {};
      for (const issue of validationResult.error.issues) {
        const key = issue.path[0] as keyof RegisterFormData;
        if (!newErrors[key]) {
          newErrors[key] = issue.message;
        }
      }
      setErrors(newErrors);
      setLastSubmissionFailed(true);
      notify.error(
        "Please fix the form errors before continuing.",
        "Validation Error"
      );
      return;
    }

    setErrors({});
    setLastSubmissionFailed(false);

    startTransition(async () => {
      try {
        await authApi.register({
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          password: formData.password,
          password_confirm: formData.password_confirm,
        });

        setRegistrationSuccess(true);
        setRegisteredEmail(formData.email);

        notify.success(
          `Verification link sent to ${formData.email}. Please verify your email before logging in.`,
          "Account Created!"
        );
      } catch (err: unknown) {
        setLastSubmissionFailed(true);
        if (err instanceof AuthApiError) {
          if (err.errors) {
            // Map backend serializer errors to form inputs
            const backendErrors: Partial<Record<keyof RegisterFormData, string>> = {};
            for (const [key, messages] of Object.entries(err.errors)) {
              if (messages && messages.length > 0) {
                backendErrors[key as keyof RegisterFormData] = messages[0];
              }
            }
            setErrors((prev) => ({ ...prev, ...backendErrors }));
          }

          if (err.errors?.email) {
            notify.error(
              "An account with this email address already exists. Try signing in instead.",
              "Email Already Registered"
            );
          } else if (err.status === 429) {
            notify.error(
              "Too many registration attempts. Please wait a few moments and try again.",
              "Rate Limit Reached"
            );
          } else {
            notify.error(
              err.message || "Failed to create account. Please review your inputs.",
              "Registration Failed"
            );
          }
        } else {
          notify.error(
            "Unable to reach the server. Please check your internet connection.",
            "Network Error"
          );
        }
      }
    });
  };

  const handleGoogleSignIn = () => {
    notify.info(
      "Connecting to Google Identity Services...",
      "Google Sign-Up"
    );
  };

  // If successfully registered, show verification instructions
  if (registrationSuccess) {
    return (
      <AuthCardLayout
        title="Check your inbox"
        subtitle={`We've sent a verification link to ${registeredEmail}`}
        mascotEmotion="happy"
        mascotMessage="Check your email to activate your account!"
        footerLink={{
          prompt: "Already verified?",
          label: "Log in here",
          href: rawNext ? `/login?next=${encodeURIComponent(rawNext)}` : "/login",
        }}
      >
        <div className="space-y-6 text-center py-4">
          <div className="mx-auto size-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-soft">
            <ShieldCheck className="size-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-display font-semibold text-ink">
              Verify your email address
            </h2>
            <p className="text-sm text-muted font-body max-w-md mx-auto">
              Please click the link in the email we just sent to{" "}
              <strong className="text-ink">{registeredEmail}</strong>. Email verification helps keep your study materials and notes safe.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Link
              href={rawNext ? `/login?next=${encodeURIComponent(rawNext)}` : "/login"}
              className="w-full flex items-center justify-center h-[50px] px-6 rounded-full bg-night text-white font-display font-medium text-sm shadow-button hover:bg-night-3 transition-colors"
            >
              Continue to Login
            </Link>
            <Link
              href={`/verify-email?email=${encodeURIComponent(registeredEmail)}`}
              className="w-full flex items-center justify-center h-[50px] px-6 rounded-full bg-canvas text-ink font-display font-medium text-sm hover:bg-mist transition-colors"
            >
              Resend Link
            </Link>
          </div>
        </div>
      </AuthCardLayout>
    );
  }

  return (
    <AuthCardLayout
      title="Create your account"
      subtitle="Start turning lecture PDFs into flashcards and quizzes."
      mascotEmotion={mascotEmotion}
      mascotMessage={mascotMessage}
      footerLink={{
        prompt: "Already have an account?",
        label: "Sign in",
        href: rawNext ? `/login?next=${encodeURIComponent(rawNext)}` : "/login",
      }}
      secondaryLink={{
        label: "Privacy Policy",
        href: "/privacy",
      }}
    >
      <div className="space-y-4">
        {/* Google Authentication Button */}
        <GoogleAuthButton
          label="Sign up with Google"
          onClick={handleGoogleSignIn}
        />

        {/* Divider */}
        <div className="relative flex items-center justify-center my-5">
          <div className="w-full border-t border-line" />
          <span className="absolute bg-surface px-3 text-xs font-medium text-subtle uppercase tracking-wider">
            or register with email
          </span>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
          {/* Name Row: First & Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <AuthInput
              id="signup-first-name"
              label="First name"
              autoComplete="given-name"
              value={formData.first_name}
              onChange={(e) => handleChange("first_name", e.target.value)}
              onBlur={() => handleBlur("first_name")}
              onFocusChange={setIsInputFocused}
              error={touched.first_name ? errors.first_name : undefined}
              isValid={touched.first_name && !errors.first_name && formData.first_name.length > 0}
              disabled={isPending}
              placeholder="Ada"
            />

            <AuthInput
              id="signup-last-name"
              label="Last name"
              autoComplete="family-name"
              value={formData.last_name}
              onChange={(e) => handleChange("last_name", e.target.value)}
              onBlur={() => handleBlur("last_name")}
              onFocusChange={setIsInputFocused}
              error={touched.last_name ? errors.last_name : undefined}
              isValid={touched.last_name && !errors.last_name && formData.last_name.length > 0}
              disabled={isPending}
              placeholder="Lovelace"
            />
          </div>

          {/* Email Input */}
          <AuthInput
            id="signup-email"
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
            placeholder="ada@university.edu"
          />

          {/* Password Input */}
          <AuthInput
            id="signup-password"
            type="password"
            label="Password (min. 8 characters)"
            autoComplete="new-password"
            value={formData.password}
            onChange={(e) => handleChange("password", e.target.value)}
            onBlur={() => handleBlur("password")}
            onFocusChange={setIsInputFocused}
            error={touched.password ? errors.password : undefined}
            isValid={touched.password && !errors.password && formData.password.length >= 8}
            disabled={isPending}
            placeholder="••••••••"
          />

          {/* Confirm Password Input */}
          <AuthInput
            id="signup-password-confirm"
            type="password"
            label="Confirm password"
            autoComplete="new-password"
            value={formData.password_confirm}
            onChange={(e) => handleChange("password_confirm", e.target.value)}
            onBlur={() => handleBlur("password_confirm")}
            onFocusChange={setIsInputFocused}
            error={touched.password_confirm ? errors.password_confirm : undefined}
            isValid={
              touched.password_confirm &&
              !errors.password_confirm &&
              formData.password_confirm.length > 0 &&
              formData.password === formData.password_confirm
            }
            disabled={isPending}
            placeholder="••••••••"
          />

          {/* Password Requirements Checklist */}
          <div className="pt-1 pb-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span
                className={`inline-flex items-center gap-1 transition-colors ${
                  formData.password.length >= 8
                    ? "text-emerald-700 font-medium"
                    : "text-subtle"
                }`}
              >
                <Check
                  className={`size-3.5 ${
                    formData.password.length >= 8 ? "opacity-100" : "opacity-40"
                  }`}
                />
                At least 8 characters
              </span>
              <span
                className={`inline-flex items-center gap-1 transition-colors ${
                  formData.password.length > 0 && !/^\d+$/.test(formData.password)
                    ? "text-emerald-700 font-medium"
                    : "text-subtle"
                }`}
              >
                <Check
                  className={`size-3.5 ${
                    formData.password.length > 0 && !/^\d+$/.test(formData.password)
                      ? "opacity-100"
                      : "opacity-40"
                  }`}
                />
                Not only numbers
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <AuthButton
            type="submit"
            isLoading={isPending}
            loadingText="Creating your account..."
            className="w-full mt-2"
          >
            Create Account
          </AuthButton>
        </form>
      </div>
    </AuthCardLayout>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-paper" />}>
      <SignupForm />
    </Suspense>
  );
}
