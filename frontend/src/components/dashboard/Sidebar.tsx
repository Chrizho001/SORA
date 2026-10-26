"use client";

import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  Brain,
  Zap,
  CalendarDays,
  Bell,
  Settings,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { PwaInstallCard } from "./PwaInstallCard";
import { User } from "@/lib/auth-api";

import { usePathname } from "next/navigation";

export type DashboardTab =
  | "dashboard"
  | "documents"
  | "flashcards"
  | "quizzes"
  | "tasks"
  | "notifications"
  | "settings";

interface SidebarProps {
  activeTab?: DashboardTab;
  onTabChange?: (tab: DashboardTab) => void;
  user: User;
  unreadCount?: number;
  onLogout: () => void;
  isLoggingOut?: boolean;
}

export function Sidebar({
  activeTab,
  onTabChange,
  user,
  unreadCount = 0,
  onLogout,
  isLoggingOut = false,
}: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      id: "dashboard" as const,
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "documents" as const,
      href: "/dashboard/documents",
      label: "Documents",
      icon: BookOpen,
    },
    {
      id: "flashcards" as const,
      href: "/dashboard/flashcards",
      label: "Flashcards",
      icon: Brain,
    },
    {
      id: "quizzes" as const,
      href: "/dashboard/quizzes",
      label: "Speed Quizzes",
      icon: Zap,
    },
    {
      id: "tasks" as const,
      href: "/dashboard/tasks",
      label: "Schedule & Tasks",
      icon: CalendarDays,
    },
    {
      id: "notifications" as const,
      href: "/dashboard/notifications",
      label: "Notifications",
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      id: "settings" as const,
      href: "/dashboard/settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <aside
      id="desktop-sidebar"
      className="w-64 shrink-0 hidden lg:flex flex-col justify-between bg-[#14161f] text-gray-300 p-5 rounded-3xl min-h-[calc(100vh-2rem)] sticky top-4 shadow-xl border border-[#232736]"
    >
      {/* Top Branding & Navigation */}
      <div className="space-y-6">
        {/* SORA Brand Logo */}
        <div className="px-2 pt-1 flex items-center justify-between">
          <Link href="/" aria-label="SORA Home" className="flex items-center gap-2">
            <Logo tone="light" />
          </Link>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1.5" aria-label="Dashboard Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab
              ? activeTab === item.id
              : item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                data-tab={item.id}
                href={item.href}
                onClick={() => onTabChange?.(item.id)}
                className={`group w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-display font-semibold transition-all duration-200 active:scale-95 ${
                  isActive
                    ? "bg-[#c8f560] text-[#141413] shadow-[0_4px_20px_rgba(200,245,96,0.3)] font-bold scale-[1.02]"
                    : "text-gray-400 hover:text-white hover:bg-white/10 hover:translate-x-1.5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`size-4.5 transition-transform duration-200 ${
                      isActive ? "text-[#141413]" : "text-gray-400 group-hover:scale-110 group-hover:text-[#c8f560]"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`inline-flex items-center justify-center size-5 rounded-full text-[0.625rem] font-bold transition-transform group-hover:scale-110 ${
                      isActive
                        ? "bg-[#141413] text-[#c8f560]"
                        : "bg-rose-500 text-white shadow-xs"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom PWA Card & User Profile */}
      <div className="space-y-4 pt-4 border-t border-[#232736]/60">
        {/* PWA Download Card inspired by inspiration design */}
        <PwaInstallCard />

        {/* User Card & Logout */}
        <div className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all duration-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-full bg-[#c8f560] text-[#141413] flex items-center justify-center font-display font-bold text-xs shrink-0 shadow-2xs">
              {user.first_name ? user.first_name.charAt(0).toUpperCase() : <UserIcon className="size-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-display font-bold text-white truncate">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-[0.6875rem] text-gray-400 truncate">{user.email}</p>
            </div>
          </div>

          <button
            id="logout-button"
            data-testid="logout-button"
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="p-2 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
