"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Zap,
  CheckCircle2,
  XCircle,
  Trophy,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { formatApiErrorMessage } from "@/lib/axios-client";
import { notify } from "@/components/auth/ToastProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQuizSession, useSubmitQuiz } from "@/lib/use-dashboard-queries";

function QuizSessionContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id as string;

  const { data: session, isLoading, isError, refetch } = useQuizSession(sessionId);
  const submitQuizMutation = useSubmitQuiz();

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectChoice = (questionId: string, choice: string) => {
    if (session?.finished_at) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: choice,
    }));
  };

  const handleSubmit = async () => {
    if (!session || session.finished_at) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const answersPayload = session.questions
        .map((q) => ({
          question_id: q.id,
          selected_choice: selectedAnswers[q.id] ?? q.selected_choice ?? "",
        }))
        .filter((a) => Boolean(a.selected_choice));

      await submitQuizMutation.mutateAsync({
        sessionId: session.id,
        answers: answersPayload,
      });
    } catch (err: unknown) {
      const msg = formatApiErrorMessage(err);
      setError(msg);
      notify.error(msg, "Failed to Submit Quiz");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-16">
        <div className="flex items-center justify-between pb-4 border-b border-line">
          <Skeleton className="h-6 w-32 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !session) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-16">
        <Link
          href="/dashboard/quizzes"
          className="inline-flex items-center gap-1.5 text-xs font-display font-semibold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Speed Quizzes</span>
        </Link>

        <div className="rounded-3xl bg-surface border border-rose-200 p-8 text-center space-y-4 shadow-soft">
          <AlertCircle className="size-10 text-rose-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-ink">Quiz Session Not Found</h3>
            <p className="text-xs text-muted max-w-sm mx-auto font-body">
              This speed quiz session could not be loaded or may have been deleted.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className="px-4 py-2 rounded-xl bg-canvas hover:bg-mist text-ink text-xs font-display font-bold border border-line transition-all"
            >
              Retry
            </button>
            <Link
              href="/dashboard/quizzes"
              className="px-4 py-2 rounded-xl bg-night text-[#c8f560] text-xs font-display font-bold hover:bg-ink transition-all shadow-md"
            >
              Back to Quizzes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isFinished = !!session.finished_at;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/quizzes"
          className="inline-flex items-center gap-1.5 text-xs font-display font-semibold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Speed Quizzes</span>
        </Link>
      </div>

      {/* Error alert if submission failed */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="size-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1 space-y-0.5">
            <p className="font-display font-semibold text-rose-900">Quiz Error</p>
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

      {/* Quiz Runner Container */}
      <div className="rounded-3xl bg-surface border border-line p-6 sm:p-8 shadow-soft space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Zap className="size-4.5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-ink">
                {isFinished ? "Quiz Complete!" : "Speed Quiz in Progress"}
              </h2>
              <p className="text-xs text-muted font-body">
                {session.questions.length} questions • {isFinished ? "Results review" : "Answer all to submit"}
              </p>
            </div>
          </div>

          {isFinished && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-display font-bold">
              <Trophy className="size-3.5 text-emerald-600" />
              <span>
                Score: {session.score} / {session.total_questions}
              </span>
            </div>
          )}
        </div>

        {/* Question Cards */}
        <div className="space-y-6">
          {session.questions.map((q, idx) => {
            const selected = selectedAnswers[q.id] ?? q.selected_choice;

            return (
              <div key={q.id} className="p-4 rounded-2xl bg-canvas/40 border border-line space-y-3">
                <p className="font-display font-bold text-sm text-ink">
                  <span className="text-muted mr-1.5">{idx + 1}.</span> {q.question_text}
                </p>

                <div className="space-y-2">
                  {q.choices.map((choice, cIdx) => {
                    const isChoiceSelected = selected === choice;
                    const isCorrect = isFinished && choice === q.correct_answer;
                    const isWrong = isFinished && isChoiceSelected && !q.is_correct;

                    return (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => handleSelectChoice(q.id, choice)}
                        disabled={isFinished}
                        className={`w-full text-left p-3 rounded-xl border text-xs font-body transition-all duration-150 active:scale-[0.99] flex items-center justify-between ${
                          isCorrect
                            ? "bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold shadow-xs"
                            : isWrong
                            ? "bg-rose-50 border-rose-400 text-rose-900 shadow-xs"
                            : isChoiceSelected
                            ? "bg-night text-[#c8f560] border-night font-semibold shadow-sm scale-[1.01]"
                            : "bg-surface hover:bg-mist hover:border-line-strong text-ink"
                        }`}
                      >
                        <span>{choice}</span>
                        {isCorrect && <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />}
                        {isWrong && <XCircle className="size-4 text-rose-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit or Finish Actions */}
        <div className="pt-4 border-t border-line flex items-center justify-between">
          <Link
            href="/dashboard/quizzes"
            className="text-xs font-display text-muted hover:text-ink transition-colors"
          >
            ← Back to Quiz List
          </Link>

          {!isFinished ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || Object.keys(selectedAnswers).length === 0}
              className="px-6 py-2.5 rounded-xl bg-night hover:bg-ink text-[#c8f560] text-xs font-display font-bold shadow-md transition-transform active:scale-95 disabled:opacity-40"
            >
              {isSubmitting ? "Grading..." : "Submit Answers"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/dashboard/quizzes")}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-display font-bold shadow-md transition-transform active:scale-95"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuizSessionPage() {
  return (
    <React.Suspense fallback={<div className="max-w-2xl mx-auto space-y-6 pb-16 animate-pulse" />}>
      <QuizSessionContent />
    </React.Suspense>
  );
}
