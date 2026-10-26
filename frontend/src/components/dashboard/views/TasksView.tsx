"use client";

import React, { useState } from "react";
import {
  Plus,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { TaskItem } from "@/lib/dashboard-api";
import { MascotGuide } from "../MascotGuide";
import { MiniCalendar } from "../MiniCalendar";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toLocalDateKey, isOverdue, isDueSoon } from "@/lib/dates";

interface TasksViewProps {
  tasks?: TaskItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onToggleTask: (task: TaskItem) => void;
  onDeleteTask: (id: string) => void;
  onAddTaskClick: () => void;
  onEditTask?: (task: TaskItem) => void;
}

export function TasksView({
  tasks,
  isLoading,
  isError,
  onRetry,
  onToggleTask,
  onDeleteTask,
  onAddTaskClick,
  onEditTask,
}: TasksViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<number | null>(null);
  const [onlyNoDeadline, setOnlyNoDeadline] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskItem | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 rounded-xl" />
            <Skeleton className="h-4 w-96 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4">
            <Skeleton className="h-72 rounded-3xl" />
          </div>
          <div className="lg:col-span-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
              Schedule & Task Manager
            </h1>
            <p className="text-xs sm:text-sm text-muted font-body mt-0.5">
              Organize study blocks, assignment due dates, and exam milestones with date pickers.
            </p>
          </div>
        </div>
        <div className="rounded-3xl bg-surface border border-rose-200 p-10 text-center space-y-4 shadow-soft">
          <Clock className="size-10 text-rose-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-ink">Failed to load study tasks</h3>
            <p className="text-xs text-muted max-w-sm mx-auto font-body">
              An error occurred while loading your schedule.
            </p>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#14161f] text-[#c8f560] text-xs font-display font-bold hover:bg-night transition-all shadow-md active:scale-95"
          >
            <span>Try again</span>
          </button>
        </div>
      </div>
    );
  }

  const safeTasks = tasks ?? [];

  // Filter logic:
  // If selectedDate is set, tasks with NO deadline do NOT match! Only tasks whose local date equals selectedDate.
  const filteredTasks = safeTasks.filter((t) => {
    if (selectedDate) {
      if (!t.due_at) return false;
      if (toLocalDateKey(t.due_at) !== selectedDate) return false;
    }
    if (onlyNoDeadline) {
      if (t.due_at) return false;
    }
    if (priorityFilter !== null && t.priority !== priorityFilter) return false;
    return true;
  });

  const scheduledTasks = filteredTasks.filter((t) => Boolean(t.due_at));
  const noDeadlineTasks = filteredTasks.filter((t) => !t.due_at);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
            Schedule & Task Manager
          </h1>
          <p className="text-xs sm:text-sm text-muted font-body mt-0.5">
            Organize study blocks, assignment due dates, and exam milestones with date pickers.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddTaskClick}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#14161f] hover:bg-night text-[#c8f560] text-xs font-display font-bold transition-all shadow-md active:scale-95 self-start sm:self-auto"
        >
          <Plus className="size-4" />
          <span>Add Study Task</span>
        </button>
      </div>

      {/* Mascot Section Guide */}
      <MascotGuide
        section="tasks"
        onActionClick={onAddTaskClick}
        actionLabel="+ New Task"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar on Left/Top (4 cols) */}
        <div className="lg:col-span-4">
          <MiniCalendar
            tasks={safeTasks}
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              if (date) setOnlyNoDeadline(false);
            }}
            onAddTaskClick={onAddTaskClick}
          />
        </div>

        {/* Full Task List on Right (8 cols) */}
        <div className="lg:col-span-8 rounded-3xl bg-surface border border-line p-6 shadow-soft space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-5 text-ink" />
              <h3 className="font-display font-bold text-base text-ink">
                {selectedDate
                  ? `Tasks Scheduled for ${selectedDate}`
                  : onlyNoDeadline
                  ? "Tasks with No Deadline"
                  : "All Scheduled Tasks"}
              </h3>
              <span className="size-5 rounded-full bg-mist text-[0.6875rem] font-bold flex items-center justify-center text-ink">
                {filteredTasks.length}
              </span>
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="inline-flex items-center gap-1 rounded-full bg-mist px-2 py-0.5 text-[0.6875rem] font-display font-medium text-muted hover:text-ink ml-1"
                  title="Clear date filter"
                >
                  <RotateCcw className="size-2.5" />
                  <span>Clear date</span>
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto text-xs font-display">
              <button
                type="button"
                onClick={() => {
                  setPriorityFilter(null);
                  setOnlyNoDeadline(false);
                }}
                className={`px-3 py-1 rounded-full transition-all duration-200 active:scale-95 ${
                  priorityFilter === null && !onlyNoDeadline
                    ? "bg-night text-[#c8f560] font-bold shadow-xs"
                    : "bg-canvas text-muted hover:text-ink hover:bg-mist"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => {
                  setOnlyNoDeadline(true);
                  setSelectedDate(null);
                }}
                className={`px-3 py-1 rounded-full transition-all duration-200 active:scale-95 ${
                  onlyNoDeadline
                    ? "bg-night text-[#c8f560] font-bold shadow-xs"
                    : "bg-canvas text-muted hover:text-ink hover:bg-mist"
                }`}
              >
                No deadline
              </button>
              <button
                type="button"
                onClick={() => setPriorityFilter(priorityFilter === 3 ? null : 3)}
                className={`px-3 py-1 rounded-full transition-all duration-200 active:scale-95 ${
                  priorityFilter === 3
                    ? "bg-rose-100 text-rose-800 font-bold border border-rose-300 shadow-xs"
                    : "bg-canvas text-muted hover:text-ink hover:bg-mist"
                }`}
              >
                High
              </button>
              <button
                type="button"
                onClick={() => setPriorityFilter(priorityFilter === 2 ? null : 2)}
                className={`px-3 py-1 rounded-full transition-all duration-200 active:scale-95 ${
                  priorityFilter === 2
                    ? "bg-amber-100 text-amber-800 font-bold border border-amber-300 shadow-xs"
                    : "bg-canvas text-muted hover:text-ink hover:bg-mist"
                }`}
              >
                Medium
              </button>
              <button
                type="button"
                onClick={() => setPriorityFilter(priorityFilter === 1 ? null : 1)}
                className={`px-3 py-1 rounded-full transition-all duration-200 active:scale-95 ${
                  priorityFilter === 1
                    ? "bg-blue-100 text-blue-800 font-bold border border-blue-300 shadow-xs"
                    : "bg-canvas text-muted hover:text-ink hover:bg-mist"
                }`}
              >
                Low
              </button>
            </div>
          </div>

          {/* List */}
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted font-body space-y-2">
              <p className="font-semibold text-ink text-sm">No tasks matching your selection</p>
              <p>Click &quot;Add Study Task&quot; above to create a new deadline with date & time!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Scheduled Tasks */}
              {scheduledTasks.length > 0 && (
                <div className="space-y-3">
                  {scheduledTasks.map((task) => (
                    <TaskItemRow
                      key={task.id}
                      task={task}
                      onToggleTask={onToggleTask}
                      onDeleteTask={(t) => setTaskToDelete(t)}
                      onEditTask={onEditTask}
                    />
                  ))}
                </div>
              )}

              {/* No deadline group */}
              {noDeadlineTasks.length > 0 && (
                <div className="space-y-3">
                  {!selectedDate && !onlyNoDeadline && scheduledTasks.length > 0 && (
                    <div className="flex items-center gap-2 pt-3 border-t border-line">
                      <h4 className="font-display font-bold text-xs uppercase tracking-wider text-muted">
                        No Deadline ({noDeadlineTasks.length})
                      </h4>
                    </div>
                  )}
                  <div className="space-y-3">
                    {noDeadlineTasks.map((task) => (
                      <TaskItemRow
                        key={task.id}
                        task={task}
                        onToggleTask={onToggleTask}
                        onDeleteTask={(t) => setTaskToDelete(t)}
                        onEditTask={onEditTask}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (taskToDelete) {
            onDeleteTask(taskToDelete.id);
            setTaskToDelete(null);
          }
        }}
        title="Delete Task"
        description="Deletes this task permanently."
        confirmLabel="Delete"
        tone="danger"
      />
    </div>
  );
}

function TaskItemRow({
  task,
  onToggleTask,
  onDeleteTask,
  onEditTask,
}: {
  task: TaskItem;
  onToggleTask: (task: TaskItem) => void;
  onDeleteTask: (task: TaskItem) => void;
  onEditTask?: (task: TaskItem) => void;
}) {
  const overdue = !task.is_completed && isOverdue(task.due_at);
  const dueSoon = !task.is_completed && !overdue && isDueSoon(task.due_at);

  return (
    <div
      className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
        task.is_completed
          ? "bg-canvas/30 border-line/40 opacity-65"
          : overdue
          ? "bg-rose-50/40 border-rose-200 shadow-xs"
          : "bg-surface hover:bg-canvas/40 border-line shadow-xs"
      }`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onToggleTask(task)}
          className="mt-0.5 text-muted hover:text-emerald-600 transition-colors shrink-0"
          title={task.is_completed ? "Mark incomplete" : "Mark complete"}
          aria-label={task.is_completed ? "Mark incomplete" : "Mark complete"}
        >
          {task.is_completed ? (
            <CheckCircle2 className="size-5 text-emerald-600" />
          ) : (
            <Circle className="size-5 text-subtle" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`font-display font-bold text-sm text-ink ${
              task.is_completed ? "line-through text-muted" : ""
            }`}
          >
            {task.title}
          </p>

          {task.description && (
            <p className="text-xs text-muted font-body mt-0.5">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs font-body text-muted">
            {task.due_at ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3 text-subtle" />
                <span>
                  {new Date(task.due_at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </span>
            ) : (
              <span className="text-[0.6875rem] text-subtle font-display">No deadline</span>
            )}

            {/* Overdue Badge */}
            {overdue && (
              <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-display font-bold bg-rose-100 text-rose-800 border border-rose-300">
                Overdue
              </span>
            )}

            {/* Due Soon Badge */}
            {dueSoon && (
              <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-display font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Due soon
              </span>
            )}

            {/* Priority Badge */}
            <span
              className={`px-2 py-0.5 rounded-full text-[0.625rem] font-display font-semibold ${
                task.priority === 3
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : task.priority === 2
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}
            >
              {task.priority === 3 ? "High" : task.priority === 2 ? "Medium" : "Low"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 ml-2">
        {onEditTask && (
          <button
            type="button"
            onClick={() => onEditTask(task)}
            aria-label={`Edit task ${task.title}`}
            className="p-1.5 rounded-xl text-subtle hover:text-ink hover:bg-mist transition-colors"
            title="Edit task"
          >
            <Pencil className="size-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => onDeleteTask(task)}
          aria-label={`Delete task ${task.title}`}
          className="p-1.5 rounded-xl text-subtle hover:text-rose-600 hover:bg-rose-50 transition-colors"
          title="Delete task"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
