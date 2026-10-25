"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Brain,
  CalendarDays,
  Bell,
  Settings,
  LogOut,
  User as UserIcon,
  MoreHorizontal,
  Zap,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { DashboardTab } from "./Sidebar";
import { User } from "@/lib/auth-api";

export function MobileHeader({
  user,
  unreadCount = 0,
  onNotificationClick,
  onLogout,
}: {
  user: User;
  unreadCount?: number;
  onNotificationClick: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="lg:hidden sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-line px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href="/" aria-label="SORA Home">
          <Logo tone="ink" />
        </Link>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[0.625rem] font-display font-medium">
          <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
          Live
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <button
          id="mobile-header-bell"
          type="button"
          onClick={onNotificationClick}
          className="relative size-9 rounded-full bg-canvas text-ink flex items-center justify-center hover:bg-mist transition-colors"
          aria-label="View notifications"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-rose-500 text-white text-[0.625rem] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User initials & logout */}
        <div className="flex items-center gap-1.5">
          <div className="size-8 rounded-full bg-[#14161f] text-[#c8f560] font-display font-bold text-xs flex items-center justify-center">
            {user.first_name ? user.first_name.charAt(0).toUpperCase() : <UserIcon className="size-3.5" />}
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="size-8 rounded-full text-muted hover:text-rose-600 hover:bg-mist flex items-center justify-center"
            title="Log out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

export function MobileBottomBar({
  unreadCount = 0,
  activeTab,
  onTabChange,
}: {
  unreadCount?: number;
  activeTab?: DashboardTab;
  onTabChange?: (tab: DashboardTab) => void;
}) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const mainItems = [
    {
      id: "dashboard" as const,
      label: "Home",
      href: "/dashboard",
      icon: LayoutDashboard,
      isActive: activeTab ? activeTab === "dashboard" : pathname === "/dashboard",
    },
    {
      id: "tasks" as const,
      label: "Tasks",
      href: "/dashboard/tasks",
      icon: CalendarDays,
      isActive: activeTab ? activeTab === "tasks" : pathname.startsWith("/dashboard/tasks"),
    },
    {
      id: "documents" as const,
      label: "Documents",
      href: "/dashboard/documents",
      icon: BookOpen,
      isActive: activeTab ? activeTab === "documents" : pathname.startsWith("/dashboard/documents"),
    },
    {
      id: "flashcards" as const,
      label: "Flashcards",
      href: "/dashboard/flashcards",
      icon: Brain,
      isActive: activeTab ? activeTab === "flashcards" : pathname.startsWith("/dashboard/flashcards"),
    },
  ];

  const moreItems = [
    {
      id: "quizzes" as const,
      label: "Speed Quizzes",
      href: "/dashboard/quizzes",
      icon: Zap,
      isActive: activeTab ? activeTab === "quizzes" : pathname.startsWith("/dashboard/quizzes"),
    },
    {
      id: "notifications" as const,
      label: "Notifications",
      href: "/dashboard/notifications",
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
      isActive: activeTab ? activeTab === "notifications" : pathname.startsWith("/dashboard/notifications"),
    },
    {
      id: "settings" as const,
      label: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
      isActive: activeTab ? activeTab === "settings" : pathname.startsWith("/dashboard/settings"),
    },
  ];

  const isMoreActive = moreItems.some((item) => item.isActive);

  return (
    <>
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#14161f]/95 backdrop-blur-md border-t border-[#232736] px-2 py-1.5 flex items-center justify-around shadow-2xl"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))" }}
        aria-label="Mobile Bottom Navigation"
      >
        {mainItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              id={`mobile-tab-${item.id}`}
              data-tab={item.id}
              href={item.href}
              onClick={() => onTabChange?.(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 rounded-2xl transition-all duration-200 active:scale-90 ${
                item.isActive
                  ? "text-[#c8f560] font-bold"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className={`size-5 transition-transform duration-200 ${item.isActive ? "scale-110" : ""}`} />
              <span className="text-[0.6875rem] font-display mt-0.5 tracking-tight">{item.label}</span>
              {item.isActive && (
                <span className="absolute bottom-0.5 size-1.5 rounded-full bg-[#c8f560] shadow-[0_0_8px_#c8f560]" />
              )}
            </Link>
          );
        })}

        {/* 5th item: More */}
        <button
          id="mobile-tab-more"
          data-tab="more"
          type="button"
          onClick={() => setIsMoreOpen(true)}
          className={`relative flex flex-col items-center justify-center py-1.5 px-2.5 rounded-2xl transition-all duration-200 active:scale-90 ${
            isMoreActive
              ? "text-[#c8f560] font-bold"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
          aria-label="More navigation options"
        >
          <div className="relative">
            <MoreHorizontal className={`size-5 transition-transform duration-200 ${isMoreActive ? "scale-110" : ""}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 size-2 rounded-full bg-rose-500 ring-2 ring-[#14161f]" />
            )}
          </div>
          <span className="text-[0.6875rem] font-display mt-0.5 tracking-tight">More</span>
          {isMoreActive && (
            <span className="absolute bottom-0.5 size-1.5 rounded-full bg-[#c8f560] shadow-[0_0_8px_#c8f560]" />
          )}
        </button>
      </nav>

      {/* More Bottom Sheet */}
      {isMoreOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsMoreOpen(false)}
        >
          <div
            className="w-full bg-[#14161f] border-t border-[#232736] rounded-t-3xl p-5 shadow-2xl flex flex-col space-y-4 animate-in slide-in-from-bottom duration-250"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="More options"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#232736]">
              <h3 className="font-display font-bold text-sm text-white">More Options</h3>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="size-8 rounded-full text-gray-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
                aria-label="Close more menu"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Menu Links */}
            <div className="space-y-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    id={`more-tab-${item.id}`}
                    data-tab={item.id}
                    href={item.href}
                    onClick={() => {
                      setIsMoreOpen(false);
                      onTabChange?.(item.id);
                    }}
                    className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-display font-semibold transition-all duration-150 active:scale-95 ${
                      item.isActive
                        ? "bg-[#c8f560] text-[#141413] font-bold shadow-md"
                        : "text-gray-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`size-4.5 ${item.isActive ? "text-[#141413]" : "text-gray-400"}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`inline-flex items-center justify-center size-5 rounded-full text-[0.625rem] font-bold ${
                          item.isActive
                            ? "bg-[#141413] text-[#c8f560]"
                            : "bg-rose-500 text-white"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
