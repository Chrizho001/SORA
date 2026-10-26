"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Brain,
  Zap,
  BookOpen,
  Trash2,
  AlertCircle,
  X,
  UploadCloud,
  CheckCircle2,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { DocumentItem, Deck } from "@/lib/dashboard-api";
import { MascotGuide } from "../MascotGuide";
import { FormattedSummary, stripMarkdown } from "../FormattedSummary";
import { Skeleton } from "@/components/ui/Skeleton";

interface DocumentsViewProps {
  documents?: DocumentItem[];
  decks?: Deck[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onUploadClick: () => void;
  onGenerateFlashcards: (docId: string) => void;
  onStartQuiz: (docId: string) => void;
  onDeleteDocument: (docId: string) => void;
  onRetryDocument?: (docId: string) => void;
}

export function DocumentsView({
  documents,
  decks,
  isLoading,
  isError,
  onRetry,
  onUploadClick,
  onGenerateFlashcards,
  onStartQuiz,
  onDeleteDocument,
  onRetryDocument,
}: DocumentsViewProps) {
  const [selectedSummaryDoc, setSelectedSummaryDoc] = useState<DocumentItem | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);

  useEffect(() => {
    const timer = setTimeout(() => setCurrentTime(Date.now()), 0);
    const interval = setInterval(() => setCurrentTime(Date.now()), 15000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 rounded-xl" />
            <Skeleton className="h-4 w-96 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 rounded-3xl" />
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
              PDF & Lecture Documents
            </h1>
            <p className="text-xs sm:text-sm text-muted font-body mt-0.5">
              Upload syllabi, lecture slides, diagrams, or textbook chapters to generate multimodal AI summaries and flashcards.
            </p>
          </div>
        </div>
        <div className="rounded-3xl bg-surface border border-rose-200 p-10 text-center space-y-4 shadow-soft">
          <AlertCircle className="size-10 text-rose-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-ink">Failed to load documents</h3>
            <p className="text-xs text-muted max-w-sm mx-auto font-body">
              An error occurred while communicating with the study server.
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

  const safeDocuments = documents ?? [];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
            PDF & Lecture Documents
          </h1>
          <p className="text-xs sm:text-sm text-muted font-body mt-0.5">
            Upload syllabi, lecture slides, diagrams, or textbook chapters to generate multimodal AI summaries and flashcards.
          </p>
        </div>

        <button
          type="button"
          onClick={onUploadClick}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#14161f] hover:bg-night text-[#c8f560] text-xs font-display font-bold transition-all shadow-md active:scale-95 self-start sm:self-auto"
        >
          <Plus className="size-4" />
          <span>Upload PDF</span>
        </button>
      </div>

      {/* Mascot Section Guide */}
      <MascotGuide
        section="documents"
        actionLabel="Upload First Lecture"
        onActionClick={onUploadClick}
      />

      {/* Document Library Grid */}
      {safeDocuments.length === 0 ? (
        <div className="rounded-3xl bg-surface border border-line p-12 text-center space-y-4 shadow-soft">
          <div className="size-16 rounded-3xl bg-canvas text-subtle mx-auto flex items-center justify-center">
            <UploadCloud className="size-8 text-muted" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-ink">Your Library is Empty</h3>
            <p className="text-xs text-muted max-w-sm mx-auto font-body">
              Drag and drop your first course PDF (slides, chapter readings, or exam notes) to unlock AI-powered summaries, flashcards, and drills.
            </p>
          </div>
          <button
            type="button"
            onClick={onUploadClick}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-night text-[#c8f560] text-xs font-display font-bold hover:bg-ink transition-transform active:scale-95 shadow-sm"
          >
            <Plus className="size-4" />
            <span>Upload Course Material</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {safeDocuments.map((doc) => {
            const isDone = doc.status === "DONE";
            const isProcessing = doc.status === "PROCESSING" || doc.status === "UPLOADED";
            const isFailed = doc.status === "FAILED";
            const isFlashcardsGenerating = doc.flashcard_generation_status === "GENERATING";
            const isFlashcardsFailed = doc.flashcard_generation_status === "FAILED";
            const linkedDeck = (decks ?? []).find((d) => d.document === doc.id);
            const hasFlashcards =
              doc.flashcard_generation_status === "DONE" ||
              (linkedDeck !== undefined && linkedDeck.card_count > 0);
            const now = currentTime || 0;
            const startTime = doc.processing_started_at
              ? new Date(doc.processing_started_at).getTime()
              : new Date(doc.created_at).getTime();
            const isStuck = isProcessing && now > 0 && now - startTime > 10 * 60 * 1000;

            return (
              <div
                key={doc.id}
                className={`rounded-3xl bg-surface border transition-all duration-300 p-5 shadow-soft flex flex-col justify-between hover:shadow-lift hover:-translate-y-0.5 ${
                  isFailed
                    ? "border-rose-200/90 bg-rose-50/10"
                    : isStuck
                    ? "border-amber-300/90 bg-amber-50/10"
                    : isProcessing
                    ? "border-sky-200/90"
                    : "border-line"
                }`}
              >
                <div>
                  {/* Top Bar: Icon, Badges, Delete */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div
                      className={`size-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                        isFailed
                          ? "bg-rose-50 border-rose-200 text-rose-600"
                          : isStuck
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : isProcessing
                          ? "bg-sky-50 border-sky-200 text-sky-600"
                          : "bg-emerald-50 border-emerald-200 text-emerald-600"
                      }`}
                    >
                      {isStuck ? (
                        <AlertCircle className="size-5 text-amber-600" />
                      ) : isProcessing ? (
                        <FileText className="size-5 animate-pulse" />
                      ) : isFailed ? (
                        <AlertCircle className="size-5" />
                      ) : (
                        <CheckCircle2 className="size-5" />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {isStuck ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-[0.6875rem] font-display font-semibold">
                          Taking longer than expected
                        </span>
                      ) : isProcessing ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-[0.6875rem] font-display font-semibold animate-pulse">
                          Processing PDF...
                        </span>
                      ) : null}
                      {isDone && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[0.6875rem] font-display font-semibold">
                          Summary Ready
                        </span>
                      )}
                      {isFailed && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[0.6875rem] font-display font-semibold">
                          Analysis Failed
                        </span>
                      )}
                      {linkedDeck ? (
                        <Link
                          href={`/dashboard/flashcards/${linkedDeck.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-[0.6875rem] font-display font-semibold transition-colors"
                          title="View flashcard deck"
                        >
                          <Brain className="size-3" />
                          <span>Deck ({linkedDeck.card_count})</span>
                        </Link>
                      ) : hasFlashcards ? (
                        <Link
                          href="/dashboard/flashcards"
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-[0.6875rem] font-display font-semibold transition-colors"
                        >
                          <Brain className="size-3" />
                          <span>Flashcards Deck</span>
                        </Link>
                      ) : null}
                      {isFlashcardsFailed && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[0.6875rem] font-display font-semibold">
                          Flashcards Issue
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => onDeleteDocument(doc.id)}
                        className="p-1 rounded-lg text-subtle hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
                        title="Delete document"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-display font-bold text-base text-ink line-clamp-1" title={doc.original_name}>
                    {doc.original_name}
                  </h3>

                  <p className="text-xs text-muted font-body mt-1">
                    {doc.page_count ? `${doc.page_count} pages` : "Lecture Document"} •{" "}
                    {(doc.size / (1024 * 1024)).toFixed(2)} MB •{" "}
                    {new Date(doc.created_at).toLocaleDateString()}
                  </p>

                  {/* Summary preview snippet if available */}
                  {doc.summary && (
                    <div className="mt-3 p-3 rounded-2xl bg-canvas/60 border border-line/60 text-xs font-body text-ink-2 line-clamp-3">
                      {stripMarkdown(doc.summary.content)}
                    </div>
                  )}

                  {/* Taking longer than expected message (FE-20) */}
                  {isStuck && (
                    <div className="mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-xs font-body text-amber-800 space-y-1">
                      <div className="font-display font-semibold flex items-center gap-1.5 text-amber-900">
                        <AlertCircle className="size-3.5 shrink-0 text-amber-600" />
                        <span>Taking longer than expected</span>
                      </div>
                      <p className="text-[0.6875rem] text-amber-700 leading-relaxed">
                        Document analysis has been running for more than 10 minutes. Click Retry to restart analysis.
                      </p>
                    </div>
                  )}

                  {/* Error explanation if summary failed */}
                  {isFailed && (
                    <div className="mt-3 p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-xs font-body text-rose-800 space-y-1">
                      <div className="font-display font-semibold flex items-center gap-1.5 text-rose-900">
                        <AlertCircle className="size-3.5 shrink-0 text-rose-600" />
                        <span>Processing Failed</span>
                      </div>
                      <p className="text-[0.6875rem] text-rose-700 leading-relaxed">
                        {doc.error_message || "The AI model encountered an issue reading this PDF. Please verify the document is not password-protected and click Retry."}
                      </p>
                    </div>
                  )}

                  {/* Warning explanation if flashcards failed */}
                  {isFlashcardsFailed && (
                    <div className="mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-xs font-body text-amber-800 space-y-1">
                      <div className="font-display font-semibold flex items-center gap-1.5 text-amber-900">
                        <AlertCircle className="size-3.5 shrink-0 text-amber-600" />
                        <span>Flashcard Generation Issue</span>
                      </div>
                      <p className="text-[0.6875rem] text-amber-700 leading-relaxed">
                        AI card generation encountered a temporary limit or timeout. Click &quot;Retry Flashcards&quot; below to generate them now.
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-line flex flex-wrap items-center gap-2 mt-4">
                  {(isFailed || isStuck) && onRetryDocument && (
                    <button
                      type="button"
                      onClick={() => onRetryDocument(doc.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-night hover:bg-ink text-[#c8f560] text-xs font-display font-bold transition-all hover:scale-105 active:scale-95 shadow-xs"
                    >
                      <RotateCw className="size-3.5" />
                      <span>{isStuck ? "Retry Analysis" : "Retry AI Analysis"}</span>
                    </button>
                  )}

                  {isFailed && (
                    <button
                      type="button"
                      onClick={() => onDeleteDocument(doc.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-display font-semibold border border-rose-200 transition-all hover:scale-105 active:scale-95"
                    >
                      <Trash2 className="size-3.5 text-rose-600" />
                      <span>Remove</span>
                    </button>
                  )}

                  {isDone && (
                    <button
                      type="button"
                      onClick={() => setSelectedSummaryDoc(doc)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas hover:bg-mist text-ink text-xs font-display font-semibold border border-line hover:scale-105 active:scale-95 transition-all"
                    >
                      <BookOpen className="size-3.5 text-muted" />
                      <span>Read Summary</span>
                    </button>
                  )}

                  {linkedDeck ? (
                    <Link
                      href={`/dashboard/flashcards/${linkedDeck.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-display font-semibold hover:scale-105 active:scale-95 transition-all"
                    >
                      <Brain className="size-3.5 text-purple-600" />
                      <span>Flashcards ({linkedDeck.card_count})</span>
                    </Link>
                  ) : isDone && (
                    <button
                      type="button"
                      onClick={() => onGenerateFlashcards(doc.id)}
                      disabled={isFlashcardsGenerating}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-display font-semibold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 ${
                        isFlashcardsFailed
                          ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300"
                          : "bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200"
                      }`}
                    >
                      {isFlashcardsFailed ? (
                        <RotateCw className="size-3.5 text-amber-700" />
                      ) : (
                        <Brain className="size-3.5 text-purple-600" />
                      )}
                      <span>
                        {isFlashcardsGenerating
                          ? "Building Decks..."
                          : isFlashcardsFailed
                          ? "Retry Flashcards"
                          : "Make Flashcards"}
                      </span>
                    </button>
                  )}

                  {hasFlashcards && (
                    <button
                      type="button"
                      onClick={() => onStartQuiz(doc.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-display font-semibold hover:scale-105 active:scale-95 transition-all"
                    >
                      <Zap className="size-3.5 text-amber-600" />
                      <span>Speed Quiz</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Reader Modal */}
      {selectedSummaryDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl bg-surface border border-line p-6 shadow-2xl text-ink space-y-4 max-h-[85vh] flex flex-col justify-between">
            <div className="flex items-start justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <BookOpen className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-base text-ink truncate">
                    {selectedSummaryDoc.original_name}
                  </h3>
                  <p className="text-xs text-muted font-body">
                    AI Summary • {selectedSummaryDoc.summary?.ai_model_used || "SORA AI Engine"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSummaryDoc(null)}
                className="size-8 rounded-full text-muted hover:bg-mist hover:text-ink flex items-center justify-center transition-colors shrink-0"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="overflow-y-auto pr-2 max-h-[60vh]">
              {selectedSummaryDoc.summary?.content ? (
                <FormattedSummary content={selectedSummaryDoc.summary.content} />
              ) : (
                <div className="p-8 text-center text-muted space-y-2">
                  <AlertCircle className="size-8 text-amber-500 mx-auto" />
                  <p className="font-display font-semibold text-ink">Summary Not Available</p>
                  <p className="text-xs">This document does not have a generated summary yet.</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-line flex items-center justify-between">
              <span className="text-[0.6875rem] text-muted font-body flex items-center gap-1">
                <Sparkles className="size-3 text-amber-500" />
                <span>Multimodal AI Academic Analysis</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedSummaryDoc(null)}
                className="px-4 py-2 rounded-xl bg-night text-[#c8f560] text-xs font-display font-bold hover:bg-ink transition-transform active:scale-95"
              >
                Done Reading
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
