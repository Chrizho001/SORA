"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { FlashcardsView } from "@/components/dashboard/views/FlashcardsView";
import {
  useDocuments,
  useFlashcards,
  useGenerateFlashcards,
} from "@/lib/use-dashboard-queries";

export default function FlashcardsPage() {
  const router = useRouter();
  const documentsQuery = useDocuments();
  const flashcardsQuery = useFlashcards();
  const generateCardsMutation = useGenerateFlashcards();

  return (
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
  );
}
