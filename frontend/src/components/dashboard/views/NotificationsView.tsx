"use client";

import React, { useState } from "react";
import {
  Bell,
  CheckCheck,
  Check,
  Clock,
  Sparkles,
  BookOpen,
  Brain,
  Zap,
} from "lucide-react";
import { NotificationItem } from "@/lib/dashboard-api";
import { MascotGuide } from "../MascotGuide";

interface NotificationsViewProps {
  notifications: NotificationItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigateTab?: (tab: "documents" | "flashcards" | "quizzes" | "tasks") => void;
}

const NOTIFICATION_CONFIG: Record<
  string,
  { icon: React.ReactNode; badge: string; color: string }
> = {
  DOCUMENT_SUMMARY_SUCCESS: {
    icon: <BookOpen className="size-4.5 text-emerald-600" />,
    badge: "Summary Ready",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  DOCUMENT_SUMMARY_FAILED: {
    icon: <BookOpen className="size-4.5 text-rose-600" />,
    badge: "Summary Error",
    color: "bg-rose-50 text-rose-800 border-rose-200",
  },
  FLASHCARD_GENERATION_SUCCESS: {
    icon: <Brain className="size-4.5 text-purple-600" />,
    badge: "Flashcards Ready",
    color: "bg-purple-50 text-purple-800 border-purple-200",
  },
  FLASHCARD_GENERATION_FAILED: {
    icon: <Brain className="size-4.5 text-rose-600" />,
    badge: "Flashcard Error",
    color: "bg-rose-50 text-rose-800 border-rose-200",
  },
  QUIZ_SESSION_COMPLETED: {
    icon: <Zap className="size-4.5 text-amber-600" />,
    badge: "Quiz Finished",
    color: "bg-amber-50 text-amber-800 border-amber-200",
  },
  TASK_DUE_SOON: {
    icon: <Clock className="size-4.5 text-sky-600" />,
    badge: "Deadline Approaching",
    color: "bg-sky-50 text-sky-800 border-sky-200",
  },
};

export function NotificationsView({
  notifications,
  onMarkRead,
  onMarkAllRead,
}: NotificationsViewProps) {
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const filteredNotifications = notifications.filter((n) =>
    filter === "unread" ? !n.read_at : true
  );

  return (
    <div className="space-y-6 max-w-4xl pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
              Notifications & System Alerts
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-xs font-display font-bold">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted font-body mt-0.5">
            Live Celery AI background processing updates, study deadlines, and quiz score alerts.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-night hover:bg-ink text-[#c8f560] text-xs font-display font-bold shadow-sm transition-transform active:scale-95 self-start sm:self-auto"
          >
            <CheckCheck className="size-4" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Mascot Section Guide */}
      <MascotGuide
        section="notifications"
        onActionClick={unreadCount > 0 ? onMarkAllRead : undefined}
        actionLabel="Mark All as Read"
      />

      {/* Main Notifications Card */}
      <div className="rounded-3xl bg-surface border border-line p-5 sm:p-6 shadow-soft space-y-4">
        {/* Filter Tabs */}
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2 text-xs font-display">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-full transition-all duration-200 active:scale-95 ${
                filter === "all"
                  ? "bg-night text-[#c8f560] font-bold shadow-xs"
                  : "bg-canvas text-muted hover:text-ink hover:bg-mist"
              }`}
            >
              All Alerts ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`px-3 py-1.5 rounded-full transition-all duration-200 active:scale-95 ${
                filter === "unread"
                  ? "bg-night text-[#c8f560] font-bold shadow-xs"
                  : "bg-canvas text-muted hover:text-ink hover:bg-mist"
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <span className="text-[0.6875rem] text-muted hidden sm:inline-flex items-center gap-1">
            <Sparkles className="size-3 text-amber-500" />
            <span>Real-time Celery Sync</span>
          </span>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="size-14 rounded-3xl bg-canvas mx-auto flex items-center justify-center text-subtle border border-line">
              <Bell className="size-6 text-muted" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-display font-semibold text-ink">
                {filter === "unread" ? "No unread notifications!" : "You're all caught up!"}
              </p>
              <p className="text-xs text-muted max-w-sm mx-auto font-body">
                Whenever long-running lecture summaries, flashcard generation, or quiz sessions finish, you&apos;ll see them here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notif) => {
              const config = NOTIFICATION_CONFIG[notif.notification_type] || {
                icon: <Bell className="size-4.5 text-ink" />,
                badge: "System Alert",
                color: "bg-canvas text-ink border-line",
              };
              const isUnread = !notif.read_at;

              return (
                <div
                  key={notif.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isUnread
                      ? "bg-emerald-50/20 border-emerald-300/70 shadow-xs"
                      : "bg-surface hover:bg-canvas/40 border-line opacity-75"
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="size-10 rounded-2xl bg-surface border border-line flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      {config.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.625rem] font-display font-bold border ${config.color}`}
                        >
                          {config.badge}
                        </span>
                        <h4 className="font-display font-bold text-xs sm:text-sm text-ink truncate">
                          {notif.title}
                        </h4>
                      </div>

                      <p className="text-xs text-muted font-body mt-1 leading-relaxed">
                        {notif.message}
                      </p>

                      <span className="text-[0.6875rem] text-subtle font-body mt-1.5 block">
                        {new Date(notif.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/60">
                    {isUnread && (
                      <button
                        type="button"
                        onClick={() => onMarkRead(notif.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canvas hover:bg-mist text-ink text-xs font-display font-semibold border border-line transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        <Check className="size-3.5 text-emerald-600" />
                        <span>Mark as Read</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
