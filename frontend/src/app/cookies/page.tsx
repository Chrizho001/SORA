import React from "react";
import Link from "next/link";
import { ArrowLeft, Cookie, ShieldCheck, Check } from "lucide-react";

export const metadata = {
  title: "Cookie Policy | SORA Study",
  description: "Learn about the minimal, essential cookies used by SORA for secure authentication.",
};

export default function CookiesPage() {
  return (
    <main className="min-h-dvh bg-paper text-ink selection:bg-[#c8f560] selection:text-night py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Header Navigation */}
        <div className="flex items-center justify-between border-b border-line pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-display font-semibold text-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Home</span>
          </Link>
          <span className="text-xs font-display font-bold uppercase tracking-wider text-muted">
            Cookie Policy
          </span>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-canvas border border-line text-muted text-xs font-display font-bold">
            <Cookie className="size-3.5" />
            <span>Session Cookies</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink tracking-tight">
            Cookie Policy
          </h1>
          <p className="text-xs sm:text-sm text-muted font-body leading-relaxed">
            Effective Date: October 26, 2026. SORA uses strictly necessary cookies solely to keep you securely signed in to your study dashboard.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 font-body text-sm text-ink-2 leading-relaxed">
          <section className="rounded-3xl bg-surface border border-line p-6 sm:p-8 space-y-4 shadow-soft">
            <h2 className="text-lg font-display font-bold text-ink flex items-center gap-2">
              <ShieldCheck className="size-5 text-[#14161f]" />
              <span>Strictly Essential Cookies Only</span>
            </h2>
            <p>
              We believe in privacy by design. SORA does <strong>not</strong> use third-party advertising cookies, behavioural tracking pixels, or cross-site commercial profiling beacons.
            </p>
            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-2xl bg-canvas/60 border border-line/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-xs text-ink">Refresh Token Cookie</span>
                  <span className="text-[0.625rem] font-display font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Essential
                  </span>
                </div>
                <p className="text-xs text-muted">
                  A secure, <code>HttpOnly</code>, <code>SameSite</code> cookie that enables your browser to silently and securely refresh your session access token without exposing tokens to client-side JavaScript or localStorage.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-surface border border-line p-6 sm:p-8 space-y-4 shadow-soft">
            <h2 className="text-lg font-display font-bold text-ink flex items-center gap-2">
              <Check className="size-5 text-[#14161f]" />
              <span>Volatile Memory Token Storage</span>
            </h2>
            <p>
              Short-lived JWT access tokens are stored only in JavaScript memory and are discarded whenever the browser tab is closed. When you explicitly sign out, the HttpOnly refresh cookie is invalidated and cleared immediately.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-display text-muted">
          <p>© 2026 SORA Study Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-ink transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-ink transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
