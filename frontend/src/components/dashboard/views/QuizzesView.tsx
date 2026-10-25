"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap,
  Play,
  Trophy,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import { DocumentItem, QuizSession } from "@/lib/dashboard-api";
import { formatApiErrorMessage } from "@/lib/axios-client";
import { notify } from "@/components/auth/ToastProvider";
import { MascotGuide } from "../MascotGuide";
import { Skeleton } from "@/components/ui/Skeleton";

interface QuizzesViewProps {
  documents?: DocumentItem[];
  quizSessions?: QuizSession[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onStartQuiz: (docId: string) => Promise<QuizSession>;
  onNavigateDocuments?: () => void;
}

export function QuizzesView({
  documents,
  quizSessions,
  isLoading,
  isError,
  onRetry,
  onStartQuiz,
  onNavigateDocuments,
}: QuizzesViewProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
              Speed Quizzes & Exam Simulation
            </h1>
            <p className="text-xs sm:text-sm text-muted font-body mt-0.5">
              Timed multiple-choice drills to benchmark your exam readiness and retain key concepts.
            </p>
          </div>
        </div>
        <div className="rounded-3xl bg-surface border border-rose-200 p-10 text-center space-y-4 shadow-soft">
          <AlertCircle className="size-10 text-rose-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-ink">Failed to load quiz sessions</h3>
            <p className="text-xs text-muted max-w-sm mx-auto font-body">
              An error occurred while loading your past quiz performance.
            </p>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#14161f] text-[#c8f560] text-xs font-display font-bold hover:bg-night transition-all shadow-md active:scale-95"
          >
            <Zap className="size-3.5" />
            <span>Try again</span>
          </button>
        </div>
      </div>
    );
  }

  const safeDocuments = documents ?? [];
  const safeQuizSessions = quizSessions ?? [];

  const handleStartNewQuiz = async (docId: string) => {
    setIsStarting(true);
    setError(null);
    try {
      const session = await onStartQuiz(docId);
      router.push(`/dashboard/quizzes/${session.id}`);
    } catch (err: unknown) {
      const msg = formatApiErrorMessage(err);
      setError(msg);
      notify.error(msg, "Unable to Start Quiz");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
            Speed Quizzes & Exam Simulation
          </h1>
          <p className="text-xs sm:text-sm text-muted font-body mt-0.5">
            Timed multiple-choice drills to benchmark your exam readiness and retain key concepts.
          </p>
        </div>
      </div>

      {/* Mascot Section Guide */}
      <MascotGuide
        section="quizzes"
        actionLabel="Start New Quiz"
        onActionClick={() => {
          const readyDoc = safeDocuments.find((d) => d.status === "DONE");
          if (readyDoc) handleStartNewQuiz(readyDoc.id);
        }}
      />

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
        {/* Start New Quiz Column (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl bg-surface border border-line p-6 shadow-soft space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="size-5 text-amber-500" />
            <h3 className="font-display font-bold text-base text-ink">
              Start Quiz from Lecture Document
            </h3>
          </div>

          <p className="text-xs text-muted font-body">
            Select any analyzed document with generated flashcards to begin a 5-question speed quiz.
          </p>

          {safeDocuments.filter((d) => d.status === "DONE").length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <BookOpen className="size-8 text-subtle mx-auto" />
              <p className="text-xs font-display font-medium text-ink">No ready documents found</p>
              <p className="text-[0.6875rem] text-muted max-w-xs mx-auto">
                Upload a PDF document first so SORA can extract multiple-choice questions.
              </p>
              {onNavigateDocuments ? (
                <button
                  type="button"
                  onClick={onNavigateDocuments}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-night text-[#c8f560] text-xs font-display font-semibold"
                >
                  Go to Documents
                </button>
              ) : (
                <Link
                  href="/dashboard/documents"
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-night text-[#c8f560] text-xs font-display font-semibold"
                >
                  Go to Documents
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {safeDocuments
                .filter((d) => d.status === "DONE")
                .map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-canvas/40 border border-line"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="font-display font-bold text-xs sm:text-sm text-ink truncate">
                        {doc.original_name}
                      </p>
                      <p className="text-[0.6875rem] text-muted mt-0.5">
                        {doc.page_count ? `${doc.page_count} pages` : "Lecture Document"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartNewQuiz(doc.id)}
                      disabled={isStarting}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-night hover:bg-ink text-[#c8f560] text-xs font-display font-bold shadow-xs transition-transform active:scale-95 disabled:opacity-50"
                    >
                      <Play className="size-3 fill-current" />
                      <span>Start</span>
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Past Quiz Sessions Column (5 cols) */}
        <div className="lg:col-span-5 rounded-3xl bg-surface border border-line p-6 shadow-soft space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-emerald-600" />
            <h3 className="font-display font-bold text-base text-ink">Recent Quiz Scores</h3>
          </div>

          {safeQuizSessions.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted font-body">
              No past quiz sessions yet. Start your first drill above!
            </div>
          ) : (
            <div className="space-y-2.5">
              {safeQuizSessions.slice(0, 5).map((session) => (
                <Link
                  key={session.id}
                  href={`/dashboard/quizzes/${session.id}`}
                  className="p-3 rounded-2xl bg-canvas/40 hover:bg-canvas/80 border border-line flex items-center justify-between transition-colors group cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-display font-bold text-ink group-hover:text-night">
                      Quiz • {new Date(session.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-[0.6875rem] text-muted font-body">
                      {session.total_questions} Questions
                    </p>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-display font-bold">
                    {session.score ?? 0} / {session.total_questions}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
