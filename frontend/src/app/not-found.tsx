import React from "react";
import Link from "next/link";
import { Home, BookOpen } from "lucide-react";
import { SoraMascot } from "@/components/auth/SoraMascot";

export default function NotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-paper p-6 text-ink selection:bg-[#c8f560] selection:text-night">
      <div className="w-full max-w-md rounded-3xl bg-surface border border-line p-8 shadow-soft text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-center -mb-2">
          <SoraMascot size="md" emotion="focused" showSpeechBubble={false} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-canvas border border-line text-muted text-xs font-display font-bold">
            <span>404 Error</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
            Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-muted font-body leading-relaxed max-w-sm mx-auto">
            The study resource, deck, or page you were looking for doesn&apos;t seem to exist or may have been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-night hover:bg-ink text-[#c8f560] text-xs font-display font-bold transition-all shadow-md active:scale-95"
          >
            <Home className="size-3.5" />
            <span>Go to Home</span>
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-surface border border-line text-ink hover:bg-mist text-xs font-display font-semibold transition-colors"
          >
            <BookOpen className="size-3.5 text-muted" />
            <span>Open Dashboard</span>
          </Link>
        </div>

        <div className="pt-2 border-t border-line">
          <p className="text-[0.6875rem] font-display text-subtle">
            SORA • Intelligent Academic Study Platform
          </p>
        </div>
      </div>
    </main>
  );
}
