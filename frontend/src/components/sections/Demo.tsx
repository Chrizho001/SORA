"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  FileText,
  CheckCircle2,
  Copy,
  Layers,
  HelpCircle,
  Calendar,
  Check,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { CountUp } from "@/components/ui/Motion";
import { actionChips, actionStats } from "@/content/site";
import { LogoMark } from "@/components/brand/Logo";

export function Demo() {
  const [activeTab, setActiveTab] = useState<"summary" | "cards" | "quiz">("cards");
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section id="how-it-works" aria-labelledby="demo-title" className="py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          tag="See It In Action"
          id="demo-title"
          title={["From Dense Lecture PDF", "To Exam Mastery in Seconds"]}
          subtitle="Just upload your lecture slides or reading. SORA transforms it into high-yield summaries and active recall flashcards in the background — ready to revise and test immediately."
        />

        {/* Feature Pill Chips */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {actionChips.map((chip, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 font-display text-xs font-medium text-ink shadow-[var(--shadow-soft)] ring-1 ring-line transition-all duration-300 hover:shadow-[var(--shadow-lift)] sm:text-sm"
            >
              <Sparkles className="size-3.5 text-ink" strokeWidth={2} />
              {chip}
            </span>
          ))}
        </div>

        {/* 3 Mini Stats */}
        <div className="mt-8 flex justify-center">
          <div className="grid grid-cols-3 divide-x divide-line rounded-2xl bg-surface px-6 py-4 shadow-[var(--shadow-soft)] ring-1 ring-line max-sm:w-full sm:px-10">
            {actionStats.map((stat, i) => (
              <div key={stat.label} className="px-3 text-center sm:px-6">
                <div className="tabular font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
                  <CountUp value={stat.value} delay={0.2 + i * 0.1} />
                </div>
                <div className="mt-0.5 text-xs text-muted sm:text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Browser Mockup Window */}
        <Reveal delay={0.15} className="mt-14">
          <div className="relative mx-auto max-w-5xl rounded-[1.5rem] bg-surface shadow-[var(--shadow-float)] ring-1 ring-line">
            {/* Callout Badges floating above window edges */}
            <div className="absolute -top-3.5 left-8 z-10 hidden items-center gap-1.5 rounded-full bg-surface px-3.5 py-1 text-xs font-semibold text-ink shadow-[var(--shadow-soft)] ring-1 ring-line md:inline-flex">
              <span className="size-2 rounded-full bg-signal" />
              Lecture PDF parsed
            </div>
            <div className="absolute -top-3.5 right-8 z-10 hidden items-center gap-1.5 rounded-full bg-surface px-3.5 py-1 text-xs font-semibold text-ink shadow-[var(--shadow-soft)] ring-1 ring-line md:inline-flex">
              <span className="size-2 rounded-full bg-signal" />
              Summary ready in background
            </div>

            {/* Window Chrome Header */}
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5 sm:px-6">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-[#ff5f56]" />
                <span className="size-3 rounded-full bg-[#ffbd2e]" />
                <span className="size-3 rounded-full bg-[#27c93f]" />
              </div>

              {/* URL Bar */}
              <div className="flex items-center gap-2 rounded-full bg-mist px-4 py-1.5 text-xs font-medium text-muted ring-1 ring-line">
                <span className="size-1.5 rounded-full bg-signal" />
                <span>app.sora.study</span>
              </div>

              <div className="w-14" />
            </div>

            {/* Window Body Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* Left Mini Sidebar */}
              <div className="hidden border-r border-line bg-mist/40 p-5 lg:col-span-3 lg:flex lg:flex-col lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 px-2 py-1 font-display font-semibold text-ink">
                    <LogoMark className="size-5" />
                    <span>SORA</span>
                  </div>

                  <div className="mt-6 space-y-1">
                    <div className="flex items-center justify-between rounded-lg bg-ink px-3 py-2 text-xs font-medium text-white shadow-sm">
                      <span className="flex items-center gap-2">
                        <FileText className="size-3.5" />
                        Current Study Deck
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-muted hover:bg-mist">
                      <span className="flex items-center gap-2">
                        <BookOpen className="size-3.5" />
                        Lecture Summaries
                      </span>
                      <span className="rounded-full bg-line px-1.5 py-0.5 text-[0.625rem]">24</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-muted hover:bg-mist">
                      <span className="flex items-center gap-2">
                        <Layers className="size-3.5" />
                        Flashcard Sets
                      </span>
                      <span className="rounded-full bg-line px-1.5 py-0.5 text-[0.625rem]">18</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-muted hover:bg-mist">
                      <span className="flex items-center gap-2">
                        <HelpCircle className="size-3.5" />
                        Practice Quizzes
                      </span>
                      <span className="rounded-full bg-line px-1.5 py-0.5 text-[0.625rem]">6</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-muted hover:bg-mist">
                      <span className="flex items-center gap-2">
                        <Calendar className="size-3.5" />
                        Upcoming Tasks
                      </span>
                      <span className="rounded-full bg-line px-1.5 py-0.5 text-[0.625rem]">3</span>
                    </div>
                  </div>
                </div>

                {/* Sidebar Bottom Card */}
                <div className="rounded-xl bg-surface p-3 ring-1 ring-line">
                  <div className="flex items-center justify-between text-[0.6875rem] font-semibold text-muted">
                    <span>STUDY READINESS</span>
                    <span className="tabular font-display text-ink">92/100</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-mist">
                    <div className="h-full w-[92%] rounded-full bg-ink" />
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t border-line pt-2 text-xs font-medium text-ink">
                    <div className="size-6 rounded-full bg-mist ring-1 ring-line flex items-center justify-center font-display text-[0.6875rem] font-bold">
                      AO
                    </div>
                    <div className="truncate text-[0.75rem]">Amara Okafor</div>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="p-5 sm:p-7 lg:col-span-9">
                {/* Top Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
                  <div>
                    <h4 className="font-display text-base font-semibold text-ink sm:text-lg">
                      Cellular Respiration & Metabolic Regulation
                    </h4>
                    <p className="text-xs text-muted">BIO 201 · Lecture 06 · Slides 1–48</p>
                  </div>

                  {/* Interactive Switcher Tabs */}
                  <div className="flex items-center rounded-xl bg-mist p-1 ring-1 ring-line">
                    <button
                      type="button"
                      onClick={() => setActiveTab("summary")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        activeTab === "summary"
                          ? "bg-surface text-ink shadow-sm"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      Summary
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("cards")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        activeTab === "cards"
                          ? "bg-surface text-ink shadow-sm"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      Flashcards (24)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("quiz")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        activeTab === "quiz"
                          ? "bg-surface text-ink shadow-sm"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      Quiz (10 Qs)
                    </button>
                  </div>
                </div>

                {/* Interactive Dynamic Content View */}
                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-12">
                  {/* Left Column: Source Document Excerpt */}
                  <div className="flex flex-col justify-between rounded-xl bg-mist/60 p-5 ring-1 ring-line md:col-span-5">
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-ink">
                        <span>SOURCE EXTRACT</span>
                        <span className="text-[0.6875rem] font-normal text-muted">Page 14 of 48</span>
                      </div>
                      <div className="mt-3 text-xs leading-relaxed text-muted">
                        <p className="font-medium text-ink">
                          “The rate of glycolysis is regulated through allosteric control of key enzymes.
                          Phosphofructokinase-1 (PFK-1) catalyzes the committed step (F6P → F1,6BP)...”
                        </p>
                        <p className="mt-2 text-[0.7rem] text-subtle">
                          High ATP and citrate inhibit PFK-1, while AMP and fructose-2,6-bisphosphate relieve inhibition.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-line/60 pt-3">
                      <div className="flex items-center justify-between text-[0.6875rem] text-muted">
                        <span>Status: Verified from PDF</span>
                        <span className="font-semibold text-ink">Extracted directly</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Dynamic Generated Output (Switches on click) */}
                  <div className="flex flex-col justify-between rounded-xl bg-surface p-5 ring-1 ring-line md:col-span-7">
                    <AnimatePresence mode="wait">
                      {activeTab === "cards" && (
                        <motion.div
                          key="cards"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <span className="rounded-full bg-mist px-2.5 py-0.5 text-[0.6875rem] font-semibold text-ink">
                              Card 3 of 24 · High Yield
                            </span>
                            <span className="text-[0.6875rem] text-muted">Click to flip</span>
                          </div>

                          <div className="rounded-lg border border-line bg-mist/30 p-4">
                            <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                              Question:
                            </span>
                            <p className="mt-1 font-display text-sm font-semibold text-ink">
                              What is the committed, rate-limiting enzyme in glycolysis, and how is it allosterically regulated?
                            </p>
                          </div>

                          <div className="rounded-lg border border-line bg-surface p-4">
                            <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                              Answer:
                            </span>
                            <p className="mt-1 text-xs leading-relaxed text-ink">
                              <strong className="font-semibold">PFK-1</strong> (Phosphofructokinase-1).
                              Inhibited by <span className="underline decoration-line-strong">ATP and citrate</span>;
                              activated by <span className="underline decoration-line-strong">AMP and F2,6BP</span>.
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === "summary" && (
                        <motion.div
                          key="summary"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-3"
                        >
                          <span className="rounded-full bg-mist px-2.5 py-0.5 text-[0.6875rem] font-semibold text-ink">
                            Structured Summary
                          </span>
                          <h5 className="font-display text-sm font-semibold text-ink">
                            Core Takeaways: Cellular Metabolism
                          </h5>
                          <ul className="space-y-2 text-xs leading-relaxed text-muted">
                            <li className="flex items-start gap-2">
                              <Check className="mt-0.5 size-3.5 shrink-0 text-ink" />
                              <span>
                                <strong className="text-ink">Glycolysis:</strong> Converts glucose to pyruvate, generating 2 ATP & 2 NADH.
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <Check className="mt-0.5 size-3.5 shrink-0 text-ink" />
                              <span>
                                <strong className="text-ink">Regulation:</strong> PFK-1 acts as the primary pacemaker of the pathway.
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <Check className="mt-0.5 size-3.5 shrink-0 text-ink" />
                              <span>
                                <strong className="text-ink">Krebs Cycle:</strong> Oxidizes acetyl-CoA in the mitochondrial matrix.
                              </span>
                            </li>
                          </ul>
                        </motion.div>
                      )}

                      {activeTab === "quiz" && (
                        <motion.div
                          key="quiz"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="rounded-full bg-mist px-2.5 py-0.5 text-[0.6875rem] font-semibold text-ink">
                              Question 1 of 10 · Multiple Choice
                            </span>
                            <span className="text-[0.6875rem] font-medium text-signal">Ready</span>
                          </div>
                          <p className="font-display text-sm font-semibold text-ink">
                            Which of the following molecules acts as an allosteric inhibitor of PFK-1?
                          </p>
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between rounded-lg border border-ink bg-mist/60 px-3 py-2 font-medium text-ink">
                              <span>A. Citrate and High ATP</span>
                              <CheckCircle2 className="size-4 text-ink" />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-muted">
                              <span>B. AMP and Fructose-2,6-bisphosphate</span>
                              <span className="size-4" />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-muted">
                              <span>C. Inorganic Phosphate</span>
                              <span className="size-4" />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Output action buttons */}
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-muted transition-colors hover:bg-mist hover:text-ink"
                        >
                          <Copy className="size-3.5" />
                          <span>{copied ? "Copied!" : "Copy"}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab("quiz")}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 font-display text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-95"
                        >
                          <span>Take Quick Quiz</span>
                          <ChevronRight className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
