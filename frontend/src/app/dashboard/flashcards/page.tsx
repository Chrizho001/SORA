"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FlashcardsView } from "@/components/dashboard/views/FlashcardsView";
import { useDecks, useDocuments, useCreateDeck } from "@/lib/use-dashboard-queries";

export default function FlashcardsPage() {
  const router = useRouter();
  const decksQuery = useDecks();
  const documentsQuery = useDocuments();
  const createDeckMutation = useCreateDeck();

  const handleCreateDeck = async (payload: {
    title: string;
    description?: string;
    document?: string | null;
  }) => {
    const newDeck = await createDeckMutation.mutateAsync(payload);
    router.push(`/dashboard/flashcards/${newDeck.id}`);
    return newDeck;
  };

  return (
    <FlashcardsView
      decks={decksQuery.data}
      documents={documentsQuery.data}
      isLoading={decksQuery.isLoading || documentsQuery.isLoading}
      isError={decksQuery.isError}
      onRetry={() => {
        decksQuery.refetch();
        documentsQuery.refetch();
      }}
      onCreateDeck={handleCreateDeck}
    />
  );
}
