"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/components/auth/ToastProvider";
import { formatApiErrorMessage } from "@/lib/axios-client";
import { QuizzesView } from "@/components/dashboard/views/QuizzesView";
import {
  useDocuments,
  useQuizSessions,
  useStartQuiz,
} from "@/lib/use-dashboard-queries";

export default function QuizzesPage() {
  const router = useRouter();
  const documentsQuery = useDocuments();
  const quizSessionsQuery = useQuizSessions();
  const startQuizMutation = useStartQuiz();

  const handleStartQuiz = async (docId: string) => {
    try {
      const session = await startQuizMutation.mutateAsync(docId);
      router.push(`/dashboard/quizzes/${session.id}`);
      return session;
    } catch (err: unknown) {
      notify.error(formatApiErrorMessage(err), "Unable to Start Quiz");
      throw err;
    }
  };

  return (
    <QuizzesView
      documents={documentsQuery.data}
      quizSessions={quizSessionsQuery.data}
      isLoading={quizSessionsQuery.isLoading || documentsQuery.isLoading}
      isError={quizSessionsQuery.isError}
      onRetry={() => {
        quizSessionsQuery.refetch();
        documentsQuery.refetch();
      }}
      onStartQuiz={handleStartQuiz}
      onNavigateDocuments={() => router.push("/dashboard/documents")}
    />
  );
}
