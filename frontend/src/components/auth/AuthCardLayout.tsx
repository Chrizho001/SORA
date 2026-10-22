"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, BookOpen, Brain, Zap } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { SoraMascot, MascotEmotion } from "./SoraMascot";

interface AuthCardLayoutProps {
  title: string;
  subtitle: string;
  mascotEmotion: MascotEmotion;
  mascotMessage?: string;
  children: React.ReactNode;
  footerLink?: {
    prompt: string;
    label: string;
    href: string;
  };
  secondaryLink?: {
    label: string;
    href: string;
  };
}

export function AuthCardLayout({
  title,
  subtitle,
  mascotEmotion,
  mascotMessage,
  children,
  footerLink,
  secondaryLink,
}: AuthCardLayoutProps) {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 bg-paper relative overflow-hidden">
      {/* Subtle Studio Spotlight Glows in Background */}
      <div
        className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-gradient-to-br from-amber-200/20 to-orange-300/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-40 size-96 rounded-full bg-gradient-to-tl from-slate-300/25 to-blue-200/15 blur-3xl"
        aria-hidden="true"
      />

      {/* Top Bar on Mobile & Desktop: Back to home */}
      <div className="w-full max-w-[1040px] flex items-center justify-between mb-3 px-2 sm:px-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted hover:text-ink transition-colors group"
        >
          <ArrowLeft className="size-3.5 sm:size-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Home</span>
        </Link>
        <span className="text-xs text-subtle font-display tracking-wider uppercase hidden sm:inline-block">
          SORA Authentication
        </span>
      </div>

      {/* Main Split Authentication Card */}
      <div className="relative w-full max-w-[1040px] bg-surface rounded-3xl sm:rounded-[2rem] border border-line shadow-lift overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        {/* ============================================================== */}
        {/* LEFT COLUMN: SORA Mascot Studio Showcase (Desktop & Tablet)    */}
        {/* ============================================================== */}
        <aside className="hidden lg:flex lg:col-span-5 bg-gradient-to-b from-[#fbfaf8] via-[#f5f3ee] to-[#ece9e2] p-8 flex-col justify-between relative border-r border-line overflow-hidden select-none">
          {/* Subtle decorative grid background */}
          <div
            className="absolute inset-0 bg-[radial-gradient(#d1cfc7_1px,transparent_1px)] [background-size:20px_20px] opacity-40"
            aria-hidden="true"
          />

          {/* Left Panel Header */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface/80 border border-line/80 text-xs font-display font-medium text-ink tracking-tight shadow-soft backdrop-blur-sm">
              <Sparkles className="size-3 text-amber-500" />
              <span>AI Study Companion</span>
            </span>
            <span className="text-[0.7rem] font-semibold tracking-widest text-muted/80 uppercase">
              v1.0
            </span>
          </div>

          {/* Mascot Center Stage with Floating Badges */}
          <div className="relative z-10 my-auto flex flex-col items-center justify-center py-6">
            {/* Floating Feature Chip: Top Right */}
            <div className="absolute top-2 right-2 animate-[float_5s_ease-in-out_infinite] delay-100 bg-surface/90 border border-line rounded-xl px-2.5 py-1.5 shadow-soft flex items-center gap-1.5 text-[0.75rem] font-display text-ink backdrop-blur-sm">
              <BookOpen className="size-3.5 text-blue-500" />
              <span>PDF Summaries</span>
            </div>

            {/* Floating Feature Chip: Bottom Left */}
            <div className="absolute bottom-6 left-1 animate-[float_6s_ease-in-out_infinite] delay-300 bg-surface/90 border border-line rounded-xl px-2.5 py-1.5 shadow-soft flex items-center gap-1.5 text-[0.75rem] font-display text-ink backdrop-blur-sm">
              <Brain className="size-3.5 text-emerald-500" />
              <span>Flashcards</span>
            </div>

            {/* Floating Feature Chip: Bottom Right */}
            <div className="absolute bottom-10 right-0 animate-[float_5.5s_ease-in-out_infinite] delay-200 bg-surface/90 border border-line rounded-xl px-2.5 py-1.5 shadow-soft flex items-center gap-1.5 text-[0.75rem] font-display text-ink backdrop-blur-sm">
              <Zap className="size-3.5 text-amber-500" />
              <span>Speed Quizzes</span>
            </div>

            {/* SORA Mascot Bot */}
            <SoraMascot
              size="lg"
              emotion={mascotEmotion}
              message={mascotMessage}
              showSpeechBubble={true}
            />
          </div>

          {/* Left Panel Footer Reassurance */}
          <div className="relative z-10 bg-surface/85 border border-line/80 rounded-2xl p-4 shadow-soft backdrop-blur-sm">
            <p className="font-display font-medium text-xs text-ink leading-relaxed">
              &ldquo;Turn long lectures into punchy flashcards and quizzes in minutes.&rdquo;
            </p>
            <div className="mt-2 flex items-center justify-between text-[0.7rem] text-muted">
              <span>SORA Study Engine</span>
              <span className="text-emerald-600 font-medium">● Free for students</span>
            </div>
          </div>
        </aside>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: Authentication Form (Mobile & Desktop)           */}
        {/* ============================================================== */}
        <section className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between bg-surface">
          {/* Top Brand Logo & Mobile Avatar Header */}
          <div>
            <div className="flex items-center justify-between pb-4 sm:pb-6 border-b border-line">
              <Link href="/" aria-label="SORA Home">
                <Logo tone="ink" />
              </Link>

              {secondaryLink && (
                <Link
                  href={secondaryLink.href}
                  className="text-xs font-display font-medium text-muted hover:text-ink transition-colors underline-offset-4 hover:underline"
                >
                  {secondaryLink.label}
                </Link>
              )}
            </div>

            {/* MOBILE ONLY: Interactive Mascot Mini Header Stage */}
            <div className="lg:hidden flex flex-col items-center justify-center p-3 my-3 rounded-2xl bg-gradient-to-b from-[#faf9f6] to-[#eeebe4] border border-line/80 shadow-soft">
              <SoraMascot
                size="sm"
                emotion={mascotEmotion}
                message={mascotMessage}
                showSpeechBubble={true}
              />
            </div>

            {/* Form Title & Subtitle */}
            <div className="mt-4 sm:mt-6 mb-6">
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
                {title}
              </h1>
              <p className="mt-1.5 text-sm sm:text-base text-muted font-body leading-relaxed">
                {subtitle}
              </p>
            </div>

            {/* Form Slots */}
            <div className="w-full">{children}</div>
          </div>

          {/* Bottom Switcher Footer */}
          {footerLink && (
            <div className="mt-8 pt-6 border-t border-line text-center">
              <p className="text-xs sm:text-sm text-muted">
                {footerLink.prompt}{" "}
                <Link
                  href={footerLink.href}
                  className="font-display font-semibold text-ink hover:text-night-3 underline underline-offset-4 decoration-line-strong hover:decoration-ink transition-colors"
                >
                  {footerLink.label}
                </Link>
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Subtle Copyright / Legal Footer */}
      <footer className="mt-4 text-center text-xs text-subtle">
        <span>© 2026 SORA. Study smarter, not later.</span>
      </footer>
    </main>
  );
}
