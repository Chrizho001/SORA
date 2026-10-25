"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { NotificationsView } from "@/components/dashboard/views/NotificationsView";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/use-dashboard-queries";

export default function NotificationsPage() {
  const router = useRouter();
  const notificationsQuery = useNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  return (
    <NotificationsView
      notifications={notificationsQuery.data}
      isLoading={notificationsQuery.isLoading}
      isError={notificationsQuery.isError}
      onRetry={() => notificationsQuery.refetch()}
      onMarkRead={(id) => markReadMutation.mutate(id)}
      onMarkAllRead={() => markAllReadMutation.mutate()}
      onNavigateTab={(tab) => router.push(`/dashboard/${tab}`)}
    />
  );
}
