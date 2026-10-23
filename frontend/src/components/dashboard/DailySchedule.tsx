"use client";

import React from "react";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
} from "lucide-react";
import { TaskItem } from "@/lib/dashboard-api";

interface DailyScheduleProps {
  tasks: TaskItem[];
  onToggleTask: (task: TaskItem) => void;
  onAddTaskClick: () => void;
  className?: string;
}

const PRIORITY_STYLES: Record<
  number,
  { label: string; bg: string; text: string; border: string }
> = {
  3: {
    label: "High Priority",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  },
  2: {
    label: "Medium",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  1: {
    label: "Low",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
};

export function DailySchedule({
  tasks,
  onToggleTask,
  onAddTaskClick,
  className = "",
}: DailyScheduleProps) {
  // Sort tasks: pending first, then by priority (descending)
  const sortedTasks = [...tasks]
    .sort((a, b) => {
      if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
      return b.priority - a.priority;
    })
    .slice(0, 5); // display top 5 for the daily schedule section

  return (
    <div
      className={`rounded-3xl bg-surface border border-line p-5 sm:p-6 shadow-soft flex flex-col justify-between ${className}`}
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-ink text-base sm:text-lg">
              Daily Schedule
            </h3>
            <span className="inline-flex items-center justify-center size-5 rounded-full bg-mist text-[0.6875rem] font-display font-bold text-ink">
              {tasks.filter((t) => !t.is_completed).length}
            </span>
          </div>
          <button
            type="button"
            onClick={onAddTaskClick}
            className="text-xs font-display font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            + Add New
          </button>
        </div>

        {sortedTasks.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <div className="size-10 rounded-2xl bg-canvas mx-auto flex items-center justify-center text-subtle">
              <Calendar className="size-5" />
            </div>
            <p className="text-xs font-display font-medium text-ink">No tasks for today</p>
            <p className="text-[0.7rem] text-muted max-w-[200px] mx-auto">
              You are all caught up! Schedule a lecture review or quiz block to stay ahead.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedTasks.map((task) => {
              const priorityInfo = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES[2];
              const dueTime = task.due_at
                ? new Date(task.due_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;

              return (
                <div
                  key={task.id}
                  className={`group flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 ${
                    task.is_completed
                      ? "bg-canvas/40 border-line/50 opacity-60"
                      : "bg-surface hover:bg-canvas/50 border-line shadow-xs hover:border-line-strong"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Completion Toggle */}
                    <button
                      type="button"
                      onClick={() => onToggleTask(task)}
                      className="shrink-0 text-muted hover:text-emerald-600 transition-colors"
                      title={task.is_completed ? "Mark incomplete" : "Mark complete"}
                      aria-label={task.is_completed ? "Mark incomplete" : "Mark complete"}
                    >
                      {task.is_completed ? (
                        <CheckCircle2 className="size-5 text-emerald-600" />
                      ) : (
                        <Circle className="size-5 text-subtle group-hover:text-emerald-600" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs sm:text-sm font-display font-semibold truncate ${
                          task.is_completed ? "line-through text-muted" : "text-ink"
                        }`}
                      >
                        {task.title}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.2 rounded-md text-[0.625rem] font-display font-semibold border ${priorityInfo.bg} ${priorityInfo.text} ${priorityInfo.border}`}
                        >
                          {priorityInfo.label}
                        </span>

                        {dueTime && (
                          <span className="inline-flex items-center gap-1 text-[0.6875rem] text-muted font-body">
                            <Clock className="size-3" />
                            <span>{dueTime}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Motivational footer note */}
      <div className="mt-4 pt-3 border-t border-line flex items-center gap-2 text-[0.7rem] text-muted font-body">
        <Sparkles className="size-3 text-amber-500 shrink-0" />
        <span>Completed tasks feed into your study streak & readiness score.</span>
      </div>
    </div>
  );
}
