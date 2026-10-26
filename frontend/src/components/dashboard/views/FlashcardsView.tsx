"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Brain,
  Plus,
  RotateCw,
  AlertCircle,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Deck, DocumentItem } from "@/lib/dashboard-api";
import { Dialog } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatApiErrorMessage } from "@/lib/axios-client";

interface FlashcardsViewProps {
  decks?: Deck[];
  documents?: DocumentItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onCreateDeck: (payload: {
    title: string;
    description?: string;
    document?: string | null;
  }) => Promise<Deck>;
}

export function FlashcardsView({
  decks,
  documents,
  isLoading,
  isError,
  onRetry,
  onCreateDeck,
}: FlashcardsViewProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedDocId("");
    setTitleError(null);
    setIsSubmitting(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleCloseCreate = () => {
    if (!isSubmitting) {
      setIsCreateOpen(false);
      resetForm();
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (!trimmedTitle || trimmedTitle.length > 120) {
      setTitleError("Title is required and must be between 1 and 120 characters.");
      return;
    }
    if (trimmedDesc.length > 1000) {
      return;
    }

    setTitleError(null);
    setIsSubmitting(true);

    try {
      await onCreateDeck({
        title: trimmedTitle,
        description: trimmedDesc || undefined,
        document: selectedDocId ? selectedDocId : null,
      });
      setIsCreateOpen(false);
      resetForm();
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      if (
        errorData?.code === "deck_title_taken" ||
        (Array.isArray(errorData?.title) &&
          errorData.title.some((msg: unknown) =>
            typeof msg === "string" && msg.toLowerCase().includes("already exists")
          ))
      ) {
        setTitleError("A deck with this title already exists.");
      } else {
        setTitleError(formatApiErrorMessage(err));
      }
    } finally {
      setIsSubmitting(false);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-3xl" />
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
              Flashcard Decks
            </h1>
            <p className="text-xs sm:text-sm text-muted font-body mt-0.5">
              Organise and study your active recall flashcards by deck.
            </p>
          </div>
        </div>
        <div className="rounded-3xl bg-surface border border-rose-200 p-10 text-center space-y-4 shadow-soft">
          <AlertCircle className="size-10 text-rose-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-ink">Failed to load flashcard decks</h3>
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

  const safeDecks = decks ?? [];
  const safeDocuments = (documents ?? []).filter((d) => d.status === "DONE");

  const isFormValid =
    title.trim().length >= 1 &&
    title.trim().length <= 120 &&
    description.trim().length <= 1000 &&
    !isSubmitting;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
            Flashcard Decks
          </h1>
          <p className="text-xs sm:text-sm text-muted font-body mt-0.5">
            Organise and study your active recall flashcards by deck.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#14161f] hover:bg-night text-[#c8f560] text-xs font-display font-bold transition-all shadow-md active:scale-95 self-start sm:self-auto"
        >
          <Plus className="size-4" />
          <span>New Deck</span>
        </button>
      </div>

      {/* Main Deck List Grid or Empty State */}
      {safeDecks.length === 0 ? (
        <div className="rounded-3xl bg-surface border border-line p-12 text-center space-y-4 shadow-soft">
          <div className="size-16 rounded-3xl bg-purple-50 text-purple-600 mx-auto flex items-center justify-center shadow-xs">
            <Brain className="size-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-ink">Create your first deck</h3>
            <p className="text-xs text-muted max-w-sm mx-auto font-body">
              Create a deck to organise your study flashcards manually or generate them automatically with AI from your lecture notes.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-night text-[#c8f560] text-xs font-display font-bold hover:bg-ink transition-transform active:scale-95 shadow-sm"
          >
            <Plus className="size-4" />
            <span>Create Deck</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {safeDecks.map((deck) => {
            const hasDocument = !!deck.document || !!deck.document_name;
            const updatedDate = new Date(deck.updated_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <Link
                key={deck.id}
                href={`/dashboard/flashcards/${deck.id}`}
                className="group rounded-3xl bg-surface border border-line hover:border-purple-300 p-5 shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="size-11 rounded-2xl bg-purple-50 border border-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:bg-purple-100 transition-colors">
                      <Layers className="size-5" />
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {hasDocument && (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-canvas border border-line text-muted text-[0.6875rem] font-display font-semibold max-w-[140px] truncate"
                          title={deck.document_name || "Linked PDF"}
                        >
                          <FileText className="size-3 shrink-0 text-muted" />
                          <span className="truncate">from {deck.document_name || "PDF"}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[0.6875rem] font-display font-semibold">
                        {deck.card_count} {deck.card_count === 1 ? "card" : "cards"}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-display font-bold text-base text-ink line-clamp-1 group-hover:text-purple-900 transition-colors">
                    {deck.title}
                  </h3>

                  {deck.description ? (
                    <p className="text-xs text-muted font-body mt-1 line-clamp-2">
                      {deck.description}
                    </p>
                  ) : (
                    <p className="text-xs text-muted/60 font-body mt-1 italic">
                      No description provided
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-line flex items-center justify-between mt-4 text-xs font-display text-muted">
                  <span className="inline-flex items-center gap-1.5 text-[0.6875rem]">
                    <Calendar className="size-3 text-muted/80" />
                    <span>Updated {updatedDate}</span>
                  </span>

                  <span className="inline-flex items-center gap-1 text-purple-700 font-semibold group-hover:translate-x-0.5 transition-transform text-xs">
                    <span>Study</span>
                    <ArrowRight className="size-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* New Deck Dialog */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={handleCloseCreate}
        title="Create New Deck"
        description="Organise flashcards by topic, course subject, or linked lecture PDF."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="deck-title" className="text-xs font-display font-semibold text-ink">
                Title <span className="text-rose-500">*</span>
              </label>
              <span className="text-[0.6875rem] text-muted font-display">
                {title.length}/120
              </span>
            </div>
            <input
              id="deck-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError(null);
              }}
              placeholder="e.g. Intro to Microeconomics"
              maxLength={120}
              required
              className={`w-full h-10 px-3.5 rounded-2xl bg-canvas border text-xs font-body text-ink placeholder:text-subtle focus:outline-none focus:ring-2 ${
                titleError
                  ? "border-rose-400 focus:ring-rose-400"
                  : "border-line focus:ring-ink"
              }`}
            />
            {titleError && (
              <p className="text-[0.6875rem] text-rose-600 font-body mt-1 flex items-center gap-1">
                <AlertCircle className="size-3 shrink-0" />
                <span>{titleError}</span>
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="deck-desc" className="text-xs font-display font-semibold text-ink">
                Description (optional)
              </label>
              <span className="text-[0.6875rem] text-muted font-display">
                {description.length}/1000
              </span>
            </div>
            <textarea
              id="deck-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Chapter 1-4 definitions, formulas, and market equilibrium..."
              maxLength={1000}
              rows={3}
              className="w-full p-3 rounded-2xl bg-canvas border border-line text-xs font-body text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-ink resize-none"
            />
          </div>

          <div>
            <label htmlFor="deck-pdf" className="text-xs font-display font-semibold text-ink block mb-1">
              Link a PDF (optional)
            </label>
            <select
              id="deck-pdf"
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full h-10 px-3.5 rounded-2xl bg-canvas border border-line text-xs font-display text-ink focus:outline-none focus:ring-2 focus:ring-ink"
            >
              <option value="">None (Empty deck)</option>
              {safeDocuments.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.original_name} {doc.page_count ? `(${doc.page_count} pages)` : ""}
                </option>
              ))}
            </select>
            <p className="text-[0.6875rem] text-muted font-body mt-1">
              Linking a document enables SORA AI flashcard generation for this deck.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
            <button
              type="button"
              onClick={handleCloseCreate}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-canvas hover:bg-mist text-ink text-xs font-display font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-night hover:bg-ink text-[#c8f560] text-xs font-display font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="size-3.5" />
              <span>{isSubmitting ? "Creating..." : "Create Deck"}</span>
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
