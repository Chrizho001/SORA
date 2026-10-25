"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { notify } from "@/components/auth/ToastProvider";
import { formatApiErrorMessage } from "@/lib/axios-client";
import { DocumentUploadModal } from "@/components/dashboard/DocumentUploadModal";
import { TaskModal } from "@/components/dashboard/TaskModal";
import { DashboardHomeView } from "@/components/dashboard/views/DashboardHomeView";
import {
  useDocuments,
  useUploadDocument,
  useRetryDocument,
  useGenerateFlashcards,
  useFlashcards,
  useQuizSessions,
  useStartQuiz,
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "@/lib/use-dashboard-queries";
import { CreateTaskPayload, TaskItem } from "@/lib/dashboard-api";

export default function DashboardHomePage() {
  const router = useRouter();
  const { user } = useAuth();

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Queries
  const documentsQuery = useDocuments();
  const tasksQuery = useTasks();
  const flashcardsQuery = useFlashcards();
  const quizSessionsQuery = useQuizSessions();

  // Mutations
  const uploadDocMutation = useUploadDocument();
  const retryDocMutation = useRetryDocument();
  const generateCardsMutation = useGenerateFlashcards();
  const startQuizMutation = useStartQuiz();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  // Task toggle handler
  const handleToggleTask = (task: TaskItem) => {
    updateTaskMutation.mutate({
      id: task.id,
      payload: { is_completed: !task.is_completed },
    });
  };

  // Task creation handler with try/catch
  const handleCreateTask = async (payload: CreateTaskPayload) => {
    try {
      await createTaskMutation.mutateAsync(payload);
      setIsTaskModalOpen(false);
    } catch (err: unknown) {
      notify.error(formatApiErrorMessage(err), "Failed to Create Task");
    }
  };

  // Document upload handler with try/catch
  const handleUploadDocument = async (file: File) => {
    try {
      return await uploadDocMutation.mutateAsync(file);
    } catch (err: unknown) {
      notify.error(formatApiErrorMessage(err), "Failed to Upload Document");
      throw err;
    }
  };

  // Start quiz handler with try/catch and navigation to [id]
  const handleStartQuiz = async (docId: string) => {
    try {
      const session = await startQuizMutation.mutateAsync(docId);
      router.push(`/dashboard/quizzes/${session.id}`);
    } catch (err: unknown) {
      notify.error(formatApiErrorMessage(err), "Unable to Start Quiz");
    }
  };

  if (!user) return null;

  return (
    <>
      <DashboardHomeView
        user={user}
        documents={documentsQuery.data}
        tasks={tasksQuery.data}
        flashcards={flashcardsQuery.data}
        quizSessions={quizSessionsQuery.data}
        isLoading={
          documentsQuery.isLoading ||
          tasksQuery.isLoading ||
          flashcardsQuery.isLoading ||
          quizSessionsQuery.isLoading
        }
        isError={
          documentsQuery.isError ||
          tasksQuery.isError ||
          flashcardsQuery.isError ||
          quizSessionsQuery.isError
        }
        onRetry={() => {
          documentsQuery.refetch();
          tasksQuery.refetch();
          flashcardsQuery.refetch();
          quizSessionsQuery.refetch();
        }}
        onUploadClick={() => setIsUploadModalOpen(true)}
        onAddTaskClick={() => setIsTaskModalOpen(true)}
        onToggleTask={handleToggleTask}
        onDeleteTask={(id) => deleteTaskMutation.mutate(id)}
        onGenerateFlashcards={(docId) => generateCardsMutation.mutate(docId)}
        onStartQuiz={handleStartQuiz}
        onViewDocument={() => router.push("/dashboard/documents")}
        onRetryDocument={(docId) => retryDocMutation.mutate(docId)}
      />

      {/* Modals */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadDocument}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleCreateTask}
      />
    </>
  );
}
