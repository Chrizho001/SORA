"use client";

import React, { useState } from "react";
import { X, Calendar as CalendarIcon, Clock, AlertTriangle, Check } from "lucide-react";
import { CreateTaskPayload } from "@/lib/dashboard-api";
import { SoraMascot } from "@/components/auth/SoraMascot";
import { formatApiErrorMessage } from "@/lib/axios-client";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: CreateTaskPayload) => Promise<void>;
  initialDate?: string | null;
}

export function TaskModal({ isOpen, onClose, onSubmit, initialDate }: TaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => initialDate || new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("18:00");
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a task title.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let dueAt: string | null = null;
      if (date) {
        dueAt = new Date(`${date}T${time || "00:00"}:00`).toISOString();
      }

      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        due_at: dueAt,
        priority,
      });

      // Reset and close
      setTitle("");
      setDescription("");
      onClose();
    } catch (err: unknown) {
      setError(formatApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-surface border border-line p-6 shadow-2xl text-ink space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-[#c8f560] text-[#141413] flex items-center justify-center font-bold">
              <CalendarIcon className="size-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-ink">Schedule Study Task</h3>
              <p className="text-xs text-muted font-body">
                Add an assignment deadline, quiz review, or study session
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full text-muted hover:bg-mist hover:text-ink flex items-center justify-center transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Mascot Mini Helper */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-canvas border border-line">
          <SoraMascot
            size="sm"
            emotion="happy"
            showSpeechBubble={false}
            className="scale-75 -my-4 -ml-2 shrink-0"
          />
          <p className="text-xs text-ink-2 font-body">
            I&apos;ll keep track of this on your schedule and remind you before it is due!
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-display font-semibold text-ink mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Review Economics Chapter 4 Flashcards"
              className="w-full h-11 px-3.5 rounded-xl bg-surface border border-line text-sm text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-ink"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-display font-semibold text-ink mb-1">
              Notes / Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key concepts to focus on or lecture slides to re-read..."
              rows={2}
              className="w-full p-3 rounded-xl bg-surface border border-line text-sm text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-ink resize-none"
            />
          </div>

          {/* Date & Time Picker Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-display font-semibold text-ink mb-1 flex items-center gap-1.5">
                <CalendarIcon className="size-3.5 text-muted" />
                <span>Due Date</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-surface border border-line text-xs font-display text-ink focus:outline-none focus:ring-2 focus:ring-ink"
              />
            </div>

            <div>
              <label className="block text-xs font-display font-semibold text-ink mb-1 flex items-center gap-1.5">
                <Clock className="size-3.5 text-muted" />
                <span>Time (Optional)</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-surface border border-line text-xs font-display text-ink focus:outline-none focus:ring-2 focus:ring-ink"
              />
            </div>
          </div>

          {/* Priority Selector */}
          <div>
            <label className="block text-xs font-display font-semibold text-ink mb-1.5">
              Priority Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { level: 1 as const, name: "Low", color: "hover:border-blue-400 checked:bg-blue-50" },
                { level: 2 as const, name: "Medium", color: "hover:border-amber-400 checked:bg-amber-50" },
                { level: 3 as const, name: "High", color: "hover:border-rose-400 checked:bg-rose-50" },
              ].map(({ level, name }) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setPriority(level)}
                  className={`h-10 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-display font-semibold transition-all ${
                    priority === level
                      ? level === 3
                        ? "bg-rose-50 border-rose-400 text-rose-800 shadow-xs"
                        : level === 2
                        ? "bg-amber-50 border-amber-400 text-amber-800 shadow-xs"
                        : "bg-blue-50 border-blue-400 text-blue-800 shadow-xs"
                      : "bg-canvas/50 border-line text-muted hover:text-ink hover:bg-canvas"
                  }`}
                >
                  {priority === level && <Check className="size-3.5" />}
                  <span>{name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-line flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-line text-xs font-display font-semibold text-muted hover:text-ink hover:bg-mist transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-night hover:bg-ink text-[#c8f560] text-xs font-display font-bold shadow-md transition-transform active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "Scheduling..." : "Save Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
