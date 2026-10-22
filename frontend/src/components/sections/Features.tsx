"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { CountUp } from "@/components/ui/Motion";

export function Features() {
  return (
    <section id="features" aria-labelledby="features-title" className="py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          tag="Features"
          id="features-title"
          title={["Everything You Need to", "Master Your Studies"]}
          subtitle="One app. Every tool serious students need to understand deeply, revise fast, and pass without burnout."
        />

        {/* Bento Grid */}
        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-12 lg:gap-7">
          {/* Card 1: Quiz Score & Retention History */}
          <Reveal className="group md:col-span-12 lg:col-span-6">
            <div className="flex h-full flex-col justify-between rounded-[1.35rem] bg-surface p-7 shadow-[var(--shadow-soft)] ring-1 ring-line transition-all duration-300 hover:shadow-[var(--shadow-lift)] sm:p-8">
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                  Quiz Score & Retention History
                </h3>
                <p className="mt-2 text-sm text-muted">
                  Track how your quiz scores improve across attempts as you master each lecture.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-medium text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-ink" /> First Attempt
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-muted" /> Second Attempt
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-line-strong" /> Exam Readiness
                  </span>
                </div>
              </div>

              {/* Chart Visual */}
              <div className="mt-8 pt-4">
                <div className="relative h-44 w-full">
                  <svg
                    viewBox="0 0 500 160"
                    className="h-full w-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="chartGrad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1a1d24" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#1a1d24" stopOpacity="0.2" />
                      </linearGradient>
                      <linearGradient id="chartGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5f636c" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#5f636c" stopOpacity="0.05" />
                      </linearGradient>
                      <linearGradient id="chartGrad3" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d9dadd" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#d9dadd" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    <line x1="0" y1="30" x2="500" y2="30" stroke="#f0f0f2" strokeDasharray="3 3" />
                    <line x1="0" y1="75" x2="500" y2="75" stroke="#f0f0f2" strokeDasharray="3 3" />
                    <line x1="0" y1="120" x2="500" y2="120" stroke="#f0f0f2" strokeDasharray="3 3" />

                    {/* Shaded Areas */}
                    <motion.path
                      initial={{ opacity: 0, scaleY: 0 }}
                      whileInView={{ opacity: 1, scaleY: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                      style={{ transformOrigin: "bottom" }}
                      d="M0,135 Q120,110 240,85 T500,45 L500,160 L0,160 Z"
                      fill="url(#chartGrad3)"
                    />
                    <motion.path
                      initial={{ opacity: 0, scaleY: 0 }}
                      whileInView={{ opacity: 1, scaleY: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                      style={{ transformOrigin: "bottom" }}
                      d="M0,145 Q120,125 240,95 T500,60 L500,160 L0,160 Z"
                      fill="url(#chartGrad2)"
                    />
                    <motion.path
                      initial={{ opacity: 0, scaleY: 0 }}
                      whileInView={{ opacity: 1, scaleY: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      style={{ transformOrigin: "bottom" }}
                      d="M0,152 Q120,140 240,115 T500,75 L500,160 L0,160 Z"
                      fill="url(#chartGrad1)"
                    />

                    {/* Accent trend lines */}
                    <path
                      d="M0,135 Q120,110 240,85 T500,45"
                      fill="none"
                      stroke="#8d9199"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M0,145 Q120,125 240,95 T500,60"
                      fill="none"
                      stroke="#5f636c"
                      strokeWidth="1.75"
                    />
                    <path
                      d="M0,152 Q120,140 240,115 T500,75"
                      fill="none"
                      stroke="#1a1d24"
                      strokeWidth="2.25"
                    />
                  </svg>
                </div>
                {/* X Axis */}
                <div className="mt-3 flex justify-between border-t border-line pt-2 text-[0.75rem] font-medium text-muted">
                  <span>Week 1</span>
                  <span>Week 4</span>
                  <span>Week 8</span>
                  <span>Midterms</span>
                  <span>Finals</span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Card 2: PDF to Revision Deck Pipeline */}
          <Reveal delay={0.1} className="group md:col-span-12 lg:col-span-6">
            <div className="flex h-full flex-col justify-between rounded-[1.35rem] bg-surface p-7 shadow-[var(--shadow-soft)] ring-1 ring-line transition-all duration-300 hover:shadow-[var(--shadow-lift)] sm:p-8">
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                  PDF to Revision Deck Pipeline
                </h3>
                <p className="mt-2 text-sm text-muted">
                  Watch how SORA extracts key insights from dense material into high-yield revision cards.
                </p>
                <div className="mt-5 grid grid-cols-4 gap-2 text-center text-xs font-medium text-muted">
                  <span>PDF Input</span>
                  <span>Extraction</span>
                  <span>Summary</span>
                  <span>Flashcards</span>
                </div>
              </div>

              {/* Stepped Funnel Blocks */}
              <div className="mt-8 flex items-end gap-3 pt-4">
                <div className="flex flex-1 flex-col items-center">
                  <motion.div
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    style={{ transformOrigin: "bottom" }}
                    className="flex h-36 w-full flex-col justify-end rounded-t-xl bg-ink p-3 text-center text-white transition-transform duration-300 group-hover:scale-y-[1.03]"
                  >
                    <span className="font-display text-sm font-semibold sm:text-base">
                      <CountUp value="45,820" delay={0.2} />
                    </span>
                    <span className="mt-0.5 text-[0.6875rem] opacity-70">Words</span>
                  </motion.div>
                </div>
                <div className="flex flex-1 flex-col items-center">
                  <motion.div
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    style={{ transformOrigin: "bottom" }}
                    className="flex h-28 w-full flex-col justify-end rounded-t-xl bg-[#8d9199] p-3 text-center text-white transition-transform duration-300 group-hover:scale-y-[1.04]"
                  >
                    <span className="font-display text-sm font-semibold sm:text-base">
                      <CountUp value="8,234" delay={0.3} />
                    </span>
                    <span className="mt-0.5 text-[0.6875rem] opacity-80">Parsed</span>
                  </motion.div>
                </div>
                <div className="flex flex-1 flex-col items-center">
                  <motion.div
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{ transformOrigin: "bottom" }}
                    className="flex h-20 w-full flex-col justify-end rounded-t-xl bg-[#c9cbcf] p-2.5 text-center text-ink transition-transform duration-300 group-hover:scale-y-[1.05]"
                  >
                    <span className="font-display text-xs font-semibold sm:text-sm">
                      <CountUp value="2,456" delay={0.4} />
                    </span>
                    <span className="mt-0.5 text-[0.625rem] text-muted">Summary</span>
                  </motion.div>
                </div>
                <div className="flex flex-1 flex-col items-center">
                  <motion.div
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    style={{ transformOrigin: "bottom" }}
                    className="flex h-14 w-full flex-col justify-end rounded-t-xl bg-mist p-2 text-center text-ink ring-1 ring-line transition-transform duration-300 group-hover:scale-y-[1.06]"
                  >
                    <span className="font-display text-xs font-semibold sm:text-sm">
                      <CountUp value="1,284" delay={0.5} />
                    </span>
                    <span className="mt-0.5 text-[0.625rem] text-muted">Cards</span>
                  </motion.div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Card 3: Quiz Accuracy Breakdown (Right vs Wrong) */}
          <Reveal delay={0.15} className="group md:col-span-12 lg:col-span-4">
            <div className="flex h-full flex-col justify-between rounded-[1.35rem] bg-surface p-7 shadow-[var(--shadow-soft)] ring-1 ring-line transition-all duration-300 hover:shadow-[var(--shadow-lift)] sm:p-8">
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight text-ink sm:text-xl">
                  Quiz Accuracy Breakdown
                </h3>
                <p className="mt-2 text-sm text-muted">
                  Clear feedback showing exactly which answers were right, wrong, and need review.
                </p>
              </div>

              {/* Donut graphic */}
              <div className="my-6 flex items-center justify-center">
                <div className="relative grid size-44 place-items-center">
                  {/* Outer subtle concentric dash circle */}
                  <div className="absolute inset-0 rounded-full border border-dashed border-line-strong" />

                  {/* SVG Pie Chart */}
                  <svg className="size-36 -rotate-90 transform" viewBox="0 0 100 100">
                    {/* Background circle / Review (38%) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#d9dadd"
                      strokeWidth="20"
                      strokeDasharray="238.76"
                      strokeDashoffset="0"
                    />
                    {/* Foreground arc / Mastered (62%) */}
                    <motion.circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke="#1a1d24"
                      strokeWidth="20"
                      strokeDasharray="238.76"
                      initial={{ strokeDashoffset: 238.76 }}
                      whileInView={{ strokeDashoffset: 90.72 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </svg>

                  {/* Callout markers */}
                  <div className="absolute top-4 left-0 -translate-x-2 rounded bg-surface px-1.5 py-0.5 text-[0.6875rem] font-semibold text-ink shadow-sm ring-1 ring-line">
                    ● Correct 62%
                  </div>
                  <div className="absolute bottom-4 right-0 translate-x-2 rounded bg-surface px-1.5 py-0.5 text-[0.6875rem] font-medium text-muted shadow-sm ring-1 ring-line">
                    Review 38%
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Card 4: Study Priorities & Tasks */}
          <Reveal delay={0.2} className="group md:col-span-12 lg:col-span-4">
            <div className="flex h-full flex-col justify-between rounded-[1.35rem] bg-surface p-7 shadow-[var(--shadow-soft)] ring-1 ring-line transition-all duration-300 hover:shadow-[var(--shadow-lift)] sm:p-8">
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight text-ink sm:text-xl">
                  Study Priorities & Tasks
                </h3>
                <p className="mt-2 text-sm text-muted">
                  Keep deadlines organized by priority so high-yield tasks get done first.
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-[0.6875rem] font-medium text-muted">
                  <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-ink" /> High Priority
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-subtle" /> Medium
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-fog" /> Normal
                  </span>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="mt-8 space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-ink">
                    <span>High Priority Tasks Completed</span>
                    <span className="tabular font-display">
                      <CountUp value="68%" delay={0.2} />
                    </span>
                  </div>
                  <div className="mt-2 h-7 w-full overflow-hidden rounded-lg bg-mist p-1 ring-1 ring-line">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: "68%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-md bg-ink"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-ink">
                    <span>Active Revision Decks Ready</span>
                    <span className="tabular font-display">
                      <CountUp value="74%" delay={0.3} />
                    </span>
                  </div>
                  <div className="mt-2 h-7 w-full overflow-hidden rounded-lg bg-mist p-1 ring-1 ring-line">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: "74%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-md bg-[#8d9199]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-ink">
                    <span>Upcoming Deadlines Cleared</span>
                    <span className="tabular font-display">
                      <CountUp value="82%" delay={0.4} />
                    </span>
                  </div>
                  <div className="mt-2 h-7 w-full overflow-hidden rounded-lg bg-mist p-1 ring-1 ring-line">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: "82%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-md bg-[#c9cbcf]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Card 5: Revision Calendar & Deadlines */}
          <Reveal delay={0.25} className="group md:col-span-12 lg:col-span-4">
            <div className="flex h-full flex-col justify-between rounded-[1.35rem] bg-surface p-7 shadow-[var(--shadow-soft)] ring-1 ring-line transition-all duration-300 hover:shadow-[var(--shadow-lift)] sm:p-8">
              <div>
                <h3 className="font-display text-lg font-semibold tracking-tight text-ink sm:text-xl">
                  Revision Calendar & Deadlines
                </h3>
                <p className="mt-2 text-sm text-muted">
                  View scheduled study sessions and exam dates mapped cleanly across the month.
                </p>
                <div className="mt-4 flex gap-3 text-[0.6875rem] font-medium text-muted">
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-sm bg-ink" /> Exam / Due
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-sm bg-[#8d9199]" /> Active Study
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-sm bg-mist" /> Free Day
                  </span>
                </div>
              </div>

              {/* Grid matrix heatmap */}
              <div className="mt-8 flex justify-center">
                <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                  {[
                    "high", "mid", "low", "high", "low", "high",
                    "low", "high", "low", "low", "high", "low",
                    "high", "low", "high", "low", "high", "mid",
                    "low", "high", "low", "low", "mid", "high",
                    "high", "low", "high", "low", "high", "low"
                  ].map((cell, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.6 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.015 * idx, duration: 0.4 }}
                      className={`size-7 rounded-[6px] sm:size-8 ${
                        cell === "high"
                          ? "bg-ink shadow-sm"
                          : cell === "mid"
                          ? "bg-[#8d9199]"
                          : "bg-mist ring-1 ring-line"
                      } transition-transform duration-200 hover:scale-110`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
