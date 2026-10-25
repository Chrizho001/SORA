"use client";

import React from "react";
import Link from "next/link";
import {
  X,
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

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  DOCUMENT_SUMMARY_SUCCESS: <BookOpen className="size-4 text-emerald-600" />,
  DOCUMENT_SUMMARY_FAILED: <BookOpen className="size-4 text-rose-600" />,
  FLASHCARD_GENERATION_SUCCESS: <Brain className="size-4 text-purple-600" />,
  FLASHCARD_GENERATION_FAILED: <Brain className="size-4 text-rose-600" />,
  QUIZ_SESSION_COMPLETED: <Zap className="size-4 text-amber-600" />,
  TASK_DUE_SOON: <Clock className="size-4 text-sky-600" />,
  DEFAULT: <Bell className="size-4 text-ink" />,
};

export function NotificationDrawer({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
}: NotificationDrawerProps) {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-surface border-l border-line p-6 shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Top Header */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-line">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-2xl bg-[#c8f560] text-[#141413] flex items-center justify-center font-bold">
                <Bell className="size-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-ink">Notifications</h3>
                <p className="text-xs text-muted font-body">
                  {unreadCount > 0
                    ? `${unreadCount} unread update${unreadCount > 1 ? "s" : ""}`
                    : "All updates are read"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-canvas hover:bg-mist text-[0.6875rem] font-display font-semibold text-ink border border-line transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="size-3 text-emerald-600" />
                  <span>Mark All Read</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="size-8 rounded-full text-muted hover:bg-mist hover:text-ink flex items-center justify-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2.5 pr-1">
          {notifications.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="size-12 rounded-2xl bg-canvas mx-auto flex items-center justify-center text-subtle">
                <Bell className="size-6" />
              </div>
              <p className="text-sm font-display font-semibold text-ink">No notifications</p>
              <p className="text-xs text-muted max-w-xs mx-auto font-body">
                We will notify you here when your lecture summaries, flashcard generation, or quiz scores are ready!
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const icon = NOTIFICATION_ICONS[notif.notification_type] || NOTIFICATION_ICONS.DEFAULT;
              const isUnread = !notif.read_at;

              return (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-2xl border transition-all duration-200 flex items-start gap-3 ${
                    isUnread
                      ? "bg-emerald-50/20 border-emerald-200/80 shadow-2xs"
                      : "bg-surface hover:bg-canvas/40 border-line opacity-75"
                  }`}
                >
                  <div className="size-8 rounded-xl bg-canvas border border-line flex items-center justify-center shrink-0 mt-0.5">
                    {icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display font-bold text-xs sm:text-sm text-ink truncate">
                        {notif.title}
                      </p>
                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => onMarkRead(notif.id)}
                          className="size-5 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 transition-colors"
                          title="Mark read"
                        >
                          <Check className="size-3" />
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-muted font-body mt-0.5 line-clamp-3">
                      {notif.message}
                    </p>

                    <span className="text-[0.6875rem] text-subtle font-body mt-1 block">
                      {new Date(notif.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-line text-xs font-body text-muted flex items-center justify-between">
          <Link
            href="/dashboard/notifications"
            onClick={onClose}
            className="text-xs font-display font-semibold text-ink hover:underline flex items-center gap-1"
          >
            <span>View all notifications</span>
          </Link>
          <span className="text-muted font-display text-[0.6875rem] flex items-center gap-1">
            <Sparkles className="size-3 text-amber-500" />
            <span>Real-time</span>
          </span>
        </div>
      </div>
    </div>
  );
}
