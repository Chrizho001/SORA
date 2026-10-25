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
import { useAuth } from "./auth-context";
import { userTimeZone } from "./dates";

/**
 * Prefix query keys with userId to guarantee multi-user isolation
 */
export function qk(userId: string | undefined | null, ...parts: unknown[]) {
  return [userId ?? "anonymous", ...parts];
}

// ==========================================
// DOCUMENTS QUERY HOOKS
// ==========================================

export function useDocuments() {
  const { user, isLoading: isAuthLoading } = useAuth();
  return useQuery({
    queryKey: qk(user?.id, "documents"),
    queryFn: () => documentsApi.getDocuments(),
    enabled: !!user && !isAuthLoading,
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
  const { user } = useAuth();
  return useMutation({
    mutationFn: (file: File) => documentsApi.uploadDocument(file),
    onSuccess: (newDoc) => {
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "documents") });
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
  const { user } = useAuth();
  return useMutation({
    mutationFn: (documentId: string) => documentsApi.retryDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "documents") });
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
  const { user } = useAuth();
  return useMutation({
    mutationFn: (documentId: string) => documentsApi.generateFlashcards(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "documents") });
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "flashcards") });
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
  const { user } = useAuth();
  return useMutation({
    mutationFn: (id: string) => documentsApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "documents") });
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "flashcards") });
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "quiz-sessions") });
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
  const { user, isLoading: isAuthLoading } = useAuth();
  return useQuery({
    queryKey: qk(user?.id, "flashcards", documentId),
    queryFn: () => flashcardsApi.getFlashcards(documentId),
    enabled: !!user && !isAuthLoading,
  });
}

// ==========================================
// QUIZZES QUERY HOOKS
// ==========================================

export function useQuizSessions() {
  const { user, isLoading: isAuthLoading } = useAuth();
  return useQuery({
    queryKey: qk(user?.id, "quiz-sessions"),
    queryFn: () => quizzesApi.getQuizSessions(),
    enabled: !!user && !isAuthLoading,
  });
}

export function useQuizSession(id: string) {
  const { user, isLoading: isAuthLoading } = useAuth();
  return useQuery({
    queryKey: qk(user?.id, "quiz-session", id),
    queryFn: () => quizzesApi.getQuizSession(id),
    enabled: !!user && !isAuthLoading && !!id,
  });
}

export function useStartQuiz() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (documentId: string) => documentsApi.startQuiz(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "quiz-sessions") });
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
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({
      sessionId,
      answers,
    }: {
      sessionId: string;
      answers: { question_id: string; selected_choice: string }[];
    }) => quizzesApi.submitQuiz(sessionId, answers),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "quiz-sessions") });
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "quiz-session", session.id) });
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
  const { user, isLoading: isAuthLoading } = useAuth();
  const queryParams = params ? { ...params } : undefined;
  if (queryParams?.date && !queryParams.tz) {
    queryParams.tz = userTimeZone();
  }
  return useQuery({
    queryKey: qk(user?.id, "tasks", queryParams),
    queryFn: () => tasksApi.getTasks(queryParams),
    enabled: !!user && !isAuthLoading,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => tasksApi.createTask(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "tasks") });
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
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateTaskPayload> }) =>
      tasksApi.updateTask(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "tasks") });
    },
    onError: (error: unknown) => {
      const msg = formatApiErrorMessage(error);
      notify.error(msg, "Task Update Failed");
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (id: string) => tasksApi.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "tasks") });
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
  const { user, isLoading: isAuthLoading } = useAuth();
  return useQuery({
    queryKey: qk(user?.id, "notifications"),
    queryFn: () => notificationsApi.getNotifications(),
    enabled: !!user && !isAuthLoading,
  });
}

export function useUnreadNotificationCount() {
  const { user, isLoading: isAuthLoading } = useAuth();
  return useQuery({
    queryKey: qk(user?.id, "notifications", "unread-count"),
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: !!user && !isAuthLoading,
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "notifications") });
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "notifications", "unread-count") });
    },
    onError: (error: unknown) => {
      const msg = formatApiErrorMessage(error);
      notify.error(msg, "Notification Error");
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "notifications") });
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "notifications", "unread-count") });
      notify.success("All notifications marked as read.", "Notifications Updated");
    },
    onError: (error: unknown) => {
      const msg = formatApiErrorMessage(error);
      notify.error(msg, "Notification Error");
    },
  });
}
