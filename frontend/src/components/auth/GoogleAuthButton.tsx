"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authApi, AuthApiError } from "@/lib/auth-api";
import { useAuth } from "@/lib/auth-context";
import { notify } from "./ToastProvider";

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
  label = "Continue with Google",
  onClick,
  disabled,
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
  const [isLoading, setIsLoading] = useState(false);
  const hiddenButtonRef = useRef<HTMLDivElement>(null);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Handle Google Token Response
  const handleGoogleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      setIsLoading(true);
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
        if (err instanceof AuthApiError) {
          notify.error(
            err.message || "Google authentication failed. Please try again.",
            "Google Sign-In Error"
          );
        } else {
          notify.error(
            "Could not complete Google authentication.",
            "Connection Error"
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [login, router, targetUrl]
  );

  // Initialize Google Identity Services Script
  useEffect(() => {
    if (!googleClientId) return;

    const scriptId = "google-jssdk";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initializeGoogle();
      };
      document.body.appendChild(script);
    } else if (window.google) {
      initializeGoogle();
    }

    function initializeGoogle() {
      if (!window.google || !googleClientId) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
        cancel_on_tap_outside: true,
      });

      // Render hidden official button if needed for triggering standard popup
      if (hiddenButtonRef.current) {
        try {
          window.google.accounts.id.renderButton(hiddenButtonRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
          });
        } catch (e) {
          console.debug("Google renderButton:", e);
        }
      }
    }
  }, [googleClientId, handleGoogleCredentialResponse]);

  const handleClick = async () => {
    if (disabled || isLoading) return;

    if (onClick) {
      onClick();
    }

    if (!googleClientId) {
      notify.info(
        "Google Client ID is not configured yet. Provide NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment.",
        "Google Sign-In Setup"
      );
      return;
    }

    if (window.google) {
      // Prompt One Tap or click hidden standard button
      const googleBtn = hiddenButtonRef.current?.querySelector(
        '[role="button"]'
      ) as HTMLElement | null;

      if (googleBtn) {
        googleBtn.click();
      } else {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.debug("Google One Tap prompt skipped:", notification.getNotDisplayedReason());
          }
        });
      }
    }
  };

  return (
    <>
      {/* Hidden container for Google's native iframe button if clicked */}
      <div ref={hiddenButtonRef} className="hidden" aria-hidden="true" />

      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={`relative flex items-center justify-center gap-3 w-full h-[52px] px-6 rounded-full bg-white border border-line text-ink font-display font-medium text-[0.95rem] tracking-tight shadow-soft hover:bg-canvas/50 hover:border-line-strong hover:shadow-lift transition-all duration-300 ease-out active:scale-[0.985] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-night/20 ${className}`}
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin text-muted shrink-0" />
        ) : (
          /* Authentic Google 'G' Mark */
          <svg
            viewBox="0 0 24 24"
            className="size-5 shrink-0"
            aria-hidden="true"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
        )}
        <span>{label}</span>
      </button>
    </>
  );
}
