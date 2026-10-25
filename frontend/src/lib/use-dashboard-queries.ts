"use client";

import { useRef, useEffect, useMemo } from "react";
import {
  useMutation,
  useQuery,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  documentsApi,
  decksApi,
  flashcardsApi,
  quizzesApi,
  tasksApi,
  notificationsApi,
  DocumentItem,
  CreateTaskPayload,
  TaskQueryParams,
  NotificationPreference,
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
      // Auto-poll every 4 seconds if any document is currently PROCESSING, UPLOADED, or GENERATING flashcards,
      // UNLESS all processing documents have been running for > 10 minutes (FE-20).
      const data = query.state.data;
      if (Array.isArray(data)) {
        const now = Date.now();
        const hasActiveNonStuckJobs = data.some((doc: DocumentItem) => {
          if (doc.flashcard_generation_status === "GENERATING") return true;
          if (doc.status === "PROCESSING" || doc.status === "UPLOADED") {
            const start = doc.processing_started_at
              ? new Date(doc.processing_started_at).getTime()
              : new Date(doc.created_at).getTime();
            // If <= 10 minutes, keep polling
            return now - start <= 10 * 60 * 1000;
          }
          return false;
        });
        if (hasActiveNonStuckJobs) return 4000;
      }
      return false;
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: (variables: File | { file: File; onProgress?: (percent: number) => void }) => {
      if (variables instanceof File) {
        return documentsApi.uploadDocument(variables);
      }
      return documentsApi.uploadDocument(variables.file, variables.onProgress);
    },
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
      const status = (error as { response?: { status?: number } })?.response?.status;
      const msg = formatApiErrorMessage(error);
      if (status === 409) {
        queryClient.invalidateQueries({ queryKey: qk(user?.id, "documents") });
        notify.warning(
          msg || "Document analysis is already underway or complete.",
          "Retry Conflict (409)"
        );
        return;
      }
      if (status === 400) {
        queryClient.invalidateQueries({ queryKey: qk(user?.id, "documents") });
        notify.warning(msg || "Document is already being analyzed.", "Cannot Retry (400)");
        return;
      }
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
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "decks") });
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
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "decks") });
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
// DECKS & FLASHCARDS QUERY HOOKS
// ==========================================

export function useDecks(params?: { document?: string }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  return useQuery({
    queryKey: qk(user?.id, "decks", params),
    queryFn: () => decksApi.getDecks(params),
    enabled: !!user && !isAuthLoading,
  });
}

export function useFlashcards(filter?: { document?: string; deck?: string } | string) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const filterKey = typeof filter === "string" ? { document: filter } : filter;
  return useQuery({
    queryKey: qk(user?.id, "flashcards", filterKey),
    queryFn: () => flashcardsApi.getFlashcards(filter),
    enabled: !!user && !isAuthLoading,
  });
}

export function useCardsByDeck(deckId: string) {
  const { user, isLoading: isAuthLoading } = useAuth();
  return useQuery({
    queryKey: qk(user?.id, "flashcards", "deck", deckId),
    queryFn: () => flashcardsApi.getCardsByDeck(deckId),
    enabled: !!user && !isAuthLoading && !!deckId,
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
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "quiz-sessions") });
      notify.success(
        `Speed quiz generated with ${session.total_questions} questions!`,
        "Quiz Ready"
      );
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

export function useInfiniteNotifications() {
  const { user, isLoading: isAuthLoading } = useAuth();
  return useInfiniteQuery({
    queryKey: qk(user?.id, "notifications"),
    queryFn: ({ pageParam }) => notificationsApi.getNotificationsPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.next) return undefined;
      try {
        const urlObj = new URL(lastPage.next, "http://dummy.local");
        const page = urlObj.searchParams.get("page");
        if (page) return Number(page);
      } catch {
        // fallback to incremental page
      }
      return allPages.length + 1;
    },
    enabled: !!user && !isAuthLoading,
  });
}

export function useNotifications() {
  const infinite = useInfiniteNotifications();
  const allNotifications = useMemo(
    () => infinite.data?.pages.flatMap((page) => page.results) ?? [],
    [infinite.data]
  );
  return {
    ...infinite,
    data: allNotifications,
  };
}

export function useUnreadNotificationCount() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const prevCountRef = useRef<number | undefined>(undefined);

  const query = useQuery({
    queryKey: qk(user?.id, "notifications", "unread-count"),
    queryFn: () => notificationsApi.getUnreadCount(),
    enabled: !!user && !isAuthLoading,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (query.data !== undefined) {
      if (prevCountRef.current !== undefined && prevCountRef.current !== query.data) {
        // Invalidate notifications list query when polled unread count changes (FE-18)
        queryClient.invalidateQueries({ queryKey: qk(user?.id, "notifications"), exact: true });
      }
      prevCountRef.current = query.data;
    }
  }, [query.data, queryClient, user?.id]);

  return query;
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

export function useNotificationPreferences() {
  const { user, isLoading: isAuthLoading } = useAuth();
  return useQuery({
    queryKey: qk(user?.id, "notification-preferences"),
    queryFn: () => notificationsApi.getNotificationPreferences(),
    enabled: !!user && !isAuthLoading,
  });
}

export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (payload: {
      notification_type: string;
      in_app_enabled?: boolean;
      push_enabled?: boolean;
      email_enabled?: boolean;
    }) => notificationsApi.updateNotificationPreference(payload),
    onMutate: async (newPref) => {
      const queryKey = qk(user?.id, "notification-preferences");
      await queryClient.cancelQueries({ queryKey });
      const previousPrefs = queryClient.getQueryData<NotificationPreference[]>(queryKey);

      if (previousPrefs) {
        queryClient.setQueryData<NotificationPreference[]>(
          queryKey,
          previousPrefs.map((pref) =>
            pref.notification_type === newPref.notification_type
              ? { ...pref, ...newPref }
              : pref
          )
        );
      }

      return { previousPrefs };
    },
    onError: (_err, _newPref, context) => {
      const queryKey = qk(user?.id, "notification-preferences");
      if (context?.previousPrefs) {
        queryClient.setQueryData(queryKey, context.previousPrefs);
      }
      notify.error("Failed to update notification preference.", "Preference Update Failed");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk(user?.id, "notification-preferences") });
    },
  });
}
