"use client";

import React, { useState } from "react";
import { Plus, CalendarDays, CheckCircle2, Circle, Clock, Trash2 } from "lucide-react";
import { TaskItem } from "@/lib/dashboard-api";
import { MascotGuide } from "../MascotGuide";
import { MiniCalendar } from "../MiniCalendar";

interface TasksViewProps {
  tasks: TaskItem[];
  onToggleTask: (task: TaskItem) => void;
  onDeleteTask: (id: string) => void;
  onAddTaskClick: () => void;
}

export function TasksView({
  tasks,
  onToggleTask,
  onDeleteTask,
  onAddTaskClick,
}: TasksViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<number | null>(null);

  const filteredTasks = tasks.filter((t) => {
    if (selectedDate && t.due_at) {
      if (t.due_at.split("T")[0] !== selectedDate) return false;
    }
    if (priorityFilter !== null && t.priority !== priorityFilter) return false;
    return true;
  });

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
            tasks={tasks}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onAddTaskClick={onAddTaskClick}
          />
        </div>

        {/* Full Task List on Right (8 cols) */}
        <div className="lg:col-span-8 rounded-3xl bg-surface border border-line p-6 shadow-soft space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-5 text-ink" />
              <h3 className="font-display font-bold text-base text-ink">
                {selectedDate ? `Tasks Scheduled for ${selectedDate}` : "All Scheduled Tasks"}
              </h3>
              <span className="size-5 rounded-full bg-mist text-[0.6875rem] font-bold flex items-center justify-center text-ink">
                {filteredTasks.length}
              </span>
            </div>

            {/* Priority Filters */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs font-display">
              <button
                type="button"
                onClick={() => setPriorityFilter(null)}
                className={`px-2.5 py-1 rounded-full ${
                  priorityFilter === null ? "bg-night text-[#c8f560] font-bold" : "bg-canvas text-muted hover:text-ink"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setPriorityFilter(3)}
                className={`px-2.5 py-1 rounded-full ${
                  priorityFilter === 3 ? "bg-rose-100 text-rose-800 font-bold" : "bg-canvas text-muted hover:text-ink"
                }`}
              >
                High
              </button>
              <button
                type="button"
                onClick={() => setPriorityFilter(2)}
                className={`px-2.5 py-1 rounded-full ${
                  priorityFilter === 2 ? "bg-amber-100 text-amber-800 font-bold" : "bg-canvas text-muted hover:text-ink"
                }`}
              >
                Medium
              </button>
              <button
                type="button"
                onClick={() => setPriorityFilter(1)}
                className={`px-2.5 py-1 rounded-full ${
                  priorityFilter === 1 ? "bg-blue-100 text-blue-800 font-bold" : "bg-canvas text-muted hover:text-ink"
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
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                    task.is_completed ? "bg-canvas/30 border-line/40 opacity-65" : "bg-surface hover:bg-canvas/40 border-line shadow-xs"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onToggleTask(task)}
                      className="mt-0.5 text-muted hover:text-emerald-600 transition-colors shrink-0"
                    >
                      {task.is_completed ? (
                        <CheckCircle2 className="size-5 text-emerald-600" />
                      ) : (
                        <Circle className="size-5 text-subtle" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className={`font-display font-bold text-sm text-ink ${task.is_completed ? "line-through text-muted" : ""}`}>
                        {task.title}
                      </p>

                      {task.description && (
                        <p className="text-xs text-muted font-body mt-0.5">{task.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mt-2 text-xs font-body text-muted">
                        {task.due_at && (
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
                        )}

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

                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1.5 rounded-xl text-subtle hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
