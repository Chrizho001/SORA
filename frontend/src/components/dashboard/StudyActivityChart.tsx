"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TrendingUp, Clock } from "lucide-react";

interface ActivityDay {
  day: string;
  hours: number;
  label: string;
  date: string;
  isPeak?: boolean;
}

const WEEKLY_DATA: ActivityDay[] = [
  { day: "Su", hours: 1.5, label: "1h 30m", date: "Sun, Oct 18" },
  { day: "Mo", hours: 4.8, label: "4h 48m", date: "Mon, Oct 19" },
  { day: "Tu", hours: 5.6, label: "5h 36m", date: "Tue, Oct 20" },
  { day: "We", hours: 3.2, label: "3h 12m", date: "Wed, Oct 21" },
  { day: "Th", hours: 6.8, label: "6h 48m", date: "Thu, Oct 22", isPeak: true },
  { day: "Fr", hours: 4.5, label: "4h 30m", date: "Fri, Oct 23" },
  { day: "Sa", hours: 5.1, label: "5h 06m", date: "Sat, Oct 24" },
];

const MONTHLY_DATA: ActivityDay[] = [
  { day: "W1", hours: 18.5, label: "18h 30m", date: "Week 1" },
  { day: "W2", hours: 24.2, label: "24h 12m", date: "Week 2" },
  { day: "W3", hours: 31.5, label: "31h 30m", date: "Week 3", isPeak: true },
  { day: "W4", hours: 22.0, label: "22h 00m", date: "Week 4" },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ActivityDay }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-2xl bg-[#161720] border border-[#2e3242] px-3.5 py-2.5 text-white shadow-2xl">
        <div className="flex items-center gap-1.5 text-[0.7rem] font-display font-medium text-[#c8f560]">
          <span>{data.isPeak ? "🔥 Peak Study Day" : "Study Activity"}</span>
        </div>
        <p className="text-sm font-display font-bold text-white mt-0.5">{data.label}</p>
        <p className="text-[0.6875rem] text-gray-400 font-body">{data.date}</p>
      </div>
    );
  }
  return null;
}

export function StudyActivityChart({ className = "" }: { className?: string }) {
  const isMounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [timeframe, setTimeframe] = useState<"weekly" | "monthly">("weekly");

  const chartData = timeframe === "weekly" ? WEEKLY_DATA : MONTHLY_DATA;
  const totalHours = chartData.reduce((acc, curr) => acc + curr.hours, 0).toFixed(1);

  return (
    <div
      className={`rounded-3xl bg-surface border border-line p-5 sm:p-6 shadow-soft flex flex-col justify-between ${className}`}
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-ink text-base sm:text-lg">
              Hours Activity
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.7rem] font-display font-semibold text-emerald-700 border border-emerald-200">
              <TrendingUp className="size-3 text-emerald-600" />
              <span>+14% vs last week</span>
            </span>
          </div>
          <p className="text-xs text-muted font-body mt-0.5 flex items-center gap-1.5">
            <Clock className="size-3 text-subtle" />
            <span>{totalHours} total study hours logged</span>
          </p>
        </div>

        {/* Timeframe selector pill */}
        <div className="inline-flex items-center self-start sm:self-auto rounded-full bg-canvas p-1 border border-line text-xs font-display">
          <button
            type="button"
            onClick={() => setTimeframe("weekly")}
            className={`px-3 py-1 rounded-full transition-all duration-200 ${
              timeframe === "weekly"
                ? "bg-night text-[#c8f560] font-semibold shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setTimeframe("monthly")}
            className={`px-3 py-1 rounded-full transition-all duration-200 ${
              timeframe === "monthly"
                ? "bg-night text-[#c8f560] font-semibold shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Recharts Bar Chart Container */}
      <div className="w-full h-56 pt-2">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 12, right: 8, left: -20, bottom: 0 }}
              barSize={timeframe === "weekly" ? 14 : 24}
            >
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#8d9199", fontSize: 12, fontFamily: "var(--font-space-grotesk)" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#8d9199", fontSize: 11, fontFamily: "var(--font-space-grotesk)" }}
                tickFormatter={(val) => `${val}h`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)", radius: 8 }} />
              <Bar dataKey="hours" radius={[8, 8, 8, 8]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isPeak ? "#c8f560" : "#1a1d24"}
                    stroke={entry.isPeak ? "#9ed828" : "transparent"}
                    strokeWidth={entry.isPeak ? 1.5 : 0}
                    className="transition-all duration-300 hover:opacity-85"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted animate-pulse">
            Loading activity data...
          </div>
        )}
      </div>
    </div>
  );
}
