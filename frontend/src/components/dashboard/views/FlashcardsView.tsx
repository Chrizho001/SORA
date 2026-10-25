"use client";

import React, { useState } from "react";
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Sparkles,
  Shuffle,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import { DocumentItem, FlashcardItem } from "@/lib/dashboard-api";
import { MascotGuide } from "../MascotGuide";
import { Skeleton } from "@/components/ui/Skeleton";

interface FlashcardsViewProps {
  documents?: DocumentItem[];
  flashcards?: FlashcardItem[];
  selectedDocId?: string;
  onSelectDocId?: (docId: string) => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onGenerateFlashcards: (docId: string) => void;
  onNavigateDocuments: () => void;
}

export function FlashcardsView({
  documents,
  flashcards,
  selectedDocId,
  onSelectDocId,
  isLoading,
  isError,
  onRetry,
  onGenerateFlashcards,
  onNavigateDocuments,
}: FlashcardsViewProps) {
  const [localSelectedDocId, setLocalSelectedDocId] = useState<string>("all");
  const effectiveDocId = selectedDocId ?? localSelectedDocId;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 rounded-xl" />
            <Skeleton className="h-4 w-96 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-44 rounded-full" />
        </div>
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
              Smart Flashcards & Active Recall
            </h1>
            <p className="text-xs sm:text-sm text-muted font-body mt-0.5">
              Scientific spaced repetition cards generated directly from your lecture documents.
            </p>
          </div>
        </div>
        <div className="rounded-3xl bg-surface border border-rose-200 p-10 text-center space-y-4 shadow-soft">
          <AlertCircle className="size-10 text-rose-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-ink">Failed to load flashcards</h3>
            <p className="text-xs text-muted max-w-sm mx-auto font-body">
              An error occurred while loading your flashcard decks.
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
  const safeFlashcards = flashcards ?? [];

  // Use server-filtered flashcards directly (FE-06)
  const activeDeck = safeFlashcards;

  const currentCard = activeDeck[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, activeDeck.length));
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + activeDeck.length) % Math.max(1, activeDeck.length));
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    setCurrentIndex(Math.floor(Math.random() * Math.max(1, activeDeck.length)));
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
            Smart Flashcards & Active Recall
          </h1>
          <p className="text-xs sm:text-sm text-muted font-body mt-0.5">
            Scientific spaced repetition cards generated directly from your lecture documents.
          </p>
        </div>

        {/* Deck Filter Dropdown */}
        {safeDocuments.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-display font-semibold text-muted">Deck:</span>
            <select
              value={effectiveDocId}
              onChange={(e) => {
                const val = e.target.value;
                if (onSelectDocId) {
                  onSelectDocId(val);
                } else {
                  setLocalSelectedDocId(val);
                }
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              className="h-10 px-3.5 rounded-full bg-surface border border-line text-xs font-display font-medium text-ink focus:outline-none focus:ring-2 focus:ring-ink"
            >
              <option value="all">All Flashcard Decks ({safeFlashcards.length} cards)</option>
              {safeDocuments.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.original_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Mascot Section Guide */}
      <MascotGuide
        section="flashcards"
        actionLabel="Review Deck"
        onActionClick={() => setIsFlipped(!isFlipped)}
      />

      {/* Notice if any document failed flashcard generation */}
      {safeDocuments.some((d) => d.flashcard_generation_status === "FAILED") && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="size-4 shrink-0 text-amber-600" />
            <div>
              <p className="font-display font-semibold">Flashcard Generation Notice</p>
              <p className="text-amber-700">
                1 or more documents encountered a limit or timeout during flashcard generation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const target = safeDocuments.find((d) => d.flashcard_generation_status === "FAILED");
              if (target) onGenerateFlashcards(target.id);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-200 hover:bg-amber-300 text-amber-950 font-display font-bold self-start sm:self-auto shrink-0 transition-colors"
          >
            <RotateCw className="size-3.5" />
            <span>Retry Generating Cards</span>
          </button>
        </div>
      )}

      {/* Main Flashcard Practice Area */}
      {activeDeck.length === 0 ? (
        <div className="rounded-3xl bg-surface border border-line p-12 text-center space-y-4 shadow-soft">
          <div className="size-16 rounded-3xl bg-purple-50 text-purple-600 mx-auto flex items-center justify-center shadow-xs">
            <Brain className="size-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-ink">
              No flashcard decks available yet
            </h3>
            <p className="text-xs text-muted max-w-sm mx-auto font-body">
              Upload a course PDF or generate flashcards from your existing lecture summaries to build your first study deck!
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onNavigateDocuments}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-night text-[#c8f560] text-xs font-display font-bold hover:bg-ink transition-transform active:scale-95 shadow-sm"
            >
              <BookOpen className="size-4" />
              <span>Go to Documents</span>
            </button>
            {safeDocuments.some((d) => d.status === "DONE") && (
              <button
                type="button"
                onClick={() => {
                  const target = safeDocuments.find((d) => d.status === "DONE");
                  if (target) onGenerateFlashcards(target.id);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-display font-bold hover:bg-purple-700 transition-transform active:scale-95 shadow-sm"
              >
                <Brain className="size-4" />
                <span>Auto-Generate Decks</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-xl mx-auto space-y-5">
          {/* Card Counter & Shuffle */}
          <div className="flex items-center justify-between text-xs font-display text-muted px-2">
            <span>
              Card <strong>{currentIndex + 1}</strong> of <strong>{activeDeck.length}</strong>
            </span>
            <button
              type="button"
              onClick={handleShuffle}
              className="inline-flex items-center gap-1.5 hover:text-ink transition-colors"
            >
              <Shuffle className="size-3.5" />
              <span>Shuffle</span>
            </button>
          </div>

          {/* Interactive Flip Card */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="relative h-72 sm:h-80 w-full rounded-3xl cursor-pointer select-none perspective-1000 transition-transform duration-200 active:scale-[0.99]"
          >
            <div
              className={`relative size-full rounded-3xl p-8 border transition-all duration-500 shadow-lift flex flex-col justify-between ${
                isFlipped
                  ? "bg-gradient-to-br from-[#161720] via-[#1a1c27] to-[#12131a] border-[#2c303f] text-white"
                  : "bg-surface border-line text-ink hover:border-line-strong"
              }`}
            >
              {/* Card Label */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.6875rem] font-display font-semibold ${
                    isFlipped
                      ? "bg-[#c8f560]/20 text-[#c8f560] border border-[#c8f560]/30"
                      : "bg-purple-50 text-purple-700 border border-purple-200"
                  }`}
                >
                  <Sparkles className="size-3" />
                  <span>{isFlipped ? "Answer / Explanation" : "Question / Concept"}</span>
                </span>

                <span className="text-[0.6875rem] text-muted flex items-center gap-1 font-body">
                  <RotateCw className="size-3" />
                  <span>Click to flip</span>
                </span>
              </div>

              {/* Card Content Text */}
              <div className="my-auto text-center px-4">
                <p
                  className={`text-base sm:text-lg font-display font-bold leading-relaxed ${
                    isFlipped ? "text-gray-100" : "text-ink"
                  }`}
                >
                  {isFlipped ? currentCard.answer : currentCard.question}
                </p>
              </div>

              {/* Card Footer Hint */}
              <div className="text-center text-[0.6875rem] text-muted font-body">
                <span>{isFlipped ? "Tap card to review question" : "Tap card to reveal answer"}</span>
              </div>
            </div>
          </div>

          {/* Controls: Prev / Next */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={handlePrev}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-surface hover:bg-mist text-ink text-xs font-display font-semibold border border-line shadow-xs transition-transform active:scale-95"
            >
              <ChevronLeft className="size-4" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFlipped(!isFlipped)}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-night hover:bg-ink text-[#c8f560] text-xs font-display font-bold shadow-md transition-transform active:scale-95"
            >
              <RotateCw className="size-4" />
              <span>Flip Card</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-surface hover:bg-mist text-ink text-xs font-display font-semibold border border-line shadow-xs transition-transform active:scale-95"
            >
              <span>Next</span>
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
