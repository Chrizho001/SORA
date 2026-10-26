"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  Play,
  Trophy,
  AlertCircle,
  RotateCw,
  Clock,
  Layers,
  ChevronRight,
} from "lucide-react";
import { Deck, Flashcard, QuizSession } from "@/lib/dashboard-api";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatApiErrorMessage } from "@/lib/axios-client";
import { notify } from "@/components/auth/ToastProvider";

interface QuizzesViewProps {
  decks?: Deck[];
  flashcards?: Flashcard[];
  quizSessions?: QuizSession[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onStartQuiz: (deckId: string, questionCount: number) => Promise<QuizSession>;
}

// Normalise answers according to the spec: " ".join(a.casefold().split())
function normaliseAnswer(answer: string): string {
  return answer.toLowerCase().trim().split(/\s+/).filter(Boolean).join(" ");
}

export function QuizzesView({
  decks,
  flashcards,
  quizSessions,
  isLoading,
  isError,
  onRetry,
  onStartQuiz,
}: QuizzesViewProps) {
  const router = useRouter();

  // Per-deck selected question counts (default 10)
  const [deckQuestionCounts, setDeckQuestionCounts] = useState<Record<string, number>>({});
  const [startingDeckId, setStartingDeckId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Group flashcards by deck to compute distinct answers count client-side
  const deckCardsMap = useMemo(() => {
    const map = new Map<string, Flashcard[]>();
    (flashcards ?? []).forEach((card) => {
      if (card.deck) {
        const list = map.get(card.deck) ?? [];
        list.push(card);
        map.set(card.deck, list);
      }
    });
    return map;
  }, [flashcards]);

  const handleStart = async (deckId: string, count: number) => {
    setStartingDeckId(deckId);
    setError(null);
    try {
      const session = await onStartQuiz(deckId, count);
      router.push(`/dashboard/quizzes/${session.id}`);
    } catch (err: unknown) {
      const msg = formatApiErrorMessage(err);
      setError(msg);
      notify.error(msg, "Unable to Start Quiz");
    } finally {
      setStartingDeckId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 rounded-xl" />
            <Skeleton className="h-4 w-96 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-3xl" />
            ))}
          </div>
          <div className="lg:col-span-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-3xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 pb-16">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
            Speed Quizzes & Exam Drills
          </h1>
          <p className="text-xs sm:text-sm text-muted font-body mt-0.5">
            Test yourself with multiple-choice quizzes automatically built from your flashcard decks.
          </p>
        </div>
        <div className="rounded-3xl bg-surface border border-rose-200 p-10 text-center space-y-4 shadow-soft">
          <AlertCircle className="size-10 text-rose-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-ink">Failed to load quiz sessions</h3>
            <p className="text-xs text-muted max-w-sm mx-auto font-body">
              An error occurred while loading your decks and past quiz history.
            </p>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#14161f] text-[#c8f560] text-xs font-display font-bold hover:bg-night transition-all shadow-md active:scale-95"
          >
            <RotateCw className="size-3.5" />
            <span>Try again</span>
          </button>
        </div>
      </div>
    );
  }

  const safeDecks = decks ?? [];
  const safeQuizSessions = quizSessions ?? [];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
            Speed Quizzes & Exam Drills
          </h1>
          <p className="text-xs sm:text-sm text-muted font-body mt-0.5">
            Test yourself with multiple-choice quizzes automatically built from your flashcard decks.
          </p>
        </div>
      </div>

      {/* Error Alert Box */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="size-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1 space-y-0.5">
            <p className="font-display font-semibold text-rose-900">Quiz Notice</p>
            <p className="text-rose-700 leading-relaxed font-body">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-700 font-display font-medium text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Launch & History View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Start a Quiz Column (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl bg-surface border border-line p-6 shadow-soft space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Zap className="size-4.5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-ink">Start a Quiz</h2>
                <p className="text-xs text-muted font-body">
                  Choose a flashcard deck to begin multiple-choice test practice.
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/flashcards"
              className="text-xs font-display font-semibold text-purple-700 hover:text-purple-900 transition-colors"
            >
              Manage Decks
            </Link>
          </div>

          {safeDecks.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <div className="size-12 rounded-2xl bg-purple-50 text-purple-600 mx-auto flex items-center justify-center">
                <Layers className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-bold text-sm text-ink">No flashcard decks yet</h3>
                <p className="text-xs text-muted max-w-xs mx-auto font-body">
                  Create a flashcard deck first or generate one from your lecture PDFs to unlock multiple-choice drills.
                </p>
              </div>
              <Link
                href="/dashboard/flashcards"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-night text-[#c8f560] text-xs font-display font-bold hover:bg-ink transition-all shadow-sm"
              >
                <span>Create First Deck</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {safeDecks.map((deck) => {
                // Compute distinct answers
                const cards = deckCardsMap.get(deck.id) ?? [];
                const distinctSet = new Set<string>();
                cards.forEach((c) => {
                  const norm = normaliseAnswer(c.answer);
                  if (norm) distinctSet.add(norm);
                });
                const distinctCount = distinctSet.size;

                const hasFewerThan4Cards = deck.card_count < 4;
                const hasFewerThan4Distinct =
                  cards.length > 0 ? distinctCount < 4 : deck.card_count < 4;
                const isDisabled = hasFewerThan4Cards || hasFewerThan4Distinct || startingDeckId !== null;

                const disabledReason = hasFewerThan4Cards
                  ? `Deck needs at least 4 flashcards (currently ${deck.card_count})`
                  : hasFewerThan4Distinct
                  ? `Deck needs at least 4 distinct answers (currently ${distinctCount})`
                  : "";

                const selectedCount = deckQuestionCounts[deck.id] ?? 10;
                const isStartingThis = startingDeckId === deck.id;

                return (
                  <div
                    key={deck.id}
                    className="p-4 rounded-2xl bg-canvas/40 border border-line hover:border-line/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/flashcards/${deck.id}`}
                          className="font-display font-bold text-sm text-ink hover:text-purple-700 transition-colors truncate"
                        >
                          {deck.title}
                        </Link>
                        {deck.document_name && (
                          <span
                            className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-canvas border border-line text-[0.625rem] text-muted truncate max-w-[120px]"
                            title={deck.document_name}
                          >
                            {deck.document_name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted font-display">
                        <span>
                          {deck.card_count} {deck.card_count === 1 ? "card" : "cards"}
                        </span>
                        {cards.length > 0 && (
                          <>
                            <span>•</span>
                            <span className={distinctCount < 4 ? "text-amber-700 font-semibold" : ""}>
                              {distinctCount} distinct {distinctCount === 1 ? "answer" : "answers"}
                            </span>
                          </>
                        )}
                      </div>

                      {isDisabled && disabledReason && (
                        <p className="text-[0.6875rem] text-amber-800 font-body flex items-center gap-1 pt-0.5">
                          <AlertCircle className="size-3 shrink-0 text-amber-600" />
                          <span>{disabledReason}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <div className="inline-flex items-center rounded-xl bg-surface border border-line p-0.5">
                        <select
                          value={selectedCount}
                          onChange={(e) =>
                            setDeckQuestionCounts((prev) => ({
                              ...prev,
                              [deck.id]: Number(e.target.value),
                            }))
                          }
                          disabled={isDisabled}
                          aria-label={`Question count for ${deck.title}`}
                          className="h-8 pl-2 pr-1 rounded-lg bg-transparent text-xs font-display font-semibold text-ink focus:outline-none disabled:opacity-40"
                        >
                          <option value={5}>5 Qs</option>
                          <option value={10}>10 Qs</option>
                          <option value={20}>20 Qs</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStart(deck.id, selectedCount)}
                        disabled={isDisabled}
                        title={disabledReason || `Start a ${selectedCount}-question speed quiz`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-night hover:bg-ink text-[#c8f560] text-xs font-display font-bold shadow-sm transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isStartingThis ? (
                          <RotateCw className="size-3.5 animate-spin" />
                        ) : (
                          <Play className="size-3.5 fill-current" />
                        )}
                        <span>{isStartingThis ? "Starting..." : "Start"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* History Column (5 cols) */}
        <div className="lg:col-span-5 rounded-3xl bg-surface border border-line p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-emerald-600" />
              <h2 className="font-display font-bold text-base text-ink">Quiz History</h2>
            </div>
            <span className="text-xs font-display text-muted">
              {safeQuizSessions.length} {safeQuizSessions.length === 1 ? "attempt" : "attempts"}
            </span>
          </div>

          {safeQuizSessions.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Clock className="size-8 text-subtle mx-auto" />
              <p className="text-xs font-display font-semibold text-ink">No quiz history yet</p>
              <p className="text-[0.6875rem] text-muted max-w-xs mx-auto font-body">
                Take your first quiz from the left panel to track your scores and retention over time.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {safeQuizSessions.map((session) => {
                const isFinished = !!session.finished_at;
                const score = session.score ?? 0;
                const total = session.total_questions;
                const percent = total > 0 ? Math.round((score / total) * 100) : 0;
                const dateStr = new Date(session.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });

                return (
                  <Link
                    key={session.id}
                    href={`/dashboard/quizzes/${session.id}`}
                    className="p-3.5 rounded-2xl bg-canvas/40 hover:bg-canvas/80 border border-line flex items-center justify-between transition-all group cursor-pointer hover:border-line-strong"
                  >
                    <div className="space-y-1 min-w-0 pr-3">
                      <p className="text-xs font-display font-bold text-ink truncate group-hover:text-purple-700 transition-colors">
                        {session.deck_title || "Quiz Drill"}
                      </p>
                      <p className="text-[0.6875rem] text-muted font-body">
                        {dateStr} • {session.total_questions} Qs
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isFinished ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-display font-bold border ${
                              percent >= 80
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : percent >= 50
                                ? "bg-sky-50 text-sky-800 border-sky-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {score} / {total} ({percent}%)
                          </span>
                          <ChevronRight className="size-3.5 text-muted group-hover:text-ink group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-display font-semibold">
                            In progress
                          </span>
                          <span className="text-xs font-display font-bold text-purple-700 underline group-hover:text-purple-900 transition-colors">
                            Resume
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
