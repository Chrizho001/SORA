"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FlashcardsView } from "@/components/dashboard/views/FlashcardsView";
import {
  useDocuments,
  useCardsByDeck,
  useGenerateFlashcards,
} from "@/lib/use-dashboard-queries";

function DeckStudyContent() {
  const params = useParams();
  const router = useRouter();
  const deckId = params?.deckId as string;

  const documentsQuery = useDocuments();
  const flashcardsQuery = useCardsByDeck(deckId);
  const generateCardsMutation = useGenerateFlashcards();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/flashcards"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas hover:bg-mist text-ink text-xs font-display font-semibold transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>All Flashcard Decks</span>
        </Link>
      </div>

      <FlashcardsView
        documents={documentsQuery.data}
        flashcards={flashcardsQuery.data}
        isLoading={flashcardsQuery.isLoading || documentsQuery.isLoading}
        isError={flashcardsQuery.isError}
        onRetry={() => {
          flashcardsQuery.refetch();
          documentsQuery.refetch();
        }}
        onGenerateFlashcards={(docId) => generateCardsMutation.mutate(docId)}
        onNavigateDocuments={() => router.push("/dashboard/documents")}
      />
    </div>
  );
}

export default function DeckStudyPage() {
  return (
    <React.Suspense fallback={<div className="min-h-96 animate-pulse" />}>
      <DeckStudyContent />
    </React.Suspense>
  );
}
