"use client";

import React, { useState } from "react";
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
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);

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
    await createTaskMutation.mutateAsync(payload);
    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  const handleEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleUpdateTask = async (id: string, payload: Partial<CreateTaskPayload>) => {
    await updateTaskMutation.mutateAsync({ id, payload });
    setIsTaskModalOpen(false);
    setEditingTask(null);
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
        onAddTaskClick={() => {
          setEditingTask(null);
          setIsTaskModalOpen(true);
        }}
        onEditTask={handleEditTask}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        task={editingTask}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleCreateTask}
        onUpdate={handleUpdateTask}
      />
    </>
  );
}
