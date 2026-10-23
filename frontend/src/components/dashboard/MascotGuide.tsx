"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, X } from "lucide-react";
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
      className={`relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-[#ffffff] via-[#f9f8f5] to-[#f4f1ea] p-4 sm:p-6 shadow-soft transition-all duration-300 ${className}`}
    >
      {/* Decorative ambient tint accent */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-[#c8f560]/20 blur-3xl"
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-4">
        {/* Mascot Face & Content */}
        <div className="flex items-start gap-3 sm:gap-5 flex-1 min-w-0">
          <div className="shrink-0 pt-0.5">
            <SoraMascot
              size="sm"
              emotion={guidance.emotion}
              message={guidance.bubble}
              showSpeechBubble={false}
              className="scale-90 sm:scale-100 origin-top"
            />
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#16171f] px-2.5 py-0.5 text-[0.7rem] font-display font-medium text-[#c8f560]">
                <Sparkles className="size-3" />
                <span>SORA Guide</span>
              </span>
              <h2 className="text-base sm:text-lg font-display font-bold text-ink tracking-tight truncate">
                {greeting}
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-muted font-body leading-relaxed line-clamp-2 sm:line-clamp-none">
              {guidance.description}
            </p>

            {/* Expandable Tips */}
            {isExpanded && (
              <div className="pt-2">
                <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-body text-ink-2">
                  {guidance.tips.map((tip, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-1.5 rounded-xl bg-surface/80 p-2 border border-line/60"
                    >
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Controls: Expand/Collapse & Dismiss */}
        <div className="flex items-center gap-1 shrink-0">
          {onActionClick && (
            <button
              type="button"
              onClick={onActionClick}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#16171f] hover:bg-night px-4 py-1.5 text-xs font-display font-semibold text-[#c8f560] shadow-sm transition-transform active:scale-95"
            >
              <span>{actionLabel || guidance.defaultAction}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-full p-1.5 text-muted hover:bg-mist hover:text-ink transition-colors"
            title={isExpanded ? "Collapse guidelines" : "Expand guidelines"}
            aria-label={isExpanded ? "Collapse guidelines" : "Expand guidelines"}
          >
            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="rounded-full p-1.5 text-muted hover:bg-mist hover:text-ink transition-colors"
            title="Dismiss guide for this session"
            aria-label="Dismiss guide"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Mobile action button */}
      {onActionClick && (
        <div className="mt-3 block sm:hidden">
          <button
            type="button"
            onClick={onActionClick}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#16171f] px-4 py-2 text-xs font-display font-semibold text-[#c8f560] shadow-sm transition-transform active:scale-95"
          >
            <span>{actionLabel || guidance.defaultAction}</span>
          </button>
        </div>
      )}
    </aside>
  );
}
