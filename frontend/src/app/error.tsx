"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Home, LayoutDashboard } from "lucide-react";
import { SoraMascot } from "@/components/auth/SoraMascot";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected client exceptions
    console.error("Client Error Boundary caught error:", error);
  }, [error]);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-paper p-6 text-ink selection:bg-[#c8f560] selection:text-night">
      <div className="w-full max-w-md rounded-3xl bg-surface border border-line p-8 shadow-soft text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-center -mb-2">
          <SoraMascot size="md" emotion="thinking" showSpeechBubble={false} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-display font-bold">
            <AlertCircle className="size-3.5 text-rose-600" />
            <span>Application Error</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-ink tracking-tight">
            Something went wrong
          </h1>
          <p className="text-xs sm:text-sm text-muted font-body leading-relaxed max-w-sm mx-auto">
            An unexpected error occurred while loading this page. You can try refreshing the component or return to your study dashboard.
          </p>
          {error?.digest && (
            <p className="text-[0.6875rem] font-mono text-subtle bg-canvas/60 p-2 rounded-xl border border-line/60 break-all">
              Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-night hover:bg-ink text-[#c8f560] text-xs font-display font-bold transition-all shadow-md active:scale-95"
          >
            <RotateCcw className="size-3.5" />
            <span>Try again</span>
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-surface border border-line text-ink hover:bg-mist text-xs font-display font-semibold transition-colors"
          >
            <LayoutDashboard className="size-3.5 text-muted" />
            <span>Dashboard</span>
          </Link>
        </div>

        <div className="pt-2 border-t border-line">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[0.6875rem] font-display text-muted hover:text-ink transition-colors"
          >
            <Home className="size-3 text-subtle" />
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
