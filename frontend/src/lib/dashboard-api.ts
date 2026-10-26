import { AxiosInstance, AxiosResponse } from "axios";
import { apiClient } from "./axios-client";
import { userTimeZone } from "./dates";

// ==========================================
// PAGINATION HELPER (FE-06)
// ==========================================

export interface PaginatedResult<T> {
  results: T[];
  truncated: boolean;
}

export interface DRFPaginatedResponse<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
}

/**
 * Fetches all pages for a given endpoint by following the `next` URL up to maxPages.
 * Follows DRF pagination convention: { count, next, previous, results }.
 */
export async function fetchAllPages<T>(
  client: AxiosInstance,
  url: string,
  params?: Record<string, unknown>,
  maxPages = 10
): Promise<PaginatedResult<T>> {
  let currentUrl: string | null = url;
  let currentParams: Record<string, unknown> | undefined = params;
  const results: T[] = [];
  let pageCount = 0;
  let truncated = false;

  while (currentUrl && pageCount < maxPages) {
    pageCount++;
    const res: AxiosResponse<T[] | DRFPaginatedResponse<T>> = await client.get<
      T[] | DRFPaginatedResponse<T>
    >(currentUrl, currentParams ? { params: currentParams } : undefined);

    const data: T[] | DRFPaginatedResponse<T> = res.data;

    if (Array.isArray(data)) {
      results.push(...data);
      break;
    }

    if (data?.results && Array.isArray(data.results)) {
      results.push(...data.results);
    }

    const nextUrl: string | null | undefined = data?.next;
    if (nextUrl) {
      if (pageCount >= maxPages) {
        truncated = true;
        break;
      }
      currentUrl = nextUrl;
      currentParams = undefined; // URL already includes any query parameters
    } else {
      break;
    }
  }

  return { results, truncated };
}

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
  processing_started_at?: string | null;
  summary: Summary | null;
}

export const documentsApi = {
  async getDocuments(): Promise<DocumentItem[]> {
    const { results } = await fetchAllPages<DocumentItem>(apiClient, "/documents/");
    return results;
  },

  async getDocument(id: string): Promise<DocumentItem> {
    const res = await apiClient.get<DocumentItem>(`/documents/${id}/`);
    return res.data;
  },

  async uploadDocument(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post<DocumentItem>("/documents/", formData, {
      timeout: 120000, // 120s timeout on upload request only (FE-20)
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress?.(percent);
        }
      },
    });
    return res.data;
  },

  async deleteDocument(id: string): Promise<void> {
    await apiClient.delete(`/documents/${id}/`);
  },

  async generateFlashcards(
    documentId: string
  ): Promise<{ status: string; deck_id?: string }> {
    const res = await apiClient.post<{ status: string; deck_id?: string }>(
      `/documents/${documentId}/generate-flashcards/`
    );
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
// DECKS & FLASHCARDS TYPES & API
// ==========================================

export interface Deck {
  id: string;
  title: string;
  description: string;
  document: string | null;
  document_name?: string;
  card_count: number;
  created_at: string;
  updated_at: string;
}
export type DeckItem = Deck;

export const decksApi = {
  async list(params?: { document?: string }): Promise<Deck[]> {
    const { results } = await fetchAllPages<Deck>(
      apiClient,
      "/decks/",
      params as Record<string, unknown>
    );
    return results;
  },

  async get(id: string): Promise<Deck> {
    const res = await apiClient.get<Deck>(`/decks/${id}/`);
    return res.data;
  },

  async create(payload: {
    title: string;
    description?: string;
    document?: string | null;
  }): Promise<Deck> {
    const res = await apiClient.post<Deck>("/decks/", payload);
    return res.data;
  },

  async update(
    id: string,
    payload: Partial<{ title: string; description: string }>
  ): Promise<Deck> {
    const res = await apiClient.patch<Deck>(`/decks/${id}/`, payload);
    return res.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/decks/${id}/`);
  },

  async generate(id: string, payload?: { count?: number }): Promise<{ status: string }> {
    const res = await apiClient.post<{ status: string }>(
      `/decks/${id}/generate-flashcards/`,
      payload
    );
    return res.data;
  },

  async startQuiz(
    id: string,
    payload?: { question_count?: number }
  ): Promise<QuizSession> {
    const res = await apiClient.post<QuizSession>(
      `/decks/${id}/start-quiz/`,
      payload
    );
    return res.data;
  },

  // Aliases for backwards compatibility
  getDecks(params?: { document?: string }) {
    return this.list(params);
  },
  getDeck(id: string) {
    return this.get(id);
  },
  createDeck(payload: { title: string; description?: string; document?: string | null }) {
    return this.create(payload);
  },
  updateDeck(id: string, payload: Partial<{ title: string; description: string }>) {
    return this.update(id, payload);
  },
  deleteDeck(id: string) {
    return this.remove(id);
  },
};

export interface Flashcard {
  id: string;
  deck: string;
  document: string | null;
  question: string;
  answer: string;
  source: "MANUAL" | "AI";
  created_at: string;
  updated_at: string;
}
export type FlashcardItem = Flashcard;

export const flashcardsApi = {
  async list(params?: { deck?: string; document?: string }): Promise<Flashcard[]> {
    const { results } = await fetchAllPages<Flashcard>(
      apiClient,
      "/flashcards/",
      params as Record<string, unknown>
    );
    return results;
  },

  async create(payload: {
    deck: string;
    question: string;
    answer: string;
  }): Promise<Flashcard> {
    const res = await apiClient.post<Flashcard>("/flashcards/", payload);
    return res.data;
  },

  async update(
    id: string,
    payload: Partial<{ question: string; answer: string; deck?: string }>
  ): Promise<Flashcard> {
    const res = await apiClient.patch<Flashcard>(`/flashcards/${id}/`, payload);
    return res.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/flashcards/${id}/`);
  },

  // Aliases for backwards compatibility
  getFlashcards(filter?: { document?: string; deck?: string } | string) {
    const params = typeof filter === "string" ? { document: filter } : filter;
    return this.list(params);
  },
  updateFlashcard(id: string, payload: Partial<Flashcard>) {
    return this.update(id, payload);
  },
  deleteFlashcard(id: string) {
    return this.remove(id);
  },
};

// ==========================================
// QUIZZES TYPES & API
// ==========================================

export interface QuizQuestionItem {
  id: string;
  position?: number;
  question_text: string;
  choices: string[];
  selected_choice?: string | null;
  is_correct?: boolean | null;
  correct_answer?: string;
}

export interface QuizSession {
  id: string;
  deck?: string | null;
  deck_title?: string;
  document?: string | null;
  score: number | null;
  total_questions: number;
  created_at: string;
  finished_at: string | null;
  questions?: QuizQuestionItem[];
}

export const quizzesApi = {
  async getQuizSessions(): Promise<QuizSession[]> {
    const { results } = await fetchAllPages<QuizSession>(apiClient, "/quiz-sessions/");
    return results;
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
    const { results } = await fetchAllPages<TaskItem>(
      apiClient,
      "/tasks/",
      finalParams as Record<string, unknown>
    );
    return results;
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
  type?: string;
  notification_type?: string;
  title: string;
  body?: string;
  message?: string;
  data?: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
  expires_at?: string | null;
}

export interface PaginatedNotificationsResponse {
  results: NotificationItem[];
  next: string | null;
  count?: number;
}

export const notificationsApi = {
  async getNotificationsPage(pageParam?: string | number): Promise<PaginatedNotificationsResponse> {
    let url = "/notifications/";
    let params: Record<string, unknown> | undefined = undefined;

    if (typeof pageParam === "number") {
      params = { page: pageParam };
    } else if (typeof pageParam === "string" && pageParam) {
      if (pageParam.startsWith("http")) {
        url = pageParam;
      } else {
        params = { page: pageParam };
      }
    }

    const res = await apiClient.get<NotificationItem[] | DRFPaginatedResponse<NotificationItem>>(url, {
      params,
    });

    if (Array.isArray(res.data)) {
      return { results: res.data, next: null };
    }

    return {
      results: res.data.results || [],
      next: res.data.next || null,
      count: res.data.count,
    };
  },

  async getNotifications(): Promise<NotificationItem[]> {
    const page = await this.getNotificationsPage(1);
    return page.results;
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
