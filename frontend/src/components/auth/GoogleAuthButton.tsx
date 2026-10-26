"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authApi } from "@/lib/auth-api";
import { useAuth } from "@/lib/auth-context";
import { notify } from "./ToastProvider";
import { formatApiErrorMessage } from "@/lib/axios-client";

interface GoogleAuthButtonProps {
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (momentListener?: (notification: {
            isNotDisplayed: () => boolean;
            isSkippedMoment: () => boolean;
            getNotDisplayedReason: () => string;
          }) => void) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>
          ) => void;
        };
      };
    };
  }
}

export function GoogleAuthButton({
  className = "",
}: GoogleAuthButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams?.get("next");
  const targetUrl =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.includes("\\")
      ? rawNext
      : "/dashboard";

  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Handle Google Token Response
  const handleGoogleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      setIsSubmitting(true);
      try {
        const res = await authApi.googleLogin(response.credential);
        login(res.access, res.user);
        notify.success(
          `Signed in with Google as ${res.user.first_name || res.user.email}!`,
          "Google Authentication"
        );
        setTimeout(() => {
          router.push(targetUrl);
        }, 700);
      } catch (err: unknown) {
        const errorObj = err as {
          response?: { status?: number; data?: { code?: string; detail?: string } };
          status?: number;
          code?: string;
          message?: string;
        };
        const status = errorObj.status || errorObj.response?.status;
        const code = errorObj.code || errorObj.response?.data?.code;

        if (status === 409 || code === "account_conflict") {
          notify.error(
            "This email is linked to a different Google account. Sign in with your original method.",
            "Account Conflict"
          );
        } else if (status === 401 || code === "google_email_unverified") {
          notify.error(
            "Your Google account email is not verified. Please verify your email with Google and try again.",
            "Email Not Verified"
          );
        } else {
          notify.error(
            formatApiErrorMessage(err) || "Google authentication failed. Please try again.",
            "Google Sign-In Error"
          );
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [login, router, targetUrl]
  );

  // Initialize and visibly render the official Google Identity Services button
  useEffect(() => {
    if (!googleClientId) return;

    function renderOfficialButton() {
      if (!window.google || !googleClientId || !containerRef.current) return;

      const containerWidth = containerRef.current.offsetWidth
        ? Math.min(400, Math.max(200, containerRef.current.offsetWidth))
        : 320;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
        cancel_on_tap_outside: true,
      });

      // Clear previous renders if any
      containerRef.current.innerHTML = "";

      window.google.accounts.id.renderButton(containerRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: containerWidth,
      });
    }

    const scriptId = "google-jssdk";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        renderOfficialButton();
      };
      document.body.appendChild(script);
    } else if (window.google) {
      renderOfficialButton();
    }
  }, [googleClientId, handleGoogleCredentialResponse]);

  // If NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing, render nothing (no broken button)
  if (!googleClientId) {
    return null;
  }

  return (
    <div className={`w-full flex flex-col items-center justify-center ${className}`}>
      {isSubmitting && (
        <div className="flex items-center gap-2 mb-2 text-xs font-display text-muted">
          <Loader2 className="size-3.5 animate-spin text-ink" />
          <span>Authenticating with Google...</span>
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full flex justify-center min-h-[44px]"
      />
    </div>
  );
}
