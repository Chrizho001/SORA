"use client";

import React, { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Zap,
  CheckCircle2,
  XCircle,
  Trophy,
  ArrowLeft,
  AlertCircle,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  HelpCircle,
} from "lucide-react";
import { formatApiErrorMessage } from "@/lib/axios-client";
import { notify } from "@/components/auth/ToastProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  useQuizSession,
  useSubmitQuiz,
  useStartDeckQuiz,
} from "@/lib/use-dashboard-queries";

function QuizSessionContent() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id as string;

  const { data: session, isLoading, isError, refetch } = useQuizSession(sessionId);
  const submitQuizMutation = useSubmitQuiz();
  const startDeckQuizMutation = useStartDeckQuiz();

  // Answers state initialized lazily from sessionStorage keyed by session id (answers only, no tokens)
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined" || !sessionId) return {};
    try {
      const stored = sessionStorage.getItem(`quiz_answers_${sessionId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          return parsed as Record<string, string>;
        }
      }
    } catch {
      // Ignore sessionStorage parsing errors
    }
    return {};
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetaking, setIsRetaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmIncompleteOpen, setIsConfirmIncompleteOpen] = useState(false);

  const choicesRef = useRef<HTMLDivElement>(null);

  // Questions ordered by position
  const questions = session?.questions;
  const sortedQuestions = useMemo(() => {
    if (!questions) return [];
    return [...questions].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0)
    );
  }, [questions]);

  const totalQuestions = session?.total_questions ?? sortedQuestions.length;
  const isFinished = !!session?.finished_at;

  const safeQuestionIndex =
    sortedQuestions.length > 0
      ? Math.max(0, Math.min(currentQuestionIndex, sortedQuestions.length - 1))
      : 0;
  const currentQuestion = sortedQuestions[safeQuestionIndex];

  const answeredCount = sortedQuestions.filter((q) => !!answers[q.id]).length;
  const isAllAnswered = sortedQuestions.length > 0 && answeredCount === sortedQuestions.length;

  const handleSelectChoice = (questionId: string, choice: string) => {
    if (isFinished) return;
    setAnswers((prev) => {
      const next = {
        ...prev,
        [questionId]: choice,
      };
      try {
        sessionStorage.setItem(`quiz_answers_${sessionId}`, JSON.stringify(next));
      } catch {
        // Ignore storage write errors
      }
      return next;
    });
  };

  // Keyboard navigation for choices (arrow keys)
  const handleKeyDownChoice = (
    e: React.KeyboardEvent,
    currentChoiceIndex: number,
    choicesList: string[]
  ) => {
    if (!currentQuestion) return;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      const nextIndex = (currentChoiceIndex + 1) % choicesList.length;
      handleSelectChoice(currentQuestion.id, choicesList[nextIndex]);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      const prevIndex = (currentChoiceIndex - 1 + choicesList.length) % choicesList.length;
      handleSelectChoice(currentQuestion.id, choicesList[prevIndex]);
    }
  };

  const executeSubmit = async () => {
    if (!session || isFinished) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const answersPayload = sortedQuestions
        .map((q) => ({
          question_id: q.id,
          selected_choice: answers[q.id] || "",
        }))
        .filter((a) => Boolean(a.selected_choice));

      await submitQuizMutation.mutateAsync({
        sessionId: session.id,
        answers: answersPayload,
      });

      try {
        sessionStorage.removeItem(`quiz_answers_${sessionId}`);
      } catch {
        // Ignore
      }
      refetch();
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        // Already finished -> just reload the session to show results
        try {
          sessionStorage.removeItem(`quiz_answers_${sessionId}`);
        } catch {
          // Ignore
        }
        notify.info("Quiz was already submitted. Viewing results...", "Quiz Completed");
        refetch();
      } else {
        const msg = formatApiErrorMessage(err);
        setError(msg);
        notify.error(msg, "Failed to Submit Quiz");
      }
    } finally {
      setIsSubmitting(false);
      setIsConfirmIncompleteOpen(false);
    }
  };

  const handleSubmitClick = () => {
    if (isAllAnswered) {
      executeSubmit();
    } else {
      setIsConfirmIncompleteOpen(true);
    }
  };

  const handleRetakeQuiz = async () => {
    if (!session?.deck) return;
    setIsRetaking(true);
    try {
      const newSession = await startDeckQuizMutation.mutateAsync({
        deckId: session.deck,
        questionCount: session.total_questions,
      });
      router.push(`/dashboard/quizzes/${newSession.id}`);
    } catch (err: unknown) {
      notify.error(formatApiErrorMessage(err), "Unable to Retake Quiz");
      setIsRetaking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-16">
        <div className="flex items-center justify-between pb-4 border-b border-line">
          <Skeleton className="h-6 w-32 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-48 w-full rounded-3xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-2xl" />
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
          <span>Back to Quizzes</span>
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

  const score = session.score ?? 0;
  const scorePercent =
    totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/quizzes"
          className="inline-flex items-center gap-1.5 text-xs font-display font-semibold text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Quizzes</span>
        </Link>

        {session.deck && (
          <Link
            href={`/dashboard/flashcards/${session.deck}`}
            className="inline-flex items-center gap-1.5 text-xs font-display font-semibold text-purple-700 hover:text-purple-900 transition-colors"
          >
            <BookOpen className="size-3.5" />
            <span>{session.deck_title ? `Deck: ${session.deck_title}` : "View Deck"}</span>
          </Link>
        )}
      </div>

      {/* Error alert if submission or operation failed */}
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

      {/* STATE A: Unfinished Quiz Runner (One Question at a Time) */}
      {!isFinished ? (
        <div className="rounded-3xl bg-surface border border-line p-6 sm:p-8 shadow-soft space-y-6">
          {/* Header & Progress Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-xs font-display font-bold">
                  <Zap className="size-3 text-amber-500" />
                  <span>Question {safeQuestionIndex + 1} of {sortedQuestions.length}</span>
                </span>
                <span className="text-xs text-muted font-display">
                  {answeredCount} of {sortedQuestions.length} answered
                </span>
              </div>

              {session.deck_title && (
                <span className="text-xs font-display text-muted truncate max-w-[160px] hidden sm:inline-block">
                  {session.deck_title}
                </span>
              )}
            </div>

            {/* Visual Progress Bar */}
            <div className="h-2 w-full rounded-full bg-canvas overflow-hidden border border-line/60">
              <div
                className="h-full bg-purple-600 transition-all duration-300 rounded-full"
                style={{
                  width: `${((safeQuestionIndex + 1) / Math.max(1, sortedQuestions.length)) * 100}%`,
                }}
              />
            </div>

            {/* Question Quick-Jump Dots */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {sortedQuestions.map((q, qIdx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = qIdx === safeQuestionIndex;

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(qIdx)}
                    aria-label={`Jump to question ${qIdx + 1}${isAnswered ? " (answered)" : ""}`}
                    className={`size-7 rounded-lg text-[0.6875rem] font-display font-bold transition-all flex items-center justify-center ${
                      isCurrent
                        ? "bg-night text-[#c8f560] shadow-sm scale-105"
                        : isAnswered
                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                        : "bg-canvas text-muted hover:text-ink border border-line"
                    }`}
                  >
                    {qIdx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Text */}
          {currentQuestion && (
            <div className="space-y-5 pt-2">
              <div className="p-5 rounded-2xl bg-canvas/40 border border-line">
                <p className="font-display font-bold text-base sm:text-lg text-ink leading-relaxed">
                  {currentQuestion.question_text}
                </p>
              </div>

              {/* Choices Radio Group (min 44px tap targets, arrow-key navigable) */}
              <div
                ref={choicesRef}
                role="radiogroup"
                aria-label={`Choices for question ${safeQuestionIndex + 1}`}
                className="space-y-3"
              >
                {currentQuestion.choices.map((choice, cIdx) => {
                  const isSelected = answers[currentQuestion.id] === choice;

                  return (
                    <button
                      key={cIdx}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={isSelected || (!answers[currentQuestion.id] && cIdx === 0) ? 0 : -1}
                      onClick={() => handleSelectChoice(currentQuestion.id, choice)}
                      onKeyDown={(e) =>
                        handleKeyDownChoice(e, cIdx, currentQuestion.choices)
                      }
                      className={`w-full text-left min-h-[48px] p-4 rounded-2xl border text-xs sm:text-sm font-body transition-all duration-150 flex items-center justify-between group active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                        isSelected
                          ? "bg-night text-[#c8f560] border-night font-semibold shadow-sm"
                          : "bg-surface hover:bg-mist hover:border-line-strong text-ink border-line"
                      }`}
                    >
                      <span className="flex-1 pr-3 leading-relaxed">{choice}</span>
                      <div
                        className={`size-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "border-[#c8f560] bg-[#c8f560] text-night"
                            : "border-muted/50 group-hover:border-ink"
                        }`}
                      >
                        {isSelected && <div className="size-2 rounded-full bg-night" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation Controls: Prev, Next, Submit */}
          <div className="pt-4 border-t border-line flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
              disabled={safeQuestionIndex === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-canvas hover:bg-mist text-ink text-xs font-display font-semibold transition-colors border border-line disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="size-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-2">
              {safeQuestionIndex < sortedQuestions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-night hover:bg-ink text-[#c8f560] text-xs font-display font-bold transition-all shadow-sm active:scale-95"
                >
                  <span>Next</span>
                  <ChevronRight className="size-4" />
                </button>
              ) : null}

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmitClick}
                disabled={isSubmitting}
                className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-display font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 ${
                  isAllAnswered
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-night hover:bg-ink text-[#c8f560]"
                }`}
              >
                <Zap className="size-3.5 fill-current" />
                <span>
                  {isSubmitting
                    ? "Submitting..."
                    : isAllAnswered
                    ? "Submit Quiz"
                    : "Submit anyway"}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* STATE B: Results Review View (Finished Sessions) */
        <div className="space-y-6">
          {/* Big Score & Performance Band */}
          <div className="rounded-3xl bg-surface border border-line p-6 sm:p-8 shadow-soft text-center space-y-5">
            <div className="size-16 rounded-3xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
              <Trophy className="size-8" />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-display uppercase tracking-widest text-muted font-bold">
                Quiz Results • {session.deck_title || "Study Drill"}
              </p>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-4xl sm:text-5xl font-display font-black text-ink tracking-tight">
                  {score} / {totalQuestions}
                </span>
                <span className="text-xl sm:text-2xl font-display font-bold text-muted">
                  ({scorePercent}%)
                </span>
              </div>
            </div>

            {/* Message Band: <50% "Keep going", 50-79% "Good progress", >=80% "Excellent" */}
            <div
              className={`p-4 rounded-2xl border text-xs text-center space-y-0.5 ${
                scorePercent >= 80
                  ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                  : scorePercent >= 50
                  ? "bg-sky-50 border-sky-300 text-sky-950"
                  : "bg-amber-50 border-amber-300 text-amber-950"
              }`}
            >
              <p className="font-display font-bold text-sm">
                {scorePercent >= 80
                  ? "Excellent"
                  : scorePercent >= 50
                  ? "Good progress"
                  : "Keep going"}
              </p>
              <p className="font-body opacity-90">
                {scorePercent >= 80
                  ? "Outstanding recall! You have mastered these key concepts."
                  : scorePercent >= 50
                  ? "Solid foundation! Review missed questions below to achieve full mastery."
                  : "Review the answers below and practice the flashcard deck again to reinforce memory."}
              </p>
            </div>

            {/* Results Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleRetakeQuiz}
                disabled={!session.deck || isRetaking}
                title={!session.deck ? "This deck was deleted" : "Retake this quiz drill"}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-night hover:bg-ink text-[#c8f560] text-xs font-display font-bold transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isRetaking ? (
                  <RotateCw className="size-3.5 animate-spin" />
                ) : (
                  <RotateCw className="size-3.5" />
                )}
                <span>Retake quiz</span>
              </button>

              {session.deck ? (
                <Link
                  href={`/dashboard/flashcards/${session.deck}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-canvas hover:bg-mist text-ink text-xs font-display font-semibold transition-colors border border-line"
                >
                  <BookOpen className="size-3.5 text-muted" />
                  <span>Back to deck</span>
                </Link>
              ) : (
                <Link
                  href="/dashboard/flashcards"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-canvas hover:bg-mist text-ink text-xs font-display font-semibold transition-colors border border-line"
                >
                  <BookOpen className="size-3.5 text-muted" />
                  <span>Back to decks</span>
                </Link>
              )}

              <Link
                href="/dashboard/quizzes"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-display font-semibold text-muted hover:text-ink transition-colors"
              >
                <span>Back to quizzes</span>
              </Link>
            </div>
          </div>

          {/* Question Breakdown Review */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-sm text-ink px-1">
              Question Breakdown ({sortedQuestions.length})
            </h3>

            <div className="space-y-4">
              {sortedQuestions.map((q, idx) => {
                const hasSelected = !!q.selected_choice;
                const isCorrect = q.is_correct === true;

                return (
                  <div
                    key={q.id}
                    className={`rounded-2xl bg-surface border p-5 shadow-soft space-y-4 ${
                      isCorrect
                        ? "border-emerald-200"
                        : hasSelected
                        ? "border-rose-200"
                        : "border-amber-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-display font-bold text-sm text-ink leading-relaxed flex-1">
                        <span className="text-muted mr-1.5">{idx + 1}.</span> {q.question_text}
                      </p>

                      <div className="shrink-0">
                        {isCorrect ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-display font-bold">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            <span>Correct</span>
                          </span>
                        ) : hasSelected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-display font-bold">
                            <XCircle className="size-3.5 text-rose-600" />
                            <span>Incorrect</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-display font-bold">
                            <HelpCircle className="size-3.5 text-amber-600" />
                            <span>Not answered</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Choices Review */}
                    <div className="space-y-2 pt-1">
                      {q.choices.map((choice, cIdx) => {
                        const isUserChoice = q.selected_choice === choice;
                        const isTheCorrectAnswer = q.correct_answer === choice;

                        return (
                          <div
                            key={cIdx}
                            className={`p-3 rounded-xl border text-xs font-body flex items-center justify-between ${
                              isTheCorrectAnswer
                                ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold shadow-xs"
                                : isUserChoice && !isCorrect
                                ? "bg-rose-50 border-rose-400 text-rose-950 shadow-xs"
                                : "bg-canvas/50 border-line/60 text-muted"
                            }`}
                          >
                            <span>{choice}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              {isUserChoice && !isCorrect && (
                                <span className="inline-flex items-center gap-1 text-[0.6875rem] font-display font-bold text-rose-700">
                                  <XCircle className="size-3.5 text-rose-600" />
                                  <span>Your choice</span>
                                </span>
                              )}
                              {isTheCorrectAnswer && (
                                <span className="inline-flex items-center gap-1 text-[0.6875rem] font-display font-bold text-emerald-800">
                                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                                  <span>{isUserChoice ? "Correct choice" : "Correct answer"}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Incomplete Submission Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmIncompleteOpen}
        onClose={() => setIsConfirmIncompleteOpen(false)}
        onConfirm={executeSubmit}
        title="Submit Incomplete Quiz?"
        description={`You have answered ${answeredCount} of ${sortedQuestions.length} questions. Any unanswered questions will be marked incorrect. Are you sure you want to submit anyway?`}
        confirmLabel="Submit Anyway"
        isDestructive={false}
        isLoading={isSubmitting}
      />
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
