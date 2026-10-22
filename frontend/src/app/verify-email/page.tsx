"use client";

import React, { useState, useEffect, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthCardLayout } from "@/components/auth/AuthCardLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { MascotEmotion } from "@/components/auth/SoraMascot";
import { notify } from "@/components/auth/ToastProvider";
import { resendVerificationSchema } from "@/lib/auth-schemas";
import { authApi } from "@/lib/auth-api";
import { ShieldCheck, MailCheck, AlertTriangle } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");

  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Resend form state
  const [isResending, startResendTransition] = useTransition();
  const [resendEmail, setResendEmail] = useState(emailParam || "");
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | undefined>();
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Auto-verify if token is provided in URL
  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    (async () => {
      setIsVerifying(true);
      try {
        const res = await authApi.verifyEmail(token);
        if (isMounted) {
          setVerifyStatus("success");
          notify.success(
            res.detail || "Your email has been verified! You can now log in.",
            "Verification Complete"
          );
        }
      } catch (err: unknown) {
        if (isMounted) {
          setVerifyStatus("error");
          const code = (err as { code?: string })?.code;
          const msg =
            code === "token_expired"
              ? "Your verification link has expired (links are valid for 24 hours). Please request a new one."
              : "Invalid or corrupted verification link. Please request a new verification email.";
          setErrorMessage(msg);
          notify.error(msg, "Verification Failed");
        }
      } finally {
        if (isMounted) setIsVerifying(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Handle Resend Verification Email
  const handleResend = (e: React.FormEvent) => {
    e.preventDefault();

    const result = resendVerificationSchema.safeParse({ email: resendEmail });
    if (!result.success) {
      setResendError(result.error.issues[0]?.message);
      notify.error("Please enter a valid email address.", "Invalid Email");
      return;
    }

    setResendError(undefined);

    startResendTransition(async () => {
      try {
        await authApi.resendVerification(resendEmail);
        setResendSuccess(true);
        notify.success(
          "If the account exists and is unverified, a fresh link has been dispatched.",
          "Verification Link Sent"
        );
      } catch (err: unknown) {
        const msg =
          (err as { message?: string })?.message ||
          "Failed to resend email. Please try again.";
        notify.error(msg, "Request Failed");
      }
    });
  };

  // Determine Mascot Emotion
  let mascotEmotion: MascotEmotion = "neutral";
  let mascotMessage: string | undefined = undefined;

  if (isVerifying || isResending) {
    mascotEmotion = "thinking";
    mascotMessage = isVerifying
      ? "Checking your verification signature..."
      : "Dispatching fresh link to your inbox...";
  } else if (verifyStatus === "success" || resendSuccess) {
    mascotEmotion = "happy";
    mascotMessage =
      verifyStatus === "success"
        ? "Awesome! Your email is verified."
        : "Link is on its way to your inbox!";
  } else if (verifyStatus === "error" || !!resendError) {
    mascotEmotion = "angry";
    mascotMessage = "Uh oh! That link didn't work. Let's send a new one.";
  } else if (isInputFocused) {
    mascotEmotion = "focused";
    mascotMessage = "Type your registered email address.";
  }

  // 1. Success State (Token was valid)
  if (verifyStatus === "success") {
    return (
      <AuthCardLayout
        title="Email verified!"
        subtitle="Your SORA study account is now active and ready."
        mascotEmotion="happy"
        mascotMessage="Woohoo! You're ready to start studying."
      >
        <div className="space-y-6 text-center py-4">
          <div className="mx-auto size-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-soft animate-in zoom-in duration-300">
            <ShieldCheck className="size-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-display font-semibold text-ink">
              Welcome to SORA
            </h2>
            <p className="text-sm text-muted font-body max-w-md mx-auto">
              Your email address has been verified. You now have full access to summaries, smart flashcards, and exam quizzes.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              className="w-full flex items-center justify-center h-[52px] px-6 rounded-full bg-night text-white font-display font-medium text-sm shadow-button hover:bg-night-3 transition-colors"
            >
              Log in to your account
            </Link>
          </div>
        </div>
      </AuthCardLayout>
    );
  }

  // 2. Token In Progress State
  if (isVerifying) {
    return (
      <AuthCardLayout
        title="Verifying your email..."
        subtitle="Please wait while we validate your security token."
        mascotEmotion="thinking"
        mascotMessage="Validating cryptographic token..."
      >
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="size-10 rounded-full border-2 border-night border-t-transparent animate-spin" />
          <p className="text-sm text-muted font-display">
            Contacting SORA authentication server...
          </p>
        </div>
      </AuthCardLayout>
    );
  }

  // 3. Resend Confirmation State
  if (resendSuccess) {
    return (
      <AuthCardLayout
        title="Check your inbox"
        subtitle={`We've dispatched a fresh verification link to ${resendEmail}`}
        mascotEmotion="happy"
        mascotMessage="Check your email for the new link!"
        footerLink={{
          prompt: "Need to try another email?",
          label: "Enter different email",
          href: "/verify-email",
        }}
      >
        <div className="space-y-6 text-center py-4">
          <div className="mx-auto size-16 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-soft">
            <MailCheck className="size-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-display font-semibold text-ink">
              Verification Link Dispatched
            </h2>
            <p className="text-sm text-muted font-body max-w-md mx-auto">
              Please click the link in your email to activate your account. Links expire after 24 hours.
            </p>
          </div>

          <div className="pt-2">
            <Link
              href="/login"
              className="w-full flex items-center justify-center h-[50px] px-6 rounded-full bg-night text-white font-display font-medium text-sm shadow-button hover:bg-night-3 transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </AuthCardLayout>
    );
  }

  // 4. Default / Failed / Resend Form
  return (
    <AuthCardLayout
      title="Verify your email"
      subtitle={
        verifyStatus === "error"
          ? "The verification link is invalid or expired. Request a new one below."
          : "Enter your email to receive a new verification link."
      }
      mascotEmotion={mascotEmotion}
      mascotMessage={mascotMessage}
      footerLink={{
        prompt: "Already have a verified account?",
        label: "Sign in",
        href: "/login",
      }}
      secondaryLink={{
        label: "Support",
        href: "mailto:support@sora.study",
      }}
    >
      {verifyStatus === "error" && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5">
          <AlertTriangle className="size-4 shrink-0 text-red-600 mt-0.5" />
          <div>
            <span className="font-semibold block font-display">
              Verification failed
            </span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleResend} noValidate className="space-y-4">
        <AuthInput
          id="resend-email"
          type="email"
          label="Account email address"
          autoComplete="email"
          value={resendEmail}
          onChange={(e) => {
            setResendEmail(e.target.value);
            if (resendError) setResendError(undefined);
          }}
          onFocusChange={setIsInputFocused}
          error={resendError}
          isValid={!resendError && resendEmail.includes("@")}
          disabled={isResending}
          placeholder="student@university.edu"
        />

        <AuthButton
          type="submit"
          isLoading={isResending}
          loadingText="Dispatching email link..."
          className="w-full mt-2"
        >
          Resend Verification Link
        </AuthButton>
      </form>
    </AuthCardLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-paper">
          <div className="text-center font-display text-muted text-sm animate-pulse">
            Loading verification details...
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
