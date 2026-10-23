"use client";

import React, { useState } from "react";
import {
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { TaskItem } from "@/lib/dashboard-api";

interface AssignmentsBoardProps {
  tasks: TaskItem[];
  onToggleTask: (task: TaskItem) => void;
  onDeleteTask: (id: string) => void;
  onAddTaskClick: () => void;
  selectedDateFilter?: string | null;
  className?: string;
}

export function AssignmentsBoard({
  tasks,
  onToggleTask,
  onDeleteTask,
  onAddTaskClick,
  selectedDateFilter,
  className = "",
}: AssignmentsBoardProps) {
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  const filteredTasks = tasks.filter((task) => {
    // If a calendar date is selected, filter by that date
    if (selectedDateFilter && task.due_at) {
      const taskDate = task.due_at.split("T")[0];
      if (taskDate !== selectedDateFilter) return false;
    }

    if (filter === "active") return !task.is_completed;
    if (filter === "completed") return task.is_completed;
    return true;
  });

  return (
    <div
      className={`rounded-3xl bg-surface border border-line p-5 sm:p-6 shadow-soft flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-ink text-base sm:text-lg">
              Assignments & Study Tasks
            </h3>
            <span className="inline-flex items-center justify-center size-5 rounded-full bg-mist text-[0.6875rem] font-display font-bold text-ink">
              {filteredTasks.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onAddTaskClick}
            className="size-7 rounded-full bg-[#c8f560] text-[#141413] flex items-center justify-center hover:bg-[#bbf048] transition-transform active:scale-95 shadow-xs"
            title="Add assignment"
            aria-label="Add assignment"
          >
            <Plus className="size-4 font-bold" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 mb-3.5">
          {[
            { id: "all" as const, label: "All Tasks" },
            { id: "active" as const, label: "In Progress" },
            { id: "completed" as const, label: "Completed" },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`px-3 py-1 rounded-full text-xs font-display transition-all ${
                filter === id
                  ? "bg-night text-[#c8f560] font-semibold shadow-2xs"
                  : "bg-canvas text-muted hover:text-ink hover:bg-mist"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="size-10 rounded-2xl bg-canvas mx-auto flex items-center justify-center text-subtle">
              <Calendar className="size-5" />
            </div>
            <p className="text-xs font-display font-medium text-ink">
              {selectedDateFilter
                ? `No tasks scheduled for ${selectedDateFilter}`
                : "No tasks in this view"}
            </p>
            <p className="text-[0.7rem] text-muted max-w-[200px] mx-auto font-body">
              Click &quot;+&quot; to schedule a new study task or exam deadline.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTasks.slice(0, 5).map((task) => {
              const dueDate = task.due_at
                ? new Date(task.due_at).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Flexible date";

              // Determine status pill
              const statusPill = task.is_completed
                ? {
                    label: "Completed",
                    bg: "bg-[#dcfce7]",
                    text: "text-[#16a34a]",
                    border: "border-[#bbf7d0]",
                  }
                : task.due_at && new Date(task.due_at) < new Date()
                ? {
                    label: "Overdue",
                    bg: "bg-rose-100",
                    text: "text-rose-800",
                    border: "border-rose-300",
                  }
                : {
                    label: "In progress",
                    bg: "bg-[#ede9fe]",
                    text: "text-[#7c3aed]",
                    border: "border-[#ddd6fe]",
                  };

              return (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 ${
                    task.is_completed
                      ? "bg-canvas/30 border-line/50 opacity-65"
                      : "bg-surface hover:bg-canvas/40 border-line shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onToggleTask(task)}
                      className="shrink-0 text-muted hover:text-emerald-600 transition-colors"
                      title={task.is_completed ? "Mark incomplete" : "Mark completed"}
                    >
                      <CheckCircle2
                        className={`size-5 ${
                          task.is_completed ? "text-emerald-600" : "text-subtle"
                        }`}
                      />
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs sm:text-sm font-display font-semibold truncate ${
                          task.is_completed ? "line-through text-muted" : "text-ink"
                        }`}
                      >
                        {task.title}
                      </p>

                      <div className="flex items-center gap-2 mt-0.5 text-[0.6875rem] text-muted font-body">
                        <Clock className="size-3" />
                        <span>{dueDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status pill & delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-display font-semibold border ${statusPill.bg} ${statusPill.text} ${statusPill.border}`}
                    >
                      {statusPill.label}
                    </span>

                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      className="p-1 rounded-lg text-subtle hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs text-muted font-body">
        <span>Organized for maximum retention</span>
        <span className="text-ink font-display font-semibold flex items-center gap-1">
          <Sparkles className="size-3 text-amber-500" />
          <span>Syncs with Calendar</span>
        </span>
      </div>
    </div>
  );
}
