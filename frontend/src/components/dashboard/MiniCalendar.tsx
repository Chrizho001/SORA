"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, RotateCcw } from "lucide-react";
import { TaskItem } from "@/lib/dashboard-api";
import { toLocalDateKey } from "@/lib/dates";

interface MiniCalendarProps {
  tasks?: TaskItem[];
  selectedDate: string | null; // Format "YYYY-MM-DD" or null
  onSelectDate: (date: string | null) => void;
  onAddTaskClick: () => void;
  className?: string;
}

const DAYS_OF_WEEK = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function MiniCalendar({
  tasks = [],
  selectedDate,
  onSelectDate,
  onAddTaskClick,
  className = "",
}: MiniCalendarProps) {
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const prevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  // Calendar math
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDay = today.getDate();

  // Create date string helper "YYYY-MM-DD"
  const formatDateKey = (d: number) => {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  };

  // Map task counts by date
  const tasksByDate = tasks.reduce<Record<string, number>>((acc, task) => {
    if (!task.due_at) return acc;
    const taskDate = toLocalDateKey(task.due_at);
    if (!taskDate) return acc;
    acc[taskDate] = (acc[taskDate] || 0) + 1;
    return acc;
  }, {});

  // Build grid days
  const gridDays: Array<{
    dayNumber: number;
    isCurrentMonth: boolean;
    dateKey: string;
    hasTasks: boolean;
    isToday: boolean;
    isSelected: boolean;
  }> = [];

  // Trailing days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonthIdx = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateKey = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    gridDays.push({
      dayNumber: d,
      isCurrentMonth: false,
      dateKey,
      hasTasks: !!tasksByDate[dateKey],
      isToday: false,
      isSelected: selectedDate === dateKey,
    });
  }

  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = formatDateKey(d);
    gridDays.push({
      dayNumber: d,
      isCurrentMonth: true,
      dateKey,
      hasTasks: !!tasksByDate[dateKey],
      isToday: isCurrentMonth && d === todayDay,
      isSelected: selectedDate === dateKey,
    });
  }

  // Leading days of next month to complete 35 or 42 grid cells
  const remainingCells = (7 - (gridDays.length % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    const nextMonthIdx = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateKey = `${nextYear}-${String(nextMonthIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    gridDays.push({
      dayNumber: d,
      isCurrentMonth: false,
      dateKey,
      hasTasks: !!tasksByDate[dateKey],
      isToday: false,
      isSelected: selectedDate === dateKey,
    });
  }

  return (
    <div
      className={`rounded-3xl bg-surface border border-line p-5 sm:p-6 shadow-soft flex flex-col justify-between ${className}`}
    >
      {/* Month Navigation & Action */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display font-bold text-ink text-base">
            {MONTH_NAMES[month]}, {year}
          </h3>
          {selectedDate && (
            <button
              type="button"
              onClick={() => onSelectDate(null)}
              className="inline-flex items-center gap-1 rounded-full bg-mist px-2 py-0.5 text-[0.6875rem] font-display font-medium text-muted hover:text-ink"
              title="Clear date filter"
            >
              <RotateCcw className="size-2.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="size-7 rounded-full text-muted hover:bg-mist hover:text-ink flex items-center justify-center transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="size-7 rounded-full text-muted hover:bg-mist hover:text-ink flex items-center justify-center transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {DAYS_OF_WEEK.map((day, idx) => (
          <span
            key={idx}
            className="text-[0.6875rem] font-display font-semibold text-subtle uppercase"
          >
            {day}
          </span>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {gridDays.map((cell, idx) => {
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectDate(cell.isSelected ? null : cell.dateKey)}
              className={`relative size-8 sm:size-9 rounded-full flex flex-col items-center justify-center text-xs font-display transition-all duration-200 active:scale-90 mx-auto ${
                cell.isSelected
                  ? "bg-night text-white font-bold shadow-md scale-105"
                  : cell.isToday
                  ? "bg-[#c8f560] text-[#141413] font-bold shadow-sm"
                  : cell.isCurrentMonth
                  ? "text-ink hover:bg-mist hover:text-night hover:scale-105 font-medium"
                  : "text-line-strong hover:text-muted"
              }`}
              title={cell.dateKey}
            >
              <span>{cell.dayNumber}</span>

              {/* Task Indicator Dot */}
              {cell.hasTasks && (
                <span
                  className={`absolute bottom-1 size-1 rounded-full ${
                    cell.isSelected
                      ? "bg-[#c8f560]"
                      : cell.isToday
                      ? "bg-[#141413]"
                      : "bg-[#7c3aed]"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Add Task Button */}
      <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
        <span className="text-[0.7rem] text-muted font-body">
          {selectedDate ? `Tasks for ${selectedDate}` : "Select date to filter tasks"}
        </span>
        <button
          type="button"
          onClick={onAddTaskClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-night text-[#c8f560] text-xs font-display font-semibold hover:bg-ink transition-transform active:scale-95"
        >
          <Plus className="size-3.5" />
          <span>Add Task</span>
        </button>
      </div>
    </div>
  );
}
