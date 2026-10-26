import React from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Scale, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Terms of Service | SORA Study",
  description: "Terms and conditions for using the SORA academic study platform.",
};

export default function TermsPage() {
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
            Legal Terms
          </span>
        </div>

        {/* Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-canvas border border-line text-muted text-xs font-display font-bold">
            <Scale className="size-3.5" />
            <span>Terms & Conditions</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs sm:text-sm text-muted font-body leading-relaxed">
            Effective Date: October 26, 2026. Please read these terms carefully before utilizing SORA for academic study and coursework preparation.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 font-body text-sm text-ink-2 leading-relaxed">
          <section className="rounded-3xl bg-surface border border-line p-6 sm:p-8 space-y-4 shadow-soft">
            <h2 className="text-lg font-display font-bold text-ink flex items-center gap-2">
              <BookOpen className="size-5 text-[#14161f]" />
              <span>1. Acceptable Academic Use</span>
            </h2>
            <p>
              SORA is intended as an individual educational aid to assist students in reviewing study materials, understanding complex lectures, and preparing for exams. Users must respect their institution&apos;s academic honor codes and copyright laws when uploading materials.
            </p>
          </section>

          <section className="rounded-3xl bg-surface border border-line p-6 sm:p-8 space-y-4 shadow-soft">
            <h2 className="text-lg font-display font-bold text-ink flex items-center gap-2">
              <CheckCircle2 className="size-5 text-[#14161f]" />
              <span>2. User Accounts & Security</span>
            </h2>
            <p>
              You are responsible for safeguarding your credentials. SORA maintains robust security measures including HttpOnly session refresh cookies and in-memory access tokens to protect your account.
            </p>
          </section>

          <section className="rounded-3xl bg-surface border border-line p-6 sm:p-8 space-y-4 shadow-soft">
            <h2 className="text-lg font-display font-bold text-ink flex items-center gap-2">
              <Scale className="size-5 text-[#14161f]" />
              <span>3. AI Generation & Disclaimers</span>
            </h2>
            <p>
              AI-generated summaries, flashcards, and quizzes are generated using multimodal machine learning models (including Google Gemini) to assist your study. While engineered for high accuracy, AI outputs should be verified against your primary textbooks and syllabus instructions.
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
            <Link href="/cookies" className="hover:text-ink transition-colors">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
