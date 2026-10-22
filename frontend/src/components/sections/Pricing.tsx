"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { plan, site } from "@/content/site";

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState<"semester" | "annual">("semester");

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          tag="Pricing"
          id="pricing-title"
          title={["Simple, Transparent", "Access for Students"]}
          subtitle="Start free. Every core tool is 100% free for university and college students."
        />

        {/* Toggle Pill */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex items-center rounded-full bg-mist p-1 ring-1 ring-line">
            <button
              type="button"
              onClick={() => setBillingCycle("semester")}
              className={`rounded-full px-5 py-2 font-display text-xs font-semibold transition-all ${
                billingCycle === "semester"
                  ? "bg-ink text-white shadow-sm"
                  : "text-muted hover:text-ink"
              }`}
            >
              Current Semester
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("annual")}
              className={`flex items-center gap-1.5 rounded-full px-5 py-2 font-display text-xs font-semibold transition-all ${
                billingCycle === "annual"
                  ? "bg-ink text-white shadow-sm"
                  : "text-muted hover:text-ink"
              }`}
            >
              <span>Full Academic Year</span>
              <span className="rounded-full bg-surface px-1.5 py-0.5 text-[0.625rem] font-bold text-ink ring-1 ring-line">
                Free
              </span>
            </button>
          </div>
        </div>

        {/* 3 Pricing Cards Grid */}
        <div className="mt-14 grid grid-cols-1 items-stretch gap-8 lg:grid-cols-3">
          {/* Card 1: Core Essentials (Light Card) */}
          <Reveal delay={0.05} className="flex">
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="flex w-full flex-col justify-between rounded-[1.5rem] bg-surface p-8 shadow-[var(--shadow-soft)] ring-1 ring-line transition-shadow duration-300 hover:shadow-[var(--shadow-lift)] sm:p-9"
            >
              <div>
                <span className="font-display text-xs font-semibold uppercase tracking-wider text-muted">
                  ESSENTIALS
                </span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
                    Free
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted">
                  Perfect for organizing tasks, planning assignment deadlines, and testing the core loop.
                </p>

                <div className="mt-8">
                  <ButtonLink href={site.routes.signup} variant="light" className="w-full justify-center">
                    Get Started Free
                  </ButtonLink>
                </div>

                <div className="mt-8 border-t border-line pt-6">
                  <ul className="space-y-3.5 text-xs text-ink-2">
                    <li className="flex items-center gap-2.5">
                      <Check className="size-4 shrink-0 text-ink" strokeWidth={2.5} />
                      <span>Unlimited task & deadline tracking</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="size-4 shrink-0 text-ink" strokeWidth={2.5} />
                      <span>Due-soon notification reminders</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="size-4 shrink-0 text-ink" strokeWidth={2.5} />
                      <span>Manual flashcard deck creation</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="size-4 shrink-0 text-ink" strokeWidth={2.5} />
                      <span>Practice quizzes with score history</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-muted/70">
                      <span className="size-4 shrink-0 text-center text-xs">✕</span>
                      <span className="line-through">Bulk PDF AI extraction</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </Reveal>

          {/* Card 2: Student All-In-One (Featured Dark Card in center) */}
          <Reveal delay={0.15} className="flex">
            <motion.div
              whileHover={{ y: -6, scale: 1.01 }}
              transition={{ duration: 0.3 }}
              className="relative flex w-full flex-col justify-between rounded-[1.65rem] bg-[linear-gradient(165deg,#1f232c,#101217)] p-8 text-white shadow-[var(--shadow-float)] ring-1 ring-white/10 sm:p-10"
            >
              {/* Most Popular Badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 font-display text-[0.6875rem] font-bold uppercase tracking-wider text-ink shadow-md">
                Most Popular · 100% Free
              </div>

              <div>
                <span className="font-display text-xs font-semibold uppercase tracking-wider text-white/70">
                  STUDENT EDITION
                </span>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    $0
                  </span>
                  <span className="text-sm font-medium text-white/60">/ forever</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white/80">
                  The complete 4-step study loop for university students. Plan, read, revise, and quiz.
                </p>

                <div className="mt-8">
                  <ButtonLink
                    href={site.routes.signup}
                    variant="white"
                    className="w-full justify-center"
                  >
                    Start Studying Free
                  </ButtonLink>
                </div>

                <div className="mt-8 border-t border-white/10 pt-6">
                  <ul className="space-y-3.5 text-xs text-white/90">
                    {plan.included.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2.5">
                        <Check className="size-4 shrink-0 text-white" strokeWidth={2.5} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 border-t border-white/10 pt-4 text-center text-[0.6875rem] text-white/50">
                No credit card · Instant student account
              </div>
            </motion.div>
          </Reveal>

          {/* Card 3: Upcoming / Future Roadmap (Light Card) */}
          <Reveal delay={0.25} className="flex">
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="flex w-full flex-col justify-between rounded-[1.5rem] bg-surface p-8 shadow-[var(--shadow-soft)] ring-1 ring-line transition-shadow duration-300 hover:shadow-[var(--shadow-lift)] sm:p-9"
            >
              <div>
                <span className="font-display text-xs font-semibold uppercase tracking-wider text-muted">
                  COMING NEXT
                </span>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                    Roadmap
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted">
                  New capabilities actively planned for upcoming releases based on user requests.
                </p>

                <div className="mt-8">
                  <ButtonLink
                    href="mailto:features@sora.study?subject=Feature%20Request"
                    variant="light"
                    className="w-full justify-center"
                  >
                    Suggest a Feature
                  </ButtonLink>
                </div>

                <div className="mt-8 border-t border-line pt-6">
                  <ul className="space-y-3.5 text-xs text-ink-2">
                    {plan.next.items.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2.5">
                        <Sparkles className="size-3.5 shrink-0 text-muted" />
                        <span>{item}</span>
                      </li>
                    ))}
                    {plan.horizon.items.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2.5 text-muted">
                        <span className="size-3.5 shrink-0 text-center font-bold">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </Reveal>
        </div>

        {/* Bottom subtle note */}
        <div className="mt-12 text-center text-xs text-muted">
          ✦ 100% free for students · No credit card required · Delete your account or data anytime
        </div>
      </div>
    </section>
  );
}
