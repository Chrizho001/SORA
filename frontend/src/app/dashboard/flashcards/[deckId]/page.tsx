"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, AlertCircle, RotateCw } from "lucide-react";
import { DeckDetailView } from "@/components/dashboard/views/DeckDetailView";
import { useDeck, useDeckCards } from "@/lib/use-dashboard-queries";
import { Skeleton } from "@/components/ui/Skeleton";

function DeckStudyContent() {
  const params = useParams();
  const deckId = params?.deckId as string;

  const deckQuery = useDeck(deckId);
  const cardsQuery = useDeckCards(deckId);

  if (deckQuery.isLoading) {
    return (
      <div className="space-y-6 pb-16">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-xl" />
        </div>
        <Skeleton className="h-44 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (deckQuery.isError || !deckQuery.data) {
    return (
      <div className="space-y-6 pb-16">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/flashcards"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas hover:bg-mist text-ink text-xs font-display font-semibold transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>All Decks</span>
          </Link>
        </div>

        <div className="rounded-3xl bg-surface border border-rose-200 p-10 text-center space-y-4 shadow-soft">
          <AlertCircle className="size-10 text-rose-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-ink">Deck Not Found</h3>
            <p className="text-xs text-muted max-w-sm mx-auto font-body">
              This flashcard deck may have been deleted or does not exist.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => deckQuery.refetch()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#14161f] text-[#c8f560] text-xs font-display font-bold hover:bg-night transition-all shadow-md active:scale-95"
            >
              <RotateCw className="size-3.5" />
              <span>Try Again</span>
            </button>
            <Link
              href="/dashboard/flashcards"
              className="px-5 py-2.5 rounded-full bg-canvas hover:bg-mist text-ink text-xs font-display font-semibold transition-colors border border-line"
            >
              Return to All Decks
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DeckDetailView
      deck={deckQuery.data}
      cards={cardsQuery.data ?? []}
      isLoadingCards={cardsQuery.isLoading}
      isErrorCards={cardsQuery.isError}
      onRetryCards={() => cardsQuery.refetch()}
    />
  );
}

export default function DeckStudyPage() {
  return (
    <React.Suspense fallback={<div className="min-h-96 animate-pulse" />}>
      <DeckStudyContent />
    </React.Suspense>
  );
}
