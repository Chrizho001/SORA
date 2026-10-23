"use client";

import React from "react";
import {
  BookOpen,
  Brain,
  FileText,
  Plus,
  Zap,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { DocumentItem } from "@/lib/dashboard-api";

interface ActiveStudyMaterialsProps {
  documents: DocumentItem[];
  onUploadClick: () => void;
  onGenerateFlashcards: (docId: string) => void;
  onStartQuiz: (docId: string) => void;
  onViewDocument: (doc: DocumentItem) => void;
  className?: string;
}

export function ActiveStudyMaterials({
  documents,
  onUploadClick,
  onGenerateFlashcards,
  onStartQuiz,
  onViewDocument,
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
              const isProcessing = doc.status === "PROCESSING" || doc.status === "UPLOADED";
              const isFailed = doc.status === "FAILED";

              // Progress percentage calculation
              let progressPercent = 20;
              if (isProcessing) progressPercent = 40;
              if (isSummaryDone && !isFlashcardsDone) progressPercent = 70;
              if (isSummaryDone && isFlashcardsDone) progressPercent = 100;

              return (
                <div
                  key={doc.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-canvas/40 hover:bg-canvas/70 border border-line transition-all duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Document Icon Avatar */}
                    <div className="size-10 rounded-xl bg-surface border border-line flex items-center justify-center text-ink shrink-0 shadow-xs">
                      {isProcessing ? (
                        <Loader2 className="size-5 text-sky-600 animate-spin" />
                      ) : isFailed ? (
                        <AlertCircle className="size-5 text-rose-600" />
                      ) : (
                        <BookOpen className="size-5 text-emerald-600" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onViewDocument(doc)}
                          className="text-xs sm:text-sm font-display font-bold text-ink hover:text-emerald-700 transition-colors truncate text-left"
                        >
                          {doc.original_name}
                        </button>

                        {/* Status Chip */}
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
                      </div>

                      <div className="flex items-center gap-3 text-[0.6875rem] text-muted font-body mt-0.5">
                        <span>
                          {doc.page_count ? `${doc.page_count} pages` : "Lecture Document"}
                        </span>
                        <span>•</span>
                        <span>{(doc.size / (1024 * 1024)).toFixed(1)} MB</span>
                        <span>•</span>
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Progress */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/60">
                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5">
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
                          className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-display font-semibold border border-purple-200 shadow-2xs transition-colors flex items-center gap-1"
                          title="Generate smart flashcards"
                        >
                          <Brain className="size-3 text-purple-600" />
                          <span>Flashcards</span>
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

                    {/* Circular Progress Ring */}
                    <div className="flex items-center gap-2">
                      <div className="relative size-9 flex items-center justify-center">
                        <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-line"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className={
                              progressPercent === 100
                                ? "text-emerald-500"
                                : progressPercent > 50
                                ? "text-[#c8f560]"
                                : "text-sky-500"
                            }
                            strokeDasharray={`${progressPercent}, 100`}
                            strokeLinecap="round"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <span className="absolute text-[0.625rem] font-display font-bold text-ink">
                          {progressPercent}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs font-body text-muted">
        <span>Click on any document to view its AI summary & study tools.</span>
        <span className="text-emerald-700 font-display font-semibold flex items-center gap-1">
          <Sparkles className="size-3" />
          <span>Celery Powered</span>
        </span>
      </div>
    </div>
  );
}
