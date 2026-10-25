import { apiClient } from "./axios-client";
import { userTimeZone } from "./dates";

// ==========================================
// DOCUMENTS TYPES & API
// ==========================================

export type DocumentStatus = "UPLOADED" | "PROCESSING" | "DONE" | "FAILED";
export type FlashcardGenerationStatus = "NOT_STARTED" | "GENERATING" | "DONE" | "FAILED";

export interface Summary {
  id: string;
  content: string;
  ai_model_used: string;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  original_name: string;
  size: number;
  page_count: number | null;
  status: DocumentStatus;
  flashcard_generation_status: FlashcardGenerationStatus;
  error_message: string;
  created_at: string;
  updated_at: string;
  summary: Summary | null;
}

export const documentsApi = {
  async getDocuments(): Promise<DocumentItem[]> {
    const res = await apiClient.get<DocumentItem[] | { results: DocumentItem[] }>("/documents/");
    if (Array.isArray(res.data)) return res.data;
    if ("results" in res.data && Array.isArray(res.data.results)) return res.data.results;
    return [];
  },

  async getDocument(id: string): Promise<DocumentItem> {
    const res = await apiClient.get<DocumentItem>(`/documents/${id}/`);
    return res.data;
  },

  async uploadDocument(file: File): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post<DocumentItem>("/documents/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  async deleteDocument(id: string): Promise<void> {
    await apiClient.delete(`/documents/${id}/`);
  },

  async generateFlashcards(documentId: string): Promise<{ status: string }> {
    const res = await apiClient.post<{ status: string }>(`/documents/${documentId}/generate-flashcards/`);
    return res.data;
  },

  async startQuiz(documentId: string): Promise<QuizSession> {
    const res = await apiClient.post<QuizSession>(`/documents/${documentId}/start-quiz/`);
    return res.data;
  },

  async retryDocument(documentId: string): Promise<{ status: string }> {
    const res = await apiClient.post<{ status: string }>(`/documents/${documentId}/retry/`);
    return res.data;
  },
};

// ==========================================
// FLASHCARDS TYPES & API
// ==========================================

export interface FlashcardItem {
  id: string;
  document: string;
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
}

export const flashcardsApi = {
  async getFlashcards(documentId?: string): Promise<FlashcardItem[]> {
    const params = documentId ? { document: documentId } : undefined;
    const res = await apiClient.get<FlashcardItem[] | { results: FlashcardItem[] }>("/flashcards/", { params });
    if (Array.isArray(res.data)) return res.data;
    if ("results" in res.data && Array.isArray(res.data.results)) return res.data.results;
    return [];
  },

  async updateFlashcard(id: string, payload: Partial<FlashcardItem>): Promise<FlashcardItem> {
    const res = await apiClient.patch<FlashcardItem>(`/flashcards/${id}/`, payload);
    return res.data;
  },

  async deleteFlashcard(id: string): Promise<void> {
    await apiClient.delete(`/flashcards/${id}/`);
  },
};

// ==========================================
// QUIZZES TYPES & API
// ==========================================

export interface QuizQuestionItem {
  id: string;
  question_text: string;
  choices: string[];
  selected_choice: string | null;
  is_correct: boolean | null;
  correct_answer?: string;
}

export interface QuizSession {
  id: string;
  document: string;
  score: number | null;
  total_questions: number;
  created_at: string;
  finished_at: string | null;
  questions: QuizQuestionItem[];
}

export const quizzesApi = {
  async getQuizSessions(): Promise<QuizSession[]> {
    const res = await apiClient.get<QuizSession[] | { results: QuizSession[] }>("/quiz-sessions/");
    if (Array.isArray(res.data)) return res.data;
    if ("results" in res.data && Array.isArray(res.data.results)) return res.data.results;
    return [];
  },

  async getQuizSession(id: string): Promise<QuizSession> {
    const res = await apiClient.get<QuizSession>(`/quiz-sessions/${id}/`);
    return res.data;
  },

  async submitQuiz(
    sessionId: string,
    answers: { question_id: string; selected_choice: string }[]
  ): Promise<QuizSession> {
    const res = await apiClient.post<QuizSession>(`/quiz-sessions/${sessionId}/submit/`, { answers });
    return res.data;
  },
};

// ==========================================
// TASKS TYPES & API
// ==========================================

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  due_at: string | null;
  priority: 1 | 2 | 3; // 1=Low, 2=Medium, 3=High
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskQueryParams {
  is_completed?: boolean;
  priority?: number;
  date?: string;
  tz?: string;
  from?: string;
  to?: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  due_at?: string | null;
  priority?: 1 | 2 | 3;
  is_completed?: boolean;
}

export const tasksApi = {
  async getTasks(params?: TaskQueryParams): Promise<TaskItem[]> {
    const finalParams = params ? { ...params } : undefined;
    if (finalParams?.date && !finalParams.tz) {
      finalParams.tz = userTimeZone();
    }
    const res = await apiClient.get<TaskItem[] | { results: TaskItem[] }>("/tasks/", { params: finalParams });
    if (Array.isArray(res.data)) return res.data;
    if ("results" in res.data && Array.isArray(res.data.results)) return res.data.results;
    return [];
  },

  async createTask(payload: CreateTaskPayload): Promise<TaskItem> {
    const res = await apiClient.post<TaskItem>("/tasks/", payload);
    return res.data;
  },

  async updateTask(id: string, payload: Partial<CreateTaskPayload>): Promise<TaskItem> {
    const res = await apiClient.patch<TaskItem>(`/tasks/${id}/`, payload);
    return res.data;
  },

  async deleteTask(id: string): Promise<void> {
    await apiClient.delete(`/tasks/${id}/`);
  },
};

// ==========================================
// NOTIFICATIONS TYPES & API
// ==========================================

export interface NotificationItem {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

export const notificationsApi = {
  async getNotifications(): Promise<NotificationItem[]> {
    const res = await apiClient.get<NotificationItem[] | { results: NotificationItem[] }>("/notifications/");
    if (Array.isArray(res.data)) return res.data;
    if ("results" in res.data && Array.isArray(res.data.results)) return res.data.results;
    return [];
  },

  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get<{ unread_count: number }>("/notifications/unread-count/");
    return res.data.unread_count;
  },

  async markAsRead(id: string): Promise<NotificationItem> {
    const res = await apiClient.patch<NotificationItem>(`/notifications/${id}/read/`);
    return res.data;
  },

  async markAllAsRead(): Promise<{ updated: number }> {
    const res = await apiClient.patch<{ updated: number }>("/notifications/read-all/");
    return res.data;
  },

  async getNotificationPreferences(): Promise<NotificationPreference[]> {
    const res = await apiClient.get<NotificationPreference[] | { results: NotificationPreference[] }>(
      "/notification-preferences/"
    );
    if (Array.isArray(res.data)) return res.data;
    if ("results" in res.data && Array.isArray(res.data.results)) return res.data.results;
    return [];
  },

  async updateNotificationPreference(payload: {
    notification_type: string;
    in_app_enabled?: boolean;
    push_enabled?: boolean;
    email_enabled?: boolean;
  }): Promise<NotificationPreference> {
    const res = await apiClient.patch<NotificationPreference>(
      "/notification-preferences/update/",
      payload
    );
    return res.data;
  },

  async createPushSubscription(payload: PushSubscriptionPayload): Promise<PushSubscriptionItem> {
    const res = await apiClient.post<PushSubscriptionItem>("/push-subscriptions/", payload);
    return res.data;
  },

  async deletePushSubscription(id: string): Promise<void> {
    await apiClient.delete(`/push-subscriptions/${id}/`);
  },
};

export interface NotificationPreference {
  notification_type: string;
  in_app_enabled: boolean;
  push_enabled: boolean;
  email_enabled?: boolean;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  p256dh: string;
  auth: string;
  keys?: {
    p256dh: string;
    auth: string;
  };
  user_agent?: string;
}

export interface PushSubscriptionItem {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
}
