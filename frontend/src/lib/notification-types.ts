import {
  Clock,
  AlertTriangle,
  BookOpen,
  AlertCircle,
  Brain,
  Zap,
  Trophy,
  ShieldAlert,
  KeyRound,
  Mail,
  Bell,
  LucideIcon,
} from "lucide-react";

export type NotificationType =
  | "TASK_DUE_SOON"
  | "TASK_OVERDUE"
  | "PDF_SUMMARY_READY"
  | "PDF_SUMMARY_FAILED"
  | "FLASHCARDS_READY"
  | "FLASHCARDS_FAILED"
  | "QUIZ_READY"
  | "QUIZ_GRADED"
  | "SECURITY_NEW_LOGIN"
  | "SECURITY_PASSWORD_CHANGED"
  | "SECURITY_EMAIL_CHANGED";

export type NotificationTone = "info" | "success" | "warning" | "danger";

export interface NotificationTypeMeta {
  key: NotificationType | "DEFAULT";
  label: string;
  description: string;
  category: "tasks" | "study" | "security";
  icon: LucideIcon;
  tone: NotificationTone;
  href: (data?: Record<string, unknown> | null) => string;
}

export const NOTIFICATION_TYPES: Record<NotificationType, NotificationTypeMeta> = {
  TASK_DUE_SOON: {
    key: "TASK_DUE_SOON",
    label: "Task Due Soon",
    description: "Reminders when study tasks or deadlines are approaching within 24 hours.",
    category: "tasks",
    icon: Clock,
    tone: "warning",
    href: () => "/dashboard/tasks",
  },
  TASK_OVERDUE: {
    key: "TASK_OVERDUE",
    label: "Task Overdue",
    description: "Urgent alerts when a scheduled study milestone or assignment is past due.",
    category: "tasks",
    icon: AlertTriangle,
    tone: "danger",
    href: () => "/dashboard/tasks",
  },
  PDF_SUMMARY_READY: {
    key: "PDF_SUMMARY_READY",
    label: "Summary Ready",
    description: "Notifications when AI lecture analysis and chapter summaries finish processing.",
    category: "study",
    icon: BookOpen,
    tone: "success",
    href: () => "/dashboard/documents",
  },
  PDF_SUMMARY_FAILED: {
    key: "PDF_SUMMARY_FAILED",
    label: "Summary Failed",
    description: "Alerts when an uploaded lecture document could not be processed.",
    category: "study",
    icon: AlertCircle,
    tone: "danger",
    href: () => "/dashboard/documents",
  },
  FLASHCARDS_READY: {
    key: "FLASHCARDS_READY",
    label: "Flashcards Ready",
    description: "Updates when new AI spaced repetition decks are generated and ready for review.",
    category: "study",
    icon: Brain,
    tone: "success",
    href: (data) =>
      data?.deck_id ? `/dashboard/flashcards/${data.deck_id}` : "/dashboard/flashcards",
  },
  FLASHCARDS_FAILED: {
    key: "FLASHCARDS_FAILED",
    label: "Flashcards Failed",
    description: "Alerts if flashcard generation encountered an error.",
    category: "study",
    icon: AlertCircle,
    tone: "danger",
    href: () => "/dashboard/flashcards",
  },
  QUIZ_READY: {
    key: "QUIZ_READY",
    label: "Speed Quiz Ready",
    description: "Alerts when an interactive drill has been synthesized from your lecture slides.",
    category: "study",
    icon: Zap,
    tone: "info",
    href: (data) => {
      const sessionId = data?.quiz_session_id || data?.quiz_id;
      return sessionId ? `/dashboard/quizzes/${sessionId}` : "/dashboard/quizzes";
    },
  },
  QUIZ_GRADED: {
    key: "QUIZ_GRADED",
    label: "Speed Quiz Graded",
    description: "Performance reports and score breakdowns following a speed exam drill.",
    category: "study",
    icon: Trophy,
    tone: "success",
    href: (data) => {
      const sessionId = data?.quiz_session_id || data?.quiz_id;
      return sessionId ? `/dashboard/quizzes/${sessionId}` : "/dashboard/quizzes";
    },
  },
  SECURITY_NEW_LOGIN: {
    key: "SECURITY_NEW_LOGIN",
    label: "New Device Login",
    description: "Security notifications when your account is accessed from a new device or browser.",
    category: "security",
    icon: ShieldAlert,
    tone: "warning",
    href: () => "/dashboard/settings",
  },
  SECURITY_PASSWORD_CHANGED: {
    key: "SECURITY_PASSWORD_CHANGED",
    label: "Password Changed",
    description: "Confirmation alerts when your account password is changed or updated.",
    category: "security",
    icon: KeyRound,
    tone: "info",
    href: () => "/dashboard/settings",
  },
  SECURITY_EMAIL_CHANGED: {
    key: "SECURITY_EMAIL_CHANGED",
    label: "Email Address Updated",
    description: "Confirmation notices if your primary email account was changed.",
    category: "security",
    icon: Mail,
    tone: "info",
    href: () => "/dashboard/settings",
  },
};

export const FALLBACK_NOTIFICATION: NotificationTypeMeta = {
  key: "DEFAULT",
  label: "System Alert",
  description: "System notification alert",
  category: "study",
  icon: Bell,
  tone: "info",
  href: (data) => {
    if (data?.quiz_session_id || data?.quiz_id) {
      return `/dashboard/quizzes/${data.quiz_session_id || data.quiz_id}`;
    }
    if (data?.deck_id) return `/dashboard/flashcards/${data.deck_id}`;
    if (data?.document_id) return "/dashboard/documents";
    if (data?.task_id) return "/dashboard/tasks";
    return "/dashboard/notifications";
  },
};

export const NOTIFICATION_MAP = NOTIFICATION_TYPES;
export const notificationTypes = NOTIFICATION_TYPES;
export const fallback = FALLBACK_NOTIFICATION;
export const FALLBACK = FALLBACK_NOTIFICATION;
export const fallbackNotification = FALLBACK_NOTIFICATION;

export const ALL_NOTIFICATION_TYPES: NotificationType[] = [
  "TASK_DUE_SOON",
  "TASK_OVERDUE",
  "PDF_SUMMARY_READY",
  "PDF_SUMMARY_FAILED",
  "FLASHCARDS_READY",
  "FLASHCARDS_FAILED",
  "QUIZ_READY",
  "QUIZ_GRADED",
  "SECURITY_NEW_LOGIN",
  "SECURITY_PASSWORD_CHANGED",
  "SECURITY_EMAIL_CHANGED",
];

export const TONE_BADGE_CLASSES: Record<NotificationTone, string> = {
  info: "bg-sky-50 text-sky-800 border-sky-200",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  danger: "bg-rose-50 text-rose-800 border-rose-200",
};

export function getNotificationMeta(type?: string): NotificationTypeMeta {
  if (type && type in NOTIFICATION_TYPES) {
    return NOTIFICATION_TYPES[type as NotificationType];
  }
  return FALLBACK_NOTIFICATION;
}

export const getNotificationConfig = getNotificationMeta;
