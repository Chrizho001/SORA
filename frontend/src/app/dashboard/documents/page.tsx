"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/components/auth/ToastProvider";
import { formatApiErrorMessage } from "@/lib/axios-client";
import { DocumentUploadModal } from "@/components/dashboard/DocumentUploadModal";
import { DocumentsView } from "@/components/dashboard/views/DocumentsView";
import {
  useDocuments,
  useDecks,
  useUploadDocument,
  useRetryDocument,
  useGenerateFlashcards,
  useDeleteDocument,
  useStartQuiz,
} from "@/lib/use-dashboard-queries";

export default function DocumentsPage() {
  const router = useRouter();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const documentsQuery = useDocuments();
  const decksQuery = useDecks();
  const uploadDocMutation = useUploadDocument();
  const retryDocMutation = useRetryDocument();
  const generateCardsMutation = useGenerateFlashcards();
  const deleteDocMutation = useDeleteDocument();
  const startQuizMutation = useStartQuiz();

  const handleUploadDocument = async (
    file: File,
    onProgress?: (percent: number) => void
  ) => {
    try {
      return await uploadDocMutation.mutateAsync({ file, onProgress });
    } catch (err: unknown) {
      notify.error(formatApiErrorMessage(err), "Failed to Upload Document");
      throw err;
    }
  };

  const handleGenerateFlashcards = async (docId: string) => {
    try {
      const res = await generateCardsMutation.mutateAsync(docId);
      if (res?.deck_id) {
        router.push(`/dashboard/flashcards/${res.deck_id}`);
      }
    } catch (err: unknown) {
      notify.error(formatApiErrorMessage(err), "Flashcard Generation Failed");
    }
  };

  const handleStartQuiz = async (docId: string) => {
    try {
      const session = await startQuizMutation.mutateAsync(docId);
      router.push(`/dashboard/quizzes/${session.id}`);
    } catch (err: unknown) {
      notify.error(formatApiErrorMessage(err), "Unable to Start Quiz");
    }
  };

  return (
    <>
      <DocumentsView
        documents={documentsQuery.data}
        decks={decksQuery.data}
        isLoading={documentsQuery.isLoading || decksQuery.isLoading}
        isError={documentsQuery.isError}
        onRetry={() => {
          documentsQuery.refetch();
          decksQuery.refetch();
        }}
        onUploadClick={() => setIsUploadModalOpen(true)}
        onGenerateFlashcards={handleGenerateFlashcards}
        onStartQuiz={handleStartQuiz}
        onDeleteDocument={(docId) => deleteDocMutation.mutate(docId)}
        onRetryDocument={(docId) => retryDocMutation.mutate(docId)}
      />

      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadDocument}
      />
    </>
  );
}
