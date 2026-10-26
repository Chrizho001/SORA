"use client";

import React from "react";
import {
  BookOpen,
  Brain,
  FileText,
  Plus,
  Zap,
  Sparkles,
  AlertCircle,
  RotateCw,
} from "lucide-react";
import { DocumentItem } from "@/lib/dashboard-api";

interface ActiveStudyMaterialsProps {
  documents: DocumentItem[];
  onUploadClick: () => void;
  onGenerateFlashcards: (docId: string) => void;
  onStartQuiz: (docId: string) => void;
  onViewDocument: (doc?: DocumentItem) => void;
  onRetryDocument?: (docId: string) => void;
  className?: string;
}

export function ActiveStudyMaterials({
  documents,
  onUploadClick,
  onGenerateFlashcards,
  onStartQuiz,
  onViewDocument,
  onRetryDocument,
  className = "",
}: ActiveStudyMaterialsProps) {
  return (
    <div
      className={`rounded-3xl bg-surface border border-line p-5 sm:p-6 shadow-soft flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-ink text-base sm:text-lg">
              Active Study Materials
            </h3>
            <span className="inline-flex items-center justify-center size-5 rounded-full bg-mist text-[0.6875rem] font-display font-bold text-ink">
              {documents.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onUploadClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#c8f560] hover:bg-[#bbf048] text-[#141413] text-xs font-display font-bold transition-transform active:scale-95 shadow-sm"
          >
            <Plus className="size-3.5" />
            <span>Upload PDF</span>
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="py-10 text-center space-y-3">
            <div className="size-12 rounded-2xl bg-canvas mx-auto flex items-center justify-center text-subtle">
              <FileText className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-display font-semibold text-ink">No study materials yet</p>
              <p className="text-xs text-muted max-w-xs mx-auto font-body">
                Upload your lecture notes, slides, or syllabus PDF to generate instant AI summaries, flashcards, and quizzes.
              </p>
            </div>
            <button
              type="button"
              onClick={onUploadClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-night text-[#c8f560] text-xs font-display font-bold hover:bg-ink transition-transform active:scale-95"
            >
              <Plus className="size-4" />
              <span>Upload Your First PDF</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.slice(0, 4).map((doc) => {
              const isSummaryDone = doc.status === "DONE";
              const isFlashcardsDone = doc.flashcard_generation_status === "DONE";
              const isFlashcardsGenerating = doc.flashcard_generation_status === "GENERATING";
              const isFlashcardsFailed = doc.flashcard_generation_status === "FAILED";
              const isProcessing = doc.status === "PROCESSING" || doc.status === "UPLOADED";
              const isFailed = doc.status === "FAILED";

              // Progress percentage calculation
              let progressPercent = 20;
              if (isProcessing) progressPercent = 40;
              if (isSummaryDone && !isFlashcardsDone) progressPercent = 70;
              if (isSummaryDone && isFlashcardsDone) progressPercent = 100;
              if (isFailed) progressPercent = 0;

              return (
                <div
                  key={doc.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-canvas/40 hover:bg-canvas/70 border border-line transition-all duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Document Icon Avatar */}
                    <div
                      className={`size-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                        isFailed
                          ? "bg-rose-50 border-rose-200"
                          : isProcessing
                          ? "bg-sky-50 border-sky-200"
                          : "bg-emerald-50 border-emerald-200"
                      }`}
                    >
                      {isProcessing ? (
                        <FileText className="size-5 text-sky-600 animate-pulse" />
                      ) : isFailed ? (
                        <AlertCircle className="size-5 text-rose-600" />
                      ) : (
                        <BookOpen className="size-5 text-emerald-600" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onViewDocument(doc)}
                          className="text-xs sm:text-sm font-display font-bold text-ink hover:text-emerald-700 transition-colors truncate text-left"
                        >
                          {doc.original_name}
                        </button>

                        {/* Status Chips */}
                        {isProcessing && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[0.625rem] font-display font-semibold animate-pulse">
                            Processing PDF...
                          </span>
                        )}
                        {isFlashcardsGenerating && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[0.625rem] font-display font-semibold animate-pulse">
                            AI Flashcards...
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[0.625rem] font-display font-semibold">
                            Analysis Failed
                          </span>
                        )}
                        {isFlashcardsFailed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[0.625rem] font-display font-semibold">
                            Flashcards Issue
                          </span>
                        )}
                      </div>

                      {isFailed ? (
                        <p className="text-[0.6875rem] text-rose-600 font-body mt-0.5 line-clamp-1">
                          {doc.error_message || "The AI model encountered an issue reading this PDF."}
                        </p>
                      ) : (
                        <div className="flex items-center gap-3 text-[0.6875rem] text-muted font-body mt-0.5">
                          <span>
                            {doc.page_count ? `${doc.page_count} pages` : "Lecture Document"}
                          </span>
                          <span>•</span>
                          <span>{(doc.size / (1024 * 1024)).toFixed(1)} MB</span>
                          <span>•</span>
                          <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Progress */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/60">
                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isFailed && onRetryDocument && (
                        <button
                          type="button"
                          onClick={() => onRetryDocument(doc.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-display font-semibold border border-rose-200 shadow-2xs transition-all hover:scale-105 active:scale-95 flex items-center gap-1"
                          title="Retry AI analysis"
                        >
                          <RotateCw className="size-3 text-rose-600" />
                          <span>Retry</span>
                        </button>
                      )}

                      {isSummaryDone && (
                        <button
                          type="button"
                          onClick={() => onViewDocument(doc)}
                          className="px-2.5 py-1 rounded-lg bg-surface hover:bg-mist text-ink text-xs font-display font-medium border border-line shadow-2xs transition-colors"
                          title="Read summary"
                        >
                          Summary
                        </button>
                      )}

                      {isSummaryDone && !isFlashcardsDone && !isFlashcardsGenerating && (
                        <button
                          type="button"
                          onClick={() => onGenerateFlashcards(doc.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-display font-semibold shadow-2xs transition-colors flex items-center gap-1 ${
                            isFlashcardsFailed
                              ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200"
                          }`}
                          title={isFlashcardsFailed ? "Retry generating flashcards" : "Generate smart flashcards"}
                        >
                          {isFlashcardsFailed ? (
                            <RotateCw className="size-3 text-amber-700" />
                          ) : (
                            <Brain className="size-3 text-purple-600" />
                          )}
                          <span>{isFlashcardsFailed ? "Retry Cards" : "Flashcards"}</span>
                        </button>
                      )}

                      {isFlashcardsDone && (
                        <button
                          type="button"
                          onClick={() => onStartQuiz(doc.id)}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-display font-semibold border border-amber-200 shadow-2xs transition-colors flex items-center gap-1"
                          title="Start speed quiz"
                        >
                          <Zap className="size-3 text-amber-600" />
                          <span>Quiz</span>
                        </button>
                      )}
                    </div>

                    {/* Progress Indicator */}
                    <div className="w-16 hidden md:block">
                      <div className="flex items-center justify-between text-[0.625rem] font-display text-muted mb-1">
                        <span>Progress</span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-mist overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isFailed
                              ? "bg-rose-500"
                              : progressPercent === 100
                              ? "bg-emerald-500"
                              : "bg-[#c8f560]"
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Banner */}
      <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs font-body text-muted">
        <span className="flex items-center gap-1 text-[0.6875rem]">
          <Sparkles className="size-3 text-amber-500" />
          <span>Multimodal AI Vision & Flashcard Engine Active</span>
        </span>
        <button
          type="button"
          onClick={() => onViewDocument(documents[0])}
          className="font-display font-semibold text-ink hover:underline text-[0.6875rem]"
        >
          View Library →
        </button>
      </div>
    </div>
  );
}
