"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { SoraMascot } from "@/components/auth/SoraMascot";
import { notify } from "@/components/auth/ToastProvider";
import { Sidebar, DashboardTab } from "@/components/dashboard/Sidebar";
import { MobileHeader, MobileBottomBar } from "@/components/dashboard/MobileNav";
import { DocumentUploadModal } from "@/components/dashboard/DocumentUploadModal";
import { TaskModal } from "@/components/dashboard/TaskModal";
import { NotificationDrawer } from "@/components/dashboard/NotificationDrawer";
import { DashboardHomeView } from "@/components/dashboard/views/DashboardHomeView";
import { DocumentsView } from "@/components/dashboard/views/DocumentsView";
import { FlashcardsView } from "@/components/dashboard/views/FlashcardsView";
import { QuizzesView } from "@/components/dashboard/views/QuizzesView";
import { TasksView } from "@/components/dashboard/views/TasksView";
import { NotificationsView } from "@/components/dashboard/views/NotificationsView";
import { SettingsView } from "@/components/dashboard/views/SettingsView";
import {
  useDocuments,
  useUploadDocument,
  useRetryDocument,
  useGenerateFlashcards,
  useDeleteDocument,
  useFlashcards,
  useQuizSessions,
  useStartQuiz,
  useSubmitQuiz,
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/lib/use-dashboard-queries";
import { CreateTaskPayload, TaskItem } from "@/lib/dashboard-api";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>("dashboard");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  // Protected route check
  useEffect(() => {
    if (!isLoading && !user) {
      notify.info("Please sign in to access your study dashboard.", "Authentication Required");
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  // Queries
  const documentsQuery = useDocuments();
  const tasksQuery = useTasks();
  const flashcardsQuery = useFlashcards();
  const quizSessionsQuery = useQuizSessions();
  const notificationsQuery = useNotifications();
  const unreadCountQuery = useUnreadNotificationCount();

  const unreadCount = unreadCountQuery.data ?? 0;

  // Mutations
  const uploadDocMutation = useUploadDocument();
  const retryDocMutation = useRetryDocument();
  const generateCardsMutation = useGenerateFlashcards();
  const deleteDocMutation = useDeleteDocument();
  const startQuizMutation = useStartQuiz();
  const submitQuizMutation = useSubmitQuiz();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
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

  // Task toggle handler
  const handleToggleTask = (task: TaskItem) => {
    updateTaskMutation.mutate({
      id: task.id,
      payload: { is_completed: !task.is_completed },
    });
  };

  // Task creation handler
  const handleCreateTask = async (payload: CreateTaskPayload) => {
    await createTaskMutation.mutateAsync(payload);
  };

  // Document upload handler
  const handleUploadDocument = async (file: File) => {
    return await uploadDocMutation.mutateAsync(file);
  };

  // Loading state
  if (isLoading || (!user && !isLoggingOut)) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center bg-paper p-4">
        <div className="flex flex-col items-center justify-center animate-pulse">
          <SoraMascot
            size="md"
            emotion="thinking"
            showSpeechBubble={false}
          />
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
        {/* Left Desktop Sidebar matching design/dashboard.webp */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          user={user}
          unreadCount={unreadCount}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {activeTab === "dashboard" && (
            <DashboardHomeView
              user={user}
              documents={documentsQuery.data}
              tasks={tasksQuery.data}
              flashcards={flashcardsQuery.data}
              quizSessions={quizSessionsQuery.data}
              isLoading={
                documentsQuery.isLoading ||
                tasksQuery.isLoading ||
                flashcardsQuery.isLoading ||
                quizSessionsQuery.isLoading
              }
              isError={
                documentsQuery.isError ||
                tasksQuery.isError ||
                flashcardsQuery.isError ||
                quizSessionsQuery.isError
              }
              onRetry={() => {
                documentsQuery.refetch();
                tasksQuery.refetch();
                flashcardsQuery.refetch();
                quizSessionsQuery.refetch();
              }}
              onUploadClick={() => setIsUploadModalOpen(true)}
              onAddTaskClick={() => setIsTaskModalOpen(true)}
              onToggleTask={handleToggleTask}
              onDeleteTask={(id) => deleteTaskMutation.mutate(id)}
              onGenerateFlashcards={(docId) => generateCardsMutation.mutate(docId)}
              onStartQuiz={async (docId) => {
                await startQuizMutation.mutateAsync(docId);
                setActiveTab("quizzes");
              }}
              onViewDocument={() => setActiveTab("documents")}
              onNavigateTab={setActiveTab}
              onRetryDocument={(docId) => retryDocMutation.mutate(docId)}
            />
          )}

          {activeTab === "documents" && (
            <DocumentsView
              documents={documentsQuery.data}
              isLoading={documentsQuery.isLoading}
              isError={documentsQuery.isError}
              onRetry={() => documentsQuery.refetch()}
              onUploadClick={() => setIsUploadModalOpen(true)}
              onGenerateFlashcards={(docId) => generateCardsMutation.mutate(docId)}
              onStartQuiz={async (docId) => {
                await startQuizMutation.mutateAsync(docId);
                setActiveTab("quizzes");
              }}
              onDeleteDocument={(docId) => deleteDocMutation.mutate(docId)}
              onRetryDocument={(docId) => retryDocMutation.mutate(docId)}
            />
          )}

          {activeTab === "flashcards" && (
            <FlashcardsView
              documents={documentsQuery.data}
              flashcards={flashcardsQuery.data}
              isLoading={flashcardsQuery.isLoading || documentsQuery.isLoading}
              isError={flashcardsQuery.isError}
              onRetry={() => {
                flashcardsQuery.refetch();
                documentsQuery.refetch();
              }}
              onGenerateFlashcards={(docId) => generateCardsMutation.mutate(docId)}
              onNavigateDocuments={() => setActiveTab("documents")}
            />
          )}

          {activeTab === "quizzes" && (
            <QuizzesView
              documents={documentsQuery.data}
              quizSessions={quizSessionsQuery.data}
              isLoading={quizSessionsQuery.isLoading || documentsQuery.isLoading}
              isError={quizSessionsQuery.isError}
              onRetry={() => {
                quizSessionsQuery.refetch();
                documentsQuery.refetch();
              }}
              onStartQuiz={(docId) => startQuizMutation.mutateAsync(docId)}
              onSubmitQuiz={(sessionId, answers) =>
                submitQuizMutation.mutateAsync({ sessionId, answers })
              }
              onNavigateDocuments={() => setActiveTab("documents")}
            />
          )}

          {activeTab === "tasks" && (
            <TasksView
              tasks={tasksQuery.data}
              isLoading={tasksQuery.isLoading}
              isError={tasksQuery.isError}
              onRetry={() => tasksQuery.refetch()}
              onToggleTask={handleToggleTask}
              onDeleteTask={(id) => deleteTaskMutation.mutate(id)}
              onAddTaskClick={() => setIsTaskModalOpen(true)}
            />
          )}

          {activeTab === "notifications" && (
            <NotificationsView
              notifications={notificationsQuery.data}
              isLoading={notificationsQuery.isLoading}
              isError={notificationsQuery.isError}
              onRetry={() => notificationsQuery.refetch()}
              onMarkRead={(id) => markReadMutation.mutate(id)}
              onMarkAllRead={() => markAllReadMutation.mutate()}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === "settings" && <SettingsView user={user} />}
        </main>
      </div>

      {/* Mobile Bottom Sticky Navigation */}
      <MobileBottomBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />


      {/* Modals & Drawers */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadDocument}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleCreateTask}
      />

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
