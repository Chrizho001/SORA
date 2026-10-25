"use client";

import React, { useState } from "react";
import { notify } from "@/components/auth/ToastProvider";
import { formatApiErrorMessage } from "@/lib/axios-client";
import { TaskModal } from "@/components/dashboard/TaskModal";
import { TasksView } from "@/components/dashboard/views/TasksView";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
} from "@/lib/use-dashboard-queries";
import { CreateTaskPayload, TaskItem } from "@/lib/dashboard-api";

export default function TasksPage() {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const tasksQuery = useTasks();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  const handleToggleTask = (task: TaskItem) => {
    updateTaskMutation.mutate({
      id: task.id,
      payload: { is_completed: !task.is_completed },
    });
  };

  const handleCreateTask = async (payload: CreateTaskPayload) => {
    try {
      await createTaskMutation.mutateAsync(payload);
      setIsTaskModalOpen(false);
    } catch (err: unknown) {
      notify.error(formatApiErrorMessage(err), "Failed to Create Task");
    }
  };

  return (
    <>
      <TasksView
        tasks={tasksQuery.data}
        isLoading={tasksQuery.isLoading}
        isError={tasksQuery.isError}
        onRetry={() => tasksQuery.refetch()}
        onToggleTask={handleToggleTask}
        onDeleteTask={(id) => deleteTaskMutation.mutate(id)}
        onAddTaskClick={() => setIsTaskModalOpen(true)}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={handleCreateTask}
      />
    </>
  );
}
