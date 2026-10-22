"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LogOut,
  Sparkles,
  BookOpen,
  Brain,
  Zap,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/lib/auth-context";
import { SoraMascot } from "@/components/auth/SoraMascot";
import { notify } from "@/components/auth/ToastProvider";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Protected Route Check: redirect to /login if unauthenticated
  useEffect(() => {
    if (!isLoading && !user) {
      notify.info(
        "Please sign in to access your study dashboard.",
        "Authentication Required"
      );
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  // Handle Logout
  const handleLogout = async () => {
    console.log("LOGOUT BUTTON CLICKED");
    setIsLoggingOut(true);
    try {
      await logout();
      notify.success("You have been signed out successfully.", "Logged Out");
      router.replace("/login");
    } catch {
      notify.error("An error occurred during logout.", "Logout Error");
      setIsLoggingOut(false);
    }
  };

  // Loading Screen while verifying session
  if (isLoading || (!user && !isLoggingOut)) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center bg-paper p-4">
        <div className="flex flex-col items-center space-y-4">
          <SoraMascot
            size="md"
            emotion="thinking"
            message="Restoring student session..."
            showSpeechBubble={true}
          />
          <div className="flex items-center gap-2 text-muted text-sm font-display animate-pulse">
            <span className="size-2 rounded-full bg-night animate-ping" />
            <span>Verifying authenticated session...</span>
          </div>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-dvh bg-paper flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur-md border-b border-line px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" aria-label="SORA Home">
              <Logo tone="ink" />
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-display font-medium">
              <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Live Session
            </span>
          </div>

          {/* User Profile Info & Logout Action */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-display font-semibold text-ink leading-tight">
                {user.first_name} {user.last_name}
              </span>
              <span className="text-xs text-muted truncate max-w-[180px]">
                {user.email}
              </span>
            </div>

            <button
              id="logout-button"
              data-testid="logout-button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-canvas hover:bg-mist text-ink hover:text-night text-xs sm:text-sm font-display font-medium transition-all duration-200 border border-line active:scale-95 disabled:opacity-50"
              title="Log out of SORA"
            >
              <LogOut className="size-3.5 sm:size-4 text-muted" />
              <span>{isLoggingOut ? "Signing out..." : "Log Out"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8">
        {/* Welcome Hero Card with SORA Mascot */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#faf8f4] via-[#f4f1ea] to-[#ede9df] border border-line shadow-soft p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-lg text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-line text-xs font-display font-medium text-ink shadow-soft">
              <Sparkles className="size-3 text-amber-500" />
              <span>Student Dashboard • Spring Term</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-display font-bold text-ink tracking-tight">
              Welcome, {user.first_name}! 👋
            </h1>
            <p className="text-sm sm:text-base text-muted font-body leading-relaxed">
              Your lecture notes, flashcards, and speed quizzes are synchronized and ready. Everything is authenticated and verified.
            </p>
          </div>

          {/* Interactive SORA Robot Mascot */}
          <div className="shrink-0">
            <SoraMascot
              size="md"
              emotion="happy"
              message={`Great to see you, ${user.first_name}!`}
              showSpeechBubble={true}
            />
          </div>
        </section>

        {/* Live Authentication Details Card (Verification & Debug Panel) */}
        <section className="bg-surface rounded-2xl border border-line p-5 sm:p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-600" />
              <h2 className="font-display font-semibold text-ink text-base">
                Authentication & Session Status
              </h2>
            </div>
            <span className="text-xs font-display text-muted">
              Backend Architecture: §01-authentication
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-body">
            {/* User ID */}
            <div className="p-3 rounded-xl bg-canvas/50 border border-line">
              <span className="text-subtle font-display font-medium uppercase tracking-wider block mb-1">
                User Identifier
              </span>
              <span className="font-mono text-ink text-[0.75rem] break-all">
                {user.id}
              </span>
            </div>

            {/* Email & Verification */}
            <div className="p-3 rounded-xl bg-canvas/50 border border-line">
              <span className="text-subtle font-display font-medium uppercase tracking-wider block mb-1">
                Email Address
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-ink font-medium truncate">{user.email}</span>
                {user.is_email_verified ? (
                  <span className="text-emerald-600 inline-flex items-center" title="Email Verified">
                    <CheckCircle2 className="size-3.5 shrink-0" />
                  </span>
                ) : (
                  <span className="text-amber-600 inline-flex items-center" title="Unverified Email">
                    <AlertCircle className="size-3.5 shrink-0" />
                  </span>
                )}
              </div>
            </div>

            {/* Auth Provider */}
            <div className="p-3 rounded-xl bg-canvas/50 border border-line">
              <span className="text-subtle font-display font-medium uppercase tracking-wider block mb-1">
                Auth Provider
              </span>
              <span className="text-ink font-display font-medium capitalize">
                {user.auth_providers.length > 0
                  ? user.auth_providers.join(", ")
                  : "Email & Password"}
              </span>
            </div>

            {/* JWT Token Status */}
            <div className="p-3 rounded-xl bg-canvas/50 border border-line">
              <span className="text-subtle font-display font-medium uppercase tracking-wider block mb-1">
                Token Storage
              </span>
              <span className="text-emerald-700 font-display font-medium flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-500" />
                In-Memory + HttpOnly Cookie
              </span>
            </div>
          </div>
        </section>

        {/* Study Modules Teaser Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Module 1: Lecture Summaries */}
          <div className="bg-surface rounded-2xl border border-line p-5 shadow-soft hover:shadow-lift transition-all duration-300 space-y-3">
            <div className="size-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <BookOpen className="size-5" />
            </div>
            <h3 className="font-display font-semibold text-ink text-base">
              PDF Summarizer
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Upload long lectures and textbook PDFs to extract key ideas in minutes.
            </p>
            <div className="pt-2 border-t border-line flex items-center justify-between text-xs">
              <span className="text-subtle">03-pdf-summary</span>
              <span className="font-display font-medium text-ink">Ready to upload →</span>
            </div>
          </div>

          {/* Module 2: Flashcards */}
          <div className="bg-surface rounded-2xl border border-line p-5 shadow-soft hover:shadow-lift transition-all duration-300 space-y-3">
            <div className="size-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Brain className="size-5" />
            </div>
            <h3 className="font-display font-semibold text-ink text-base">
              Smart Flashcards
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Spaced repetition decks generated directly from your lecture notes.
            </p>
            <div className="pt-2 border-t border-line flex items-center justify-between text-xs">
              <span className="text-subtle">04-flashcards</span>
              <span className="font-display font-medium text-ink">View Decks →</span>
            </div>
          </div>

          {/* Module 3: Speed Quizzes */}
          <div className="bg-surface rounded-2xl border border-line p-5 shadow-soft hover:shadow-lift transition-all duration-300 space-y-3">
            <div className="size-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Zap className="size-5" />
            </div>
            <h3 className="font-display font-semibold text-ink text-base">
              Speed Quizzes
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              Test your knowledge before the exam and pinpoint your weak spots.
            </p>
            <div className="pt-2 border-t border-line flex items-center justify-between text-xs">
              <span className="text-subtle">05-quiz</span>
              <span className="font-display font-medium text-ink">Start Quiz →</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-line py-4 px-6 text-center text-xs text-subtle">
        <span>SORA Student Assistant • Connected to Django REST API (v1.0)</span>
      </footer>
    </div>
  );
}
