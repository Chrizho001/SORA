"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { NotificationsView } from "@/components/dashboard/views/NotificationsView";
import {
  useInfiniteNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/use-dashboard-queries";

export default function NotificationsPage() {
  const router = useRouter();
  const notificationsQuery = useInfiniteNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const allNotifications = useMemo(
    () => notificationsQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [notificationsQuery.data]
  );

  return (
    <NotificationsView
      notifications={allNotifications}
      isLoading={notificationsQuery.isLoading}
      isError={notificationsQuery.isError}
      hasNextPage={notificationsQuery.hasNextPage}
      isFetchingNextPage={notificationsQuery.isFetchingNextPage}
      onLoadMore={() => notificationsQuery.fetchNextPage()}
      onRetry={() => notificationsQuery.refetch()}
      onMarkRead={(id) => markReadMutation.mutate(id)}
      onMarkAllRead={() => markAllReadMutation.mutate()}
      onNavigateTab={(tab) => router.push(`/dashboard/${tab}`)}
    />
  );
}
