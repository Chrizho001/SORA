import {
  Clock,
  AlertTriangle,
  FileText,
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

export interface NotificationTypeMeta {
  key: NotificationType;
  label: string;
  description: string;
  category: "tasks" | "study" | "security";
  icon: LucideIcon;
  getDeepLink: (data?: Record<string, unknown>) => string;
}

export const NOTIFICATION_TYPES: Record<NotificationType, NotificationTypeMeta> = {
  TASK_DUE_SOON: {
    key: "TASK_DUE_SOON",
    label: "Task Due Soon",
    description: "Reminders when study tasks or deadlines are approaching within 24 hours.",
    category: "tasks",
    icon: Clock,
    getDeepLink: (data) => (data?.task_id ? `/dashboard/tasks` : `/dashboard/tasks`),
  },
  TASK_OVERDUE: {
    key: "TASK_OVERDUE",
    label: "Task Overdue",
    description: "Urgent alerts when a scheduled study milestone or assignment is past due.",
    category: "tasks",
    icon: AlertTriangle,
    getDeepLink: () => `/dashboard/tasks`,
  },
  PDF_SUMMARY_READY: {
    key: "PDF_SUMMARY_READY",
    label: "PDF Summary Ready",
    description: "Notifications when AI lecture analysis and chapter summaries finish processing.",
    category: "study",
    icon: FileText,
    getDeepLink: (data) => (data?.document_id ? `/dashboard/documents` : `/dashboard/documents`),
  },
  PDF_SUMMARY_FAILED: {
    key: "PDF_SUMMARY_FAILED",
    label: "PDF Summary Failed",
    description: "Alerts when an uploaded lecture document could not be processed.",
    category: "study",
    icon: AlertCircle,
    getDeepLink: () => `/dashboard/documents`,
  },
  FLASHCARDS_READY: {
    key: "FLASHCARDS_READY",
    label: "Flashcards Ready",
    description: "Updates when new AI spaced repetition decks are generated and ready for review.",
    category: "study",
    icon: Brain,
    getDeepLink: (data) =>
      data?.deck_id ? `/dashboard/flashcards/${data.deck_id}` : `/dashboard/flashcards`,
  },
  FLASHCARDS_FAILED: {
    key: "FLASHCARDS_FAILED",
    label: "Flashcards Generation Failed",
    description: "Alerts if flashcard generation encountered an error.",
    category: "study",
    icon: AlertCircle,
    getDeepLink: () => `/dashboard/flashcards`,
  },
  QUIZ_READY: {
    key: "QUIZ_READY",
    label: "Speed Quiz Ready",
    description: "Alerts when an interactive drill has been synthesized from your lecture slides.",
    category: "study",
    icon: Zap,
    getDeepLink: (data) =>
      data?.quiz_id ? `/dashboard/quizzes/${data.quiz_id}` : `/dashboard/quizzes`,
  },
  QUIZ_GRADED: {
    key: "QUIZ_GRADED",
    label: "Speed Quiz Graded",
    description: "Performance reports and score breakdowns following a speed exam drill.",
    category: "study",
    icon: Trophy,
    getDeepLink: (data) =>
      data?.quiz_id ? `/dashboard/quizzes/${data.quiz_id}` : `/dashboard/quizzes`,
  },
  SECURITY_NEW_LOGIN: {
    key: "SECURITY_NEW_LOGIN",
    label: "New Device Login",
    description: "Security notifications when your account is accessed from a new device or browser.",
    category: "security",
    icon: ShieldAlert,
    getDeepLink: () => `/dashboard/settings`,
  },
  SECURITY_PASSWORD_CHANGED: {
    key: "SECURITY_PASSWORD_CHANGED",
    label: "Password Changed",
    description: "Confirmation alerts when your account password is changed or updated.",
    category: "security",
    icon: KeyRound,
    getDeepLink: () => `/dashboard/settings`,
  },
  SECURITY_EMAIL_CHANGED: {
    key: "SECURITY_EMAIL_CHANGED",
    label: "Email Address Updated",
    description: "Confirmation notices if your primary email account was changed.",
    category: "security",
    icon: Mail,
    getDeepLink: () => `/dashboard/settings`,
  },
};

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

export function getNotificationMeta(type: string): NotificationTypeMeta {
  if (type in NOTIFICATION_TYPES) {
    return NOTIFICATION_TYPES[type as NotificationType];
  }
  return {
    key: type as NotificationType,
    label: type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
    description: "System notification alert",
    category: "study",
    icon: Bell,
    getDeepLink: () => `/dashboard/notifications`,
  };
}
