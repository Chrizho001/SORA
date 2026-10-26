"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/components/auth/ToastProvider";
import { formatApiErrorMessage } from "@/lib/axios-client";
import { QuizzesView } from "@/components/dashboard/views/QuizzesView";
import {
  useDecks,
  useFlashcards,
  useQuizSessions,
  useStartDeckQuiz,
} from "@/lib/use-dashboard-queries";

export default function QuizzesPage() {
  const router = useRouter();
  const decksQuery = useDecks();
  const flashcardsQuery = useFlashcards();
  const quizSessionsQuery = useQuizSessions();
  const startDeckQuizMutation = useStartDeckQuiz();

  const handleStartQuiz = async (deckId: string, questionCount: number) => {
    try {
      const session = await startDeckQuizMutation.mutateAsync({
        deckId,
        questionCount,
      });
      router.push(`/dashboard/quizzes/${session.id}`);
      return session;
    } catch (err: unknown) {
      notify.error(formatApiErrorMessage(err), "Unable to Start Quiz");
      throw err;
    }
  };

  return (
    <QuizzesView
      decks={decksQuery.data}
      flashcards={flashcardsQuery.data}
      quizSessions={quizSessionsQuery.data}
      isLoading={
        quizSessionsQuery.isLoading ||
        decksQuery.isLoading ||
        flashcardsQuery.isLoading
      }
      isError={quizSessionsQuery.isError || decksQuery.isError}
      onRetry={() => {
        quizSessionsQuery.refetch();
        decksQuery.refetch();
        flashcardsQuery.refetch();
      }}
      onStartQuiz={handleStartQuiz}
    />
  );
}
