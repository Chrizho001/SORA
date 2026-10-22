"use client";

import React, { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthCardLayout } from "@/components/auth/AuthCardLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { MascotEmotion } from "@/components/auth/SoraMascot";
import { notify } from "@/components/auth/ToastProvider";
import {
  resetPasswordConfirmSchema,
  ResetPasswordConfirmFormData,
} from "@/lib/auth-schemas";
import { authApi, AuthApiError } from "@/lib/auth-api";
import { Check, CheckCircle2, KeyRound } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isSuccess, setIsSuccess] = useState(false);

  // Read uid and token from URL query params
  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";

  // Form State
  const [formData, setFormData] = useState({
    new_password: "",
    new_password_confirm: "",
  });

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<string, boolean>>>({});
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [lastSubmissionFailed, setLastSubmissionFailed] = useState(false);

  const validateField = (field: "new_password" | "new_password_confirm", value: string) => {
    const updated = {
      uid: uid || "placeholder",
      token: token || "placeholder",
      ...formData,
      [field]: value,
    };
    const result = resetPasswordConfirmSchema.safeParse(updated);

    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === field);
      setErrors((prev) => ({ ...prev, [field]: issue ? issue.message : undefined }));
    } else {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleChange = (field: "new_password" | "new_password_confirm", value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setLastSubmissionFailed(false);
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleBlur = (field: "new_password" | "new_password_confirm") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
    setIsInputFocused(false);
  };

  // SORA Mascot Emotion
  const hasErrors = Object.values(errors).some(Boolean) || lastSubmissionFailed;
  const isFormValid =
    formData.new_password.length >= 8 &&
    formData.new_password === formData.new_password_confirm &&
    !hasErrors;

  let mascotEmotion: MascotEmotion = "neutral";
  let mascotMessage: string | undefined = undefined;

  if (isSuccess) {
    mascotEmotion = "happy";
    mascotMessage = "Password successfully reset! You're ready to log in.";
  } else if (isPending) {
    mascotEmotion = "thinking";
    mascotMessage = "Securing your new credentials...";
  } else if (hasErrors) {
    mascotEmotion = "angry";
    mascotMessage = "Double check your passwords!";
  } else if (isFormValid) {
    mascotEmotion = "happy";
    mascotMessage = "Strong match! Ready to update.";
  } else if (isInputFocused) {
    mascotEmotion = "focused";
    mascotMessage = "Choose something memorable and strong!";
  }

  // Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ new_password: true, new_password_confirm: true });

    if (!uid || !token) {
      notify.error(
        "Missing password reset token in the link. Please request a new reset email.",
        "Invalid Reset Link"
      );
      setLastSubmissionFailed(true);
      return;
    }

    const payload: ResetPasswordConfirmFormData = {
      uid,
      token,
      new_password: formData.new_password,
      new_password_confirm: formData.new_password_confirm,
    };

    const validationResult = resetPasswordConfirmSchema.safeParse(payload);
    if (!validationResult.success) {
      const newErrors: Partial<Record<string, string>> = {};
      for (const issue of validationResult.error.issues) {
        newErrors[issue.path[0] as string] = issue.message;
      }
      setErrors(newErrors);
      setLastSubmissionFailed(true);
      notify.error(
        "Please fix the validation errors before submitting.",
        "Form Error"
      );
      return;
    }

    setErrors({});
    setLastSubmissionFailed(false);

    startTransition(async () => {
      try {
        await authApi.confirmPasswordReset(payload);
        setIsSuccess(true);
        notify.success(
          "Your password has been changed securely. You can now log in.",
          "Password Reset Success"
        );
      } catch (err: unknown) {
        setLastSubmissionFailed(true);
        if (err instanceof AuthApiError) {
          if (err.code === "invalid_token" || err.status === 400) {
            notify.error(
              "This reset link is either invalid, has expired, or has already been used. Please request a new one.",
              "Reset Link Expired"
            );
          } else {
            notify.error(
              err.message || "Failed to reset password. Please check your inputs.",
              "Reset Error"
            );
          }
        } else {
          notify.error(
            "Could not communicate with the server. Please check your connection.",
            "Network Error"
          );
        }
      }
    });
  };

  // Success Confirmation Screen
  if (isSuccess) {
    return (
      <AuthCardLayout
        title="Password updated"
        subtitle="Your account has been secured with your new password."
        mascotEmotion="happy"
        mascotMessage="All set! Time to jump back into your study sessions."
      >
        <div className="space-y-6 text-center py-4">
          <div className="mx-auto size-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-soft">
            <CheckCircle2 className="size-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-display font-semibold text-ink">
              Password Changed Successfully
            </h2>
            <p className="text-sm text-muted font-body max-w-md mx-auto">
              Your new password is now active. All previous sessions have been securely closed.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              className="w-full flex items-center justify-center h-[52px] px-6 rounded-full bg-night text-white font-display font-medium text-sm shadow-button hover:bg-night-3 transition-colors"
            >
              Sign In with New Password
            </Link>
          </div>
        </div>
      </AuthCardLayout>
    );
  }

  // Missing Link Warning
  const isMissingParams = !uid || !token;

  return (
    <AuthCardLayout
      title="Create new password"
      subtitle="Ensure your new password is at least 8 characters long."
      mascotEmotion={mascotEmotion}
      mascotMessage={mascotMessage}
      footerLink={{
        prompt: "Remember your previous password?",
        label: "Return to login",
        href: "/login",
      }}
      secondaryLink={{
        label: "Request fresh link",
        href: "/forgot-password",
      }}
    >
      {isMissingParams && (
        <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <KeyRound className="size-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-semibold block font-display">
              No reset token detected
            </span>
            <span>
              If you did not arrive here via the reset email link, please{" "}
              <Link
                href="/forgot-password"
                className="underline font-medium hover:text-amber-950"
              >
                request a new link
              </Link>
              .
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* New Password Input */}
        <AuthInput
          id="new-password"
          type="password"
          label="New password (min. 8 characters)"
          autoComplete="new-password"
          value={formData.new_password}
          onChange={(e) => handleChange("new_password", e.target.value)}
          onBlur={() => handleBlur("new_password")}
          onFocusChange={setIsInputFocused}
          error={touched.new_password ? errors.new_password : undefined}
          isValid={
            touched.new_password &&
            !errors.new_password &&
            formData.new_password.length >= 8
          }
          disabled={isPending}
          placeholder="••••••••"
        />

        {/* Confirm New Password Input */}
        <AuthInput
          id="new-password-confirm"
          type="password"
          label="Confirm new password"
          autoComplete="new-password"
          value={formData.new_password_confirm}
          onChange={(e) => handleChange("new_password_confirm", e.target.value)}
          onBlur={() => handleBlur("new_password_confirm")}
          onFocusChange={setIsInputFocused}
          error={
            touched.new_password_confirm
              ? errors.new_password_confirm
              : undefined
          }
          isValid={
            touched.new_password_confirm &&
            !errors.new_password_confirm &&
            formData.new_password_confirm.length > 0 &&
            formData.new_password === formData.new_password_confirm
          }
          disabled={isPending}
          placeholder="••••••••"
        />

        {/* Checklist */}
        <div className="pt-1 pb-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span
              className={`inline-flex items-center gap-1 transition-colors ${
                formData.new_password.length >= 8
                  ? "text-emerald-700 font-medium"
                  : "text-subtle"
              }`}
            >
              <Check
                className={`size-3.5 ${
                  formData.new_password.length >= 8
                    ? "opacity-100"
                    : "opacity-40"
                }`}
              />
              At least 8 characters
            </span>
            <span
              className={`inline-flex items-center gap-1 transition-colors ${
                formData.new_password.length > 0 &&
                !/^\d+$/.test(formData.new_password)
                  ? "text-emerald-700 font-medium"
                  : "text-subtle"
              }`}
            >
              <Check
                className={`size-3.5 ${
                  formData.new_password.length > 0 &&
                  !/^\d+$/.test(formData.new_password)
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
          loadingText="Updating password..."
          className="w-full mt-2"
        >
          Reset Password
        </AuthButton>
      </form>
    </AuthCardLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-paper">
          <div className="text-center font-display text-muted text-sm animate-pulse">
            Loading reset parameters...
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
