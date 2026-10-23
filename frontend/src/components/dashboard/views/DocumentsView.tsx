"use client";

import React, { useState } from "react";
import {
  FileText,
  Plus,
  Brain,
  Zap,
  Trash2,
  BookOpen,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
} from "lucide-react";
import { DocumentItem } from "@/lib/dashboard-api";
import { MascotGuide } from "../MascotGuide";

interface DocumentsViewProps {
  documents: DocumentItem[];
  onUploadClick: () => void;
  onGenerateFlashcards: (docId: string) => void;
  onStartQuiz: (docId: string) => void;
  onDeleteDocument: (docId: string) => void;
}

export function DocumentsView({
  documents,
  onUploadClick,
  onGenerateFlashcards,
  onStartQuiz,
  onDeleteDocument,
}: DocumentsViewProps) {
  const [selectedSummaryDoc, setSelectedSummaryDoc] = useState<DocumentItem | null>(null);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
            PDF & Lecture Documents
          </h1>
          <p className="text-xs sm:text-sm text-muted font-body mt-0.5">
            Upload syllabi, lecture slides, or textbook chapters to generate summaries and flashcards.
          </p>
        </div>

        <button
          type="button"
          onClick={onUploadClick}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#14161f] hover:bg-night text-[#c8f560] text-xs font-display font-bold transition-all shadow-md active:scale-95 self-start sm:self-auto"
        >
          <Plus className="size-4" />
          <span>Upload New PDF</span>
        </button>
      </div>

      {/* Mascot Section Guide */}
      <MascotGuide
        section="documents"
        onActionClick={onUploadClick}
        actionLabel="+ Upload PDF"
      />

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <div className="rounded-3xl bg-surface border border-line p-12 text-center space-y-4 shadow-soft">
          <div className="size-16 rounded-3xl bg-canvas mx-auto flex items-center justify-center text-subtle">
            <FileText className="size-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-ink">
              No documents uploaded yet
            </h3>
            <p className="text-xs text-muted max-w-sm mx-auto font-body">
              Upload your first PDF lecture (up to 10MB). SORA will extract chapter summaries, key formulas, and build flashcard decks.
            </p>
          </div>
          <button
            type="button"
            onClick={onUploadClick}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-night text-[#c8f560] text-xs font-display font-bold hover:bg-ink transition-transform active:scale-95 shadow-sm"
          >
            <Plus className="size-4" />
            <span>Upload Lecture PDF</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => {
            const isDone = doc.status === "DONE";
            const isProcessing = doc.status === "PROCESSING" || doc.status === "UPLOADED";
            const isFailed = doc.status === "FAILED";
            const hasFlashcards = doc.flashcard_generation_status === "DONE";
            const isFlashcardsGenerating = doc.flashcard_generation_status === "GENERATING";

            return (
              <div
                key={doc.id}
                className="rounded-3xl bg-surface border border-line p-5 shadow-soft hover:shadow-lift transition-all duration-300 flex flex-col justify-between space-y-4"
              >
                {/* Top Row: Icon & Status */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="size-11 rounded-2xl bg-[#ffedd5] text-[#ea580c] flex items-center justify-center shadow-xs shrink-0">
                      <FileText className="size-5.5" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isProcessing && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[0.6875rem] font-display font-semibold animate-pulse">
                          <Loader2 className="size-3 animate-spin" />
                          <span>Processing...</span>
                        </span>
                      )}
                      {isDone && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[0.6875rem] font-display font-semibold">
                          <CheckCircle2 className="size-3" />
                          <span>Ready</span>
                        </span>
                      )}
                      {isFailed && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[0.6875rem] font-display font-semibold">
                          <AlertCircle className="size-3" />
                          <span>Failed</span>
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => onDeleteDocument(doc.id)}
                        className="p-1 rounded-lg text-subtle hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
                      {doc.summary.content}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-line flex flex-wrap items-center gap-2">
                  {isDone && (
                    <button
                      type="button"
                      onClick={() => setSelectedSummaryDoc(doc)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas hover:bg-mist text-ink text-xs font-display font-semibold border border-line transition-colors"
                    >
                      <BookOpen className="size-3.5 text-muted" />
                      <span>Read Summary</span>
                    </button>
                  )}

                  {isDone && !hasFlashcards && (
                    <button
                      type="button"
                      onClick={() => onGenerateFlashcards(doc.id)}
                      disabled={isFlashcardsGenerating}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-display font-semibold transition-colors disabled:opacity-50"
                    >
                      <Brain className="size-3.5 text-purple-600" />
                      <span>{isFlashcardsGenerating ? "Building Decks..." : "Make Flashcards"}</span>
                    </button>
                  )}

                  {hasFlashcards && (
                    <button
                      type="button"
                      onClick={() => onStartQuiz(doc.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-display font-semibold transition-colors"
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
      {selectedSummaryDoc && selectedSummaryDoc.summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl bg-surface border border-line p-6 shadow-2xl text-ink space-y-4 max-h-[85vh] flex flex-col justify-between">
            <div className="flex items-start justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-[#c8f560] text-[#141413] flex items-center justify-center font-bold">
                  <BookOpen className="size-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-ink truncate max-w-md">
                    {selectedSummaryDoc.original_name}
                  </h3>
                  <p className="text-xs text-muted font-body">
                    AI Summary Generated via {selectedSummaryDoc.summary.ai_model_used}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSummaryDoc(null)}
                className="size-8 rounded-full text-muted hover:bg-mist hover:text-ink flex items-center justify-center"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 text-sm font-body leading-relaxed text-ink-2 whitespace-pre-line">
              {selectedSummaryDoc.summary.content}
            </div>

            <div className="pt-3 border-t border-line flex items-center justify-between">
              <span className="text-xs text-muted flex items-center gap-1">
                <Sparkles className="size-3 text-amber-500" />
                <span>Extracted by SORA Core</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedSummaryDoc(null)}
                className="px-4 py-2 rounded-xl bg-night text-[#c8f560] text-xs font-display font-semibold hover:bg-ink transition-colors"
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
