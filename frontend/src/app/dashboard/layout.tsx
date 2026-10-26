"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { SoraMascot } from "@/components/auth/SoraMascot";
import { notify } from "@/components/auth/ToastProvider";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileHeader, MobileBottomBar } from "@/components/dashboard/MobileNav";
import { NotificationDrawer } from "@/components/dashboard/NotificationDrawer";
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/use-dashboard-queries";

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  // Protected route check
  useEffect(() => {
    if (!isLoading && !user && !isLoggingOut) {
      notify.info("Please sign in to access your study dashboard.", "Authentication Required");
      const currentPath =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : pathname;
      router.replace(`/login?next=${encodeURIComponent(currentPath)}`);
    }
  }, [isLoading, user, isLoggingOut, router, pathname]);

  // Notifications queries for drawer and badges
  const notificationsQuery = useNotifications();
  const unreadCountQuery = useUnreadNotificationCount();
  const unreadCount = unreadCountQuery.data ?? 0;

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  // Logout handler
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      notify.success("You have been signed out successfully.", "Logged Out");
      router.replace("/login");
    } catch {
      notify.error("An error occurred during logout.", "Logout Error");
      setIsLoggingOut(false);
    }
  };

  // While isLoading or no user, show full-screen skeleton; NEVER render children before auth resolves
  if (isLoading || (!user && !isLoggingOut)) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center bg-paper p-4">
        <div className="flex flex-col items-center justify-center animate-pulse">
          <SoraMascot size="md" emotion="thinking" showSpeechBubble={false} />
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-dvh bg-[#f8f7f4] flex flex-col antialiased">
      {/* Mobile Top Header */}
      <MobileHeader
        user={user}
        unreadCount={unreadCount}
        onNotificationClick={() => setIsNotificationDrawerOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Workspace Frame */}
      <div className="max-w-[1440px] w-full mx-auto p-3 sm:p-5 lg:p-6 flex gap-6 items-start flex-1">
        {/* Left Desktop Sidebar */}
        <Sidebar
          user={user}
          unreadCount={unreadCount}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Mobile Bottom Sticky Navigation */}
      <MobileBottomBar unreadCount={unreadCount} />

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notificationsQuery.data ?? []}
        onMarkRead={(id) => markReadMutation.mutate(id)}
        onMarkAllRead={() => markAllReadMutation.mutate()}
      />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <React.Suspense
      fallback={
        <main className="min-h-dvh flex flex-col items-center justify-center bg-paper p-4">
          <div className="flex flex-col items-center justify-center animate-pulse">
            <SoraMascot size="md" emotion="thinking" showSpeechBubble={false} />
          </div>
        </main>
      }
    >
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </React.Suspense>
  );
}
