"use client";

import React, { useState } from "react";
import {
  Zap,
  Play,
  CheckCircle2,
  XCircle,
  Trophy,
  BookOpen,
} from "lucide-react";
import { DocumentItem, QuizSession } from "@/lib/dashboard-api";
import { MascotGuide } from "../MascotGuide";

interface QuizzesViewProps {
  documents: DocumentItem[];
  quizSessions: QuizSession[];
  onStartQuiz: (docId: string) => Promise<QuizSession>;
  onSubmitQuiz: (
    sessionId: string,
    answers: { question_id: string; selected_choice: string }[]
  ) => Promise<QuizSession>;
  onNavigateDocuments: () => void;
}

export function QuizzesView({
  documents,
  quizSessions,
  onStartQuiz,
  onSubmitQuiz,
  onNavigateDocuments,
}: QuizzesViewProps) {
  const [activeSession, setActiveSession] = useState<QuizSession | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const handleStartNewQuiz = async (docId: string) => {
    setIsStarting(true);
    try {
      const session = await onStartQuiz(docId);
      setActiveSession(session);
      setSelectedAnswers({});
    } finally {
      setIsStarting(false);
    }
  };

  const handleSelectChoice = (questionId: string, choice: string) => {
    if (activeSession?.finished_at) return; // Locked once finished
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: choice,
    }));
  };

  const handleSubmit = async () => {
    if (!activeSession) return;
    setIsSubmitting(true);
    try {
      const answersPayload = Object.entries(selectedAnswers).map(([qid, choice]) => ({
        question_id: qid,
        selected_choice: choice,
      }));
      const updatedSession = await onSubmitQuiz(activeSession.id, answersPayload);
      setActiveSession(updatedSession);
    } finally {
      setIsSubmitting(false);
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
          const readyDoc = documents.find((d) => d.status === "DONE");
          if (readyDoc) handleStartNewQuiz(readyDoc.id);
        }}
      />

      {/* Active Quiz Runner if a quiz is in progress */}
      {activeSession ? (
        <div className="max-w-2xl mx-auto rounded-3xl bg-surface border border-line p-6 sm:p-8 shadow-soft space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-line">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Zap className="size-4.5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-ink">
                  {activeSession.finished_at ? "Quiz Complete!" : "Speed Quiz in Progress"}
                </h3>
                <p className="text-xs text-muted font-body">
                  {activeSession.questions.length} questions • Answer all to submit
                </p>
              </div>
            </div>

            {activeSession.finished_at && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-display font-bold">
                <Trophy className="size-3.5 text-emerald-600" />
                <span>
                  Score: {activeSession.score} / {activeSession.total_questions}
                </span>
              </div>
            )}
          </div>

          {/* Question Cards */}
          <div className="space-y-6">
            {activeSession.questions.map((q, idx) => {
              const selected = selectedAnswers[q.id];
              const isFinished = !!activeSession.finished_at;

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

          {/* Submit Action */}
          <div className="pt-4 border-t border-line flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveSession(null)}
              className="text-xs font-display text-muted hover:text-ink"
            >
              ← Back to Quiz List
            </button>

            {!activeSession.finished_at ? (
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
                onClick={() => setActiveSession(null)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-display font-bold shadow-md transition-transform active:scale-95"
              >
                Done
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Launch & History View */
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

            {documents.filter((d) => d.status === "DONE").length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <BookOpen className="size-8 text-subtle mx-auto" />
                <p className="text-xs font-display font-medium text-ink">No ready documents found</p>
                <p className="text-[0.6875rem] text-muted max-w-xs mx-auto">
                  Upload a PDF document first so SORA can extract multiple-choice questions.
                </p>
                <button
                  type="button"
                  onClick={onNavigateDocuments}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-night text-[#c8f560] text-xs font-display font-semibold"
                >
                  Go to Documents
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {documents
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

            {quizSessions.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted font-body">
                No past quiz sessions yet. Start your first drill above!
              </div>
            ) : (
              <div className="space-y-2.5">
                {quizSessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="p-3 rounded-2xl bg-canvas/40 border border-line flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-display font-bold text-ink">
                        Quiz • {new Date(session.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-[0.6875rem] text-muted font-body">
                        {session.total_questions} Questions
                      </p>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-display font-bold">
                      {session.score ?? 0} / {session.total_questions}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
