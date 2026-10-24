"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  documentsApi,
  flashcardsApi,
  quizzesApi,
  tasksApi,
  notificationsApi,
  DocumentItem,
  CreateTaskPayload,
  TaskQueryParams,
} from "./dashboard-api";
import { formatApiErrorMessage } from "./axios-client";
import { notify } from "@/components/auth/ToastProvider";

// ==========================================
// DOCUMENTS QUERY HOOKS
// ==========================================

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: () => documentsApi.getDocuments(),
    refetchInterval: (query) => {
      // Auto-poll every 4 seconds if any document is currently PROCESSING, UPLOADED, or GENERATING flashcards
      const data = query.state.data;
      if (Array.isArray(data)) {
        const hasActiveJobs = data.some(
          (doc: DocumentItem) =>
            doc.status === "PROCESSING" ||
            doc.status === "UPLOADED" ||
            doc.flashcard_generation_status === "GENERATING"
        );
        if (hasActiveJobs) return 4000;
      }
      return false;
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => documentsApi.uploadDocument(file),
    onSuccess: (newDoc) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      notify.success(
        `"${newDoc.original_name}" uploaded successfully! SORA AI is reading your document.`,
        "Upload Started"
      );
    },
    onError: (error: unknown) => {
      const msg = formatApiErrorMessage(error);
      notify.error(msg, "Upload Failed");
    },
  });
}

export function useRetryDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => documentsApi.retryDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      notify.info("SORA AI is re-analyzing your document with AI vision.", "Analysis Restarted");
    },
    onError: (error: unknown) => {
      const msg = formatApiErrorMessage(error);
      notify.error(msg, "Retry Failed");
    },
  });
}

export function useGenerateFlashcards() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => documentsApi.generateFlashcards(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["flashcards"] });
      notify.success(
        "SORA AI is generating smart flashcards from your summary!",
        "Flashcards Queued"
      );
    },
    onError: (error: unknown) => {
      const msg = formatApiErrorMessage(error);
      notify.error(msg, "Flashcard Generation Failed");
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["flashcards"] });
      queryClient.invalidateQueries({ queryKey: ["quiz-sessions"] });
      notify.info("Document and associated materials deleted.", "Document Removed");
    },
    onError: (error: unknown) => {
      const msg = formatApiErrorMessage(error);
      notify.error(msg, "Delete Failed");
    },
  });
}

// ==========================================
// FLASHCARDS QUERY HOOKS
// ==========================================

export function useFlashcards(documentId?: string) {
  return useQuery({
    queryKey: ["flashcards", documentId],
    queryFn: () => flashcardsApi.getFlashcards(documentId),
    enabled: true,
  });
}

// ==========================================
// QUIZZES QUERY HOOKS
// ==========================================

export function useQuizSessions() {
  return useQuery({
    queryKey: ["quiz-sessions"],
    queryFn: () => quizzesApi.getQuizSessions(),
  });
}

export function useStartQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => documentsApi.startQuiz(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-sessions"] });
      notify.success("Speed quiz initialized! Good luck!", "Quiz Ready");
    },
    onError: (error: unknown) => {
      const msg = formatApiErrorMessage(error);
      notify.error(msg, "Unable to Start Quiz");
    },
  });
}

export function useSubmitQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      answers,
    }: {
      sessionId: string;
      answers: { question_id: string; selected_choice: string }[];
    }) => quizzesApi.submitQuiz(sessionId, answers),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["quiz-sessions"] });
      notify.success(
        `Quiz completed! You scored ${session.score ?? 0}/${session.total_questions}.`,
        "Quiz Submitted"
      );
    },
    onError: (error: unknown) => {
      const msg = formatApiErrorMessage(error);
      notify.error(msg, "Submission Failed");
    },
  });
}

// ==========================================
// TASKS QUERY HOOKS
// ==========================================

export function useTasks(params?: TaskQueryParams) {
  return useQuery({
    queryKey: ["tasks", params],
    queryFn: () => tasksApi.getTasks(params),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => tasksApi.createTask(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      notify.success("New study task scheduled!", "Task Created");
    },
    onError: (error: unknown) => {
      const msg = formatApiErrorMessage(error);
      notify.error(msg, "Task Creation Failed");
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateTaskPayload> }) =>
      tasksApi.updateTask(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error: unknown) => {
      const msg = formatApiErrorMessage(error);
      notify.error(msg, "Task Update Failed");
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      notify.info("Task deleted.", "Task Removed");
    },
    onError: (error: unknown) => {
      const msg = formatApiErrorMessage(error);
      notify.error(msg, "Task Delete Failed");
    },
  });
}

// ==========================================
// NOTIFICATIONS QUERY HOOKS
// ==========================================

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.getNotifications(),
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
    onError: (error: unknown) => {
      const msg = formatApiErrorMessage(error);
      notify.error(msg, "Notification Error");
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
      notify.success("All notifications marked as read.", "Notifications Updated");
    },
    onError: (error: unknown) => {
      const msg = formatApiErrorMessage(error);
      notify.error(msg, "Notification Error");
    },
  });
}
