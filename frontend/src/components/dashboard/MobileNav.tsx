"use client";

import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  Brain,
  CalendarDays,
  Bell,
  Settings,
  LogOut,
  User as UserIcon,
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
  activeTab,
  onTabChange,
}: {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}) {
  const items = [
    { id: "dashboard" as const, label: "Home", icon: LayoutDashboard },
    { id: "documents" as const, label: "Docs", icon: BookOpen },
    { id: "flashcards" as const, label: "Cards", icon: Brain },
    { id: "tasks" as const, label: "Schedule", icon: CalendarDays },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#14161f]/95 backdrop-blur-md border-t border-[#232736] px-3 py-2 flex items-center justify-around shadow-2xl safe-area-pb"
      aria-label="Mobile Bottom Navigation"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            id={`mobile-tab-${item.id}`}
            data-tab={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 active:scale-90 ${
              isActive
                ? "text-[#c8f560] font-bold"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Icon className={`size-5 transition-transform duration-200 ${isActive ? "scale-110" : ""}`} />
            <span className="text-[0.6875rem] font-display mt-0.5 tracking-tight">{item.label}</span>
            {isActive && (
              <span className="absolute bottom-0.5 size-1.5 rounded-full bg-[#c8f560] shadow-[0_0_8px_#c8f560]" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
