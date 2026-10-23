"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, X, ArrowRight } from "lucide-react";
import { SoraMascot, MascotEmotion } from "@/components/auth/SoraMascot";

interface MascotGuideProps {
  section: "overview" | "documents" | "flashcards" | "quizzes" | "tasks" | "notifications";
  userName?: string;
  onActionClick?: () => void;
  actionLabel?: string;
  className?: string;
}

const SECTION_GUIDANCE: Record<
  MascotGuideProps["section"],
  {
    title: string;
    emotion: MascotEmotion;
    bubble: string;
    description: string;
    defaultAction?: string;
    tips: string[];
  }
> = {
  overview: {
    title: "Study Assistant Ready",
    emotion: "happy",
    bubble: "Ready to study? Let's crush your goals!",
    description:
      "Here is your daily study hub. Track your weekly study hours, manage deadlines on the interactive calendar, and dive into your active course materials.",
    defaultAction: "Upload Lecture PDF",
    tips: [
      "Upload lecture slides or textbooks to generate instant summaries.",
      "Click any day on the calendar to see tasks scheduled for that date.",
      "Check your study activity chart to keep your streak going!",
    ],
  },
  documents: {
    title: "PDF & Summary Studio",
    emotion: "focused",
    bubble: "Drag & drop your lecture PDF here!",
    description:
      "Upload course syllabi, lecture slides, or textbook chapters (up to 10MB PDF). I'll extract key formulas, definitions, and chapter summaries in seconds.",
    defaultAction: "+ Upload PDF",
    tips: [
      "Supported format: standard PDF documents under 10MB.",
      "Once summarized, click 'Generate Flashcards' to build a study deck automatically.",
      "You can launch a speed quiz directly from any completed document summary.",
    ],
  },
  flashcards: {
    title: "Smart Spaced Repetition",
    emotion: "thinking",
    bubble: "Flip cards to test your memory recall!",
    description:
      "Active recall and spaced repetition are the most scientifically proven methods for exam preparation. Review flashcard decks extracted from your lectures.",
    defaultAction: "Practice Flashcards",
    tips: [
      "Click or press Spacebar to flip between question and answer.",
      "Decks are generated directly from your uploaded lecture concepts.",
      "Regular review sessions strengthen long-term synaptic retention.",
    ],
  },
  quizzes: {
    title: "Speed Quiz Arena",
    emotion: "focused",
    bubble: "Put your knowledge to the test!",
    description:
      "Simulate real exam pressure with quick multiple-choice quizzes. SORA grades each question instantly and highlights concepts you need to revisit.",
    defaultAction: "Start Speed Quiz",
    tips: [
      "Each quiz is timed to build mental agility and exam stamina.",
      "Instant explanations help you understand why an answer is correct.",
      "Review past scores and track your retention improvement over time.",
    ],
  },
  tasks: {
    title: "Study Schedule & Deadlines",
    emotion: "happy",
    bubble: "Set dates and priorities to stay on track!",
    description:
      "Organize assignment due dates, quiz dates, and study blocks. Filter by calendar date and let SORA send you timely reminders before deadlines hit.",
    defaultAction: "+ New Task",
    tips: [
      "Assign High, Medium, or Low priority to balance your workload.",
      "Click any date on the calendar grid to filter tasks for that day.",
      "Check off completed tasks to watch your progress bar climb!",
    ],
  },
  notifications: {
    title: "Notifications & System Alerts",
    emotion: "neutral",
    bubble: "I'll keep you updated on all your AI jobs!",
    description:
      "Receive live updates whenever a PDF finishes summarizing, flashcard decks are generated, or a scheduled assignment deadline is approaching.",
    defaultAction: "Mark All as Read",
    tips: [
      "Get alerted when long Celery AI processing jobs complete.",
      "Enable PWA push notifications to get alerts directly on your phone.",
    ],
  },
};

export function MascotGuide({
  section,
  userName = "Student",
  onActionClick,
  actionLabel,
  className = "",
}: MascotGuideProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const guidance = SECTION_GUIDANCE[section];
  const greeting = section === "overview" ? `Hey ${userName}! 👋` : guidance.title;

  return (
    <aside
      aria-label="SORA Mascot Guidelines"
      className={`relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-[#ffffff] via-[#fcfbf9] to-[#f4f1ea] p-4 sm:p-6 shadow-soft hover:shadow-lift transition-all duration-300 ${className}`}
    >
      {/* Decorative ambient tint accent */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-[#c8f560]/20 blur-3xl"
        aria-hidden="true"
      />

      {/* MOBILE HEADER (Stacked cleanly on mobile, side-by-side on tablet/desktop) */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-5">
        {/* Mascot Avatar & Title Block */}
        <div className="flex items-center sm:items-start gap-3 sm:gap-4 min-w-0">
          {/* Mascot Container: Scaled cleanly so it never pushes or squishes text */}
          <div className="shrink-0 size-14 sm:size-16 flex items-center justify-center rounded-2xl bg-canvas/60 border border-line p-1 shadow-2xs overflow-hidden">
            <SoraMascot
              size="xs"
              emotion={guidance.emotion}
              message={guidance.bubble}
              showSpeechBubble={false}
            />
          </div>

          {/* Title & Badge */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#16171f] px-2.5 py-0.5 text-[0.6875rem] font-display font-medium text-[#c8f560] shadow-xs">
                <Sparkles className="size-3" />
                <span>SORA Guide</span>
              </span>
            </div>

            <h2 className="text-sm sm:text-xl font-display font-bold text-ink tracking-tight leading-snug">
              {greeting}
            </h2>
          </div>

          {/* Mobile Collapse & Close Buttons in top right of header */}
          <div className="flex sm:hidden items-center gap-1 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="size-8 rounded-full text-muted hover:bg-mist hover:text-ink flex items-center justify-center transition-colors active:scale-95"
              aria-label={isExpanded ? "Collapse guidelines" : "Expand guidelines"}
            >
              {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="size-8 rounded-full text-muted hover:bg-mist hover:text-ink flex items-center justify-center transition-colors active:scale-95"
              aria-label="Dismiss guide"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Desktop / Tablet Controls */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          {onActionClick && (
            <button
              type="button"
              onClick={onActionClick}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#16171f] hover:bg-night hover:-translate-y-0.5 px-4 py-2 text-xs font-display font-bold text-[#c8f560] shadow-sm hover:shadow-[0_0_15px_rgba(200,245,96,0.3)] transition-all duration-200 active:scale-95"
            >
              <span>{actionLabel || guidance.defaultAction}</span>
              <ArrowRight className="size-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="size-8 rounded-full text-muted hover:bg-mist hover:text-ink flex items-center justify-center transition-colors active:scale-95"
            aria-label={isExpanded ? "Collapse guidelines" : "Expand guidelines"}
          >
            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="size-8 rounded-full text-muted hover:bg-mist hover:text-ink flex items-center justify-center transition-colors active:scale-95"
            aria-label="Dismiss guide"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* FULL-WIDTH DESCRIPTION ON MOBILE & DESKTOP (Never squished!) */}
      <div className="mt-3 sm:mt-2.5 sm:pl-24">
        <p className="text-xs sm:text-sm text-ink-2 font-body leading-relaxed">
          {guidance.description}
        </p>

        {/* Expandable Tips */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-line/60">
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-body text-ink-2">
              {guidance.tips.map((tip, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 rounded-2xl bg-surface/90 p-2.5 border border-line/70 shadow-2xs hover:border-line-strong transition-all"
                >
                  <span className="text-[#16a34a] font-bold text-sm leading-none mt-0.5">•</span>
                  <span className="leading-snug">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mobile Action Button (Full Width, Thumb-Friendly) */}
        {onActionClick && (
          <div className="mt-3 sm:hidden">
            <button
              type="button"
              onClick={onActionClick}
              className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-2xl bg-[#16171f] hover:bg-night text-[#c8f560] text-xs font-display font-bold shadow-md hover:shadow-[0_0_15px_rgba(200,245,96,0.3)] transition-all active:scale-95"
            >
              <span>{actionLabel || guidance.defaultAction}</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
