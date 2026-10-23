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
import { notify } from "@/components/auth/ToastProvider";

// ==========================================
// DOCUMENTS QUERY HOOKS
// ==========================================

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: () => documentsApi.getDocuments(),
    refetchInterval: (query) => {
      // Auto-poll every 5 seconds if any document is currently PROCESSING or GENERATING
      const data = query.state.data;
      if (Array.isArray(data)) {
        const hasActiveJobs = data.some(
          (doc: DocumentItem) =>
            doc.status === "PROCESSING" ||
            doc.status === "UPLOADED" ||
            doc.flashcard_generation_status === "GENERATING"
        );
        if (hasActiveJobs) return 5000;
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
        `"${newDoc.original_name}" uploaded! SORA AI is analyzing your document.`,
        "Upload Started"
      );
    },
    onError: (error: Error) => {
      notify.error(error.message || "Failed to upload document", "Upload Error");
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
        "SORA AI is generating flashcards from your summary!",
        "Flashcards Queued"
      );
    },
    onError: (error: Error) => {
      notify.error(error.message || "Failed to trigger flashcard generation", "Generation Error");
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      notify.info("Document deleted from your library.", "Document Removed");
    },
    onError: (error: Error) => {
      notify.error(error.message || "Failed to delete document", "Delete Error");
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
    onError: (error: Error) => {
      notify.error(error.message || "Failed to start quiz session", "Quiz Error");
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
    onError: (error: Error) => {
      notify.error(error.message || "Failed to submit quiz answers", "Submission Error");
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
    onError: (error: Error) => {
      notify.error(error.message || "Failed to create task", "Task Error");
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
    onError: (error: Error) => {
      notify.error(error.message || "Failed to update task", "Update Error");
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
    onError: (error: Error) => {
      notify.error(error.message || "Failed to delete task", "Delete Error");
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
    refetchInterval: 30000, // Poll unread notifications count every 30 seconds
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
  });
}
