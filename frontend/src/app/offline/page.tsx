"use client";

import React from "react";
import Link from "next/link";
import { WifiOff, RefreshCw, ArrowLeft } from "lucide-react";
import { SoraMascot } from "@/components/auth/SoraMascot";
import { Logo } from "@/components/brand/Logo";

export default function OfflinePage() {
  const handleRetry = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-paper relative overflow-hidden text-ink">
      {/* Background Ambience */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-gradient-to-br from-amber-200/20 to-orange-300/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 size-96 rounded-full bg-gradient-to-tl from-slate-300/25 to-blue-200/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="w-full max-w-md bg-surface rounded-3xl border border-line shadow-lift p-8 sm:p-10 flex flex-col items-center text-center space-y-6 relative z-10">
        <div className="flex items-center justify-between w-full pb-4 border-b border-line">
          <Link href="/" aria-label="SORA Home">
            <Logo tone="ink" />
          </Link>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-[0.6875rem] font-display font-bold text-rose-700">
            <WifiOff className="size-3" />
            <span>Offline</span>
          </span>
        </div>

        <div className="py-2">
          <SoraMascot
            size="md"
            emotion="thinking"
            message="No internet connection detected."
            showSpeechBubble={true}
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-display font-bold text-ink tracking-tight">
            You&apos;re offline
          </h1>
          <p className="text-sm text-muted font-body leading-relaxed max-w-xs mx-auto">
            SORA needs an active connection to sync study materials, process AI lecture summaries, and update flashcards.
          </p>
        </div>

        <div className="w-full pt-2 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleRetry}
            className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#14161f] hover:bg-night text-[#c8f560] font-display text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <RefreshCw className="size-3.5" />
            <span>Retry Connection</span>
          </button>

          <Link
            href="/dashboard"
            className="w-full h-10 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-canvas hover:bg-mist text-ink font-display text-xs font-medium transition-colors border border-line"
          >
            <ArrowLeft className="size-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
