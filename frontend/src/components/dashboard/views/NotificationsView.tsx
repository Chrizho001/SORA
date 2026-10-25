"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Check,
  Sparkles,
  Loader2,
} from "lucide-react";
import { NotificationItem } from "@/lib/dashboard-api";
import {
  getNotificationConfig,
  TONE_BADGE_CLASSES,
} from "@/lib/notification-types";
import { MascotGuide } from "../MascotGuide";
import { Skeleton } from "@/components/ui/Skeleton";

interface NotificationsViewProps {
  notifications?: NotificationItem[];
  isLoading?: boolean;
  isError?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  onRetry?: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigateTab?: (tab: "documents" | "flashcards" | "quizzes" | "tasks") => void;
}

export function NotificationsView({
  notifications,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onRetry,
  onMarkRead,
  onMarkAllRead,
}: NotificationsViewProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const handleNotificationClick = (notif: NotificationItem) => {
    const notifType = notif.type || notif.notification_type || "";
    const config = getNotificationConfig(notifType);
    if (!notif.read_at) {
      onMarkRead(notif.id);
    }
    const href = config.href(notif.data);
    router.push(href);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 rounded-xl" />
            <Skeleton className="h-4 w-96 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
              Study Alerts & Activity Logs
            </h1>
            <p className="text-xs sm:text-sm text-muted font-body mt-0.5">
              Live updates when your AI summaries finish, cards are created, or assignment deadlines approach.
            </p>
          </div>
        </div>
        <div className="rounded-3xl bg-surface border border-rose-200 p-10 text-center space-y-4 shadow-soft">
          <Bell className="size-10 text-rose-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-ink">Failed to load notifications</h3>
            <p className="text-xs text-muted max-w-sm mx-auto font-body">
              An error occurred while fetching your alerts.
            </p>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#14161f] text-[#c8f560] text-xs font-display font-bold hover:bg-night transition-all shadow-md active:scale-95"
          >
            <span>Try again</span>
          </button>
        </div>
      </div>
    );
  }

  const safeNotifications = notifications ?? [];
  const unreadCount = safeNotifications.filter((n) => !n.read_at).length;
  const filteredNotifications = safeNotifications.filter((n) =>
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
              All Alerts ({safeNotifications.length})
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
              const notifType = notif.type || notif.notification_type || "";
              const config = getNotificationConfig(notifType);
              const Icon = config.icon;
              const badgeClass = TONE_BADGE_CLASSES[config.tone] || "bg-canvas text-ink border-line";
              const messageText = notif.body || notif.message || "";
              const isUnread = !notif.read_at;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group ${
                    isUnread
                      ? "bg-emerald-50/20 border-emerald-300/70 shadow-xs hover:border-emerald-400"
                      : "bg-surface hover:bg-canvas/50 border-line opacity-80 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="size-10 rounded-2xl bg-surface border border-line flex items-center justify-center shrink-0 shadow-2xs mt-0.5 group-hover:scale-105 transition-transform">
                      <Icon className="size-4.5 text-ink" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.625rem] font-display font-bold border ${badgeClass}`}
                        >
                          {config.label}
                        </span>
                        <h4 className="font-display font-bold text-xs sm:text-sm text-ink truncate group-hover:text-black">
                          {notif.title}
                        </h4>
                      </div>

                      {messageText && (
                        <p className="text-xs text-muted font-body mt-1 leading-relaxed line-clamp-2">
                          {messageText}
                        </p>
                      )}

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
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkRead(notif.id);
                        }}
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

            {/* Load More Button (FE-06) */}
            {hasNextPage && (
              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={isFetchingNextPage}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-canvas hover:bg-mist text-ink text-xs font-display font-semibold border border-line shadow-xs transition-all active:scale-95 disabled:opacity-50"
                >
                  {isFetchingNextPage && <Loader2 className="size-3.5 animate-spin" />}
                  <span>{isFetchingNextPage ? "Loading more..." : "Load More Notifications"}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
