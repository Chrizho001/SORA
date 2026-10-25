"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/components/auth/ToastProvider";
import { formatApiErrorMessage } from "@/lib/axios-client";
import { DocumentUploadModal } from "@/components/dashboard/DocumentUploadModal";
import { DocumentsView } from "@/components/dashboard/views/DocumentsView";
import {
  useDocuments,
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
        isLoading={documentsQuery.isLoading}
        isError={documentsQuery.isError}
        onRetry={() => documentsQuery.refetch()}
        onUploadClick={() => setIsUploadModalOpen(true)}
        onGenerateFlashcards={(docId) => generateCardsMutation.mutate(docId)}
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
