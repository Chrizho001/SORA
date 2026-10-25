"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FlashcardsView } from "@/components/dashboard/views/FlashcardsView";
import {
  useDocuments,
  useFlashcards,
  useGenerateFlashcards,
} from "@/lib/use-dashboard-queries";

export default function FlashcardsPage() {
  const router = useRouter();
  const [selectedDocId, setSelectedDocId] = useState<string>("all");
  const documentsQuery = useDocuments();
  const flashcardsQuery = useFlashcards(
    selectedDocId !== "all" ? { document: selectedDocId } : undefined
  );
  const generateCardsMutation = useGenerateFlashcards();

  return (
    <FlashcardsView
      documents={documentsQuery.data}
      flashcards={flashcardsQuery.data}
      selectedDocId={selectedDocId}
      onSelectDocId={(id) => setSelectedDocId(id)}
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
