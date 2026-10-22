"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { AuthCardLayout } from "@/components/auth/AuthCardLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { MascotEmotion } from "@/components/auth/SoraMascot";
import { notify } from "@/components/auth/ToastProvider";
import { forgotPasswordSchema, ForgotPasswordFormData } from "@/lib/auth-schemas";
import { authApi, AuthApiError } from "@/lib/auth-api";
import { MailCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: "",
  });

  const [errors, setErrors] = useState<{ email?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean }>({});
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [lastSubmissionFailed, setLastSubmissionFailed] = useState(false);

  // Validate Email
  const validateEmail = (value: string) => {
    const result = forgotPasswordSchema.safeParse({ email: value });
    if (!result.success) {
      const issue = result.error.issues[0];
      setErrors({ email: issue ? issue.message : undefined });
    } else {
      setErrors({});
    }
  };

  const handleChange = (value: string) => {
    setFormData({ email: value });
    setLastSubmissionFailed(false);
    if (touched.email) {
      validateEmail(value);
    }
  };

  const handleBlur = () => {
    setTouched({ email: true });
    validateEmail(formData.email);
    setIsInputFocused(false);
  };

  // SORA Mascot Emotion
  const hasErrors = !!errors.email || lastSubmissionFailed;
  const isFormValid = formData.email.trim().length > 0 && !hasErrors;

  let mascotEmotion: MascotEmotion = "neutral";
  let mascotMessage: string | undefined = undefined;

  if (submittedEmail) {
    mascotEmotion = "happy";
    mascotMessage = "Reset link on its way to your inbox!";
  } else if (isPending) {
    mascotEmotion = "thinking";
    mascotMessage = "Preparing secure reset instructions...";
  } else if (hasErrors) {
    mascotEmotion = "angry";
    mascotMessage = "Please enter a valid email address.";
  } else if (isFormValid) {
    mascotEmotion = "happy";
    mascotMessage = "Looks good! Ready to send the link.";
  } else if (isInputFocused) {
    mascotEmotion = "focused";
    mascotMessage = "What email is linked to your account?";
  }

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true });

    const result = forgotPasswordSchema.safeParse(formData);
    if (!result.success) {
      setErrors({ email: result.error.issues[0]?.message });
      setLastSubmissionFailed(true);
      notify.error(
        "Please provide a valid email address.",
        "Invalid Email"
      );
      return;
    }

    setErrors({});
    setLastSubmissionFailed(false);

    startTransition(async () => {
      try {
        await authApi.requestPasswordReset(formData.email);
        setSubmittedEmail(formData.email);
        notify.success(
          "If an account exists with this email, a reset link has been dispatched.",
          "Instructions Sent"
        );
      } catch (err: unknown) {
        setLastSubmissionFailed(true);
        if (err instanceof AuthApiError) {
          notify.error(
            err.message || "Failed to submit reset request. Please try again.",
            "Request Failed"
          );
        } else {
          notify.error(
            "Could not connect to the server. Please check your internet connection.",
            "Network Error"
          );
        }
      }
    });
  };

  // If email was submitted, show confirmation view
  if (submittedEmail) {
    return (
      <AuthCardLayout
        title="Check your email"
        subtitle={`Password reset instructions have been dispatched to ${submittedEmail}`}
        mascotEmotion="happy"
        mascotMessage="Check your inbox for the reset link!"
        footerLink={{
          prompt: "Remembered your password?",
          label: "Back to Login",
          href: "/login",
        }}
      >
        <div className="space-y-6 text-center py-4">
          <div className="mx-auto size-16 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-soft">
            <MailCheck className="size-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-display font-semibold text-ink">
              Password Reset Dispatched
            </h2>
            <p className="text-sm text-muted font-body max-w-md mx-auto">
              We have sent a secure password reset link to{" "}
              <strong className="text-ink">{submittedEmail}</strong>. The link is valid for 1 hour.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Link
              href="/login"
              className="w-full flex items-center justify-center h-[50px] px-6 rounded-full bg-night text-white font-display font-medium text-sm shadow-button hover:bg-night-3 transition-colors"
            >
              Return to Login
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmittedEmail(null);
                setFormData({ email: "" });
              }}
              className="w-full flex items-center justify-center h-[50px] px-6 rounded-full bg-canvas text-ink font-display font-medium text-sm hover:bg-mist transition-colors"
            >
              Send to Another Email
            </button>
          </div>
        </div>
      </AuthCardLayout>
    );
  }

  return (
    <AuthCardLayout
      title="Forgot password?"
      subtitle="Enter your email and we'll send you instructions to reset your password."
      mascotEmotion={mascotEmotion}
      mascotMessage={mascotMessage}
      footerLink={{
        prompt: "Remembered your password?",
        label: "Back to login",
        href: "/login",
      }}
      secondaryLink={{
        label: "Need assistance?",
        href: "mailto:support@sora.study",
      }}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <AuthInput
          id="forgot-email"
          type="email"
          label="Account email address"
          autoComplete="email"
          value={formData.email}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          onFocusChange={setIsInputFocused}
          error={touched.email ? errors.email : undefined}
          isValid={touched.email && !errors.email && formData.email.length > 0}
          disabled={isPending}
          placeholder="ada@university.edu"
        />

        <AuthButton
          type="submit"
          isLoading={isPending}
          loadingText="Dispatching reset link..."
          className="w-full mt-2"
        >
          Send Reset Instructions
        </AuthButton>
      </form>
    </AuthCardLayout>
  );
}
