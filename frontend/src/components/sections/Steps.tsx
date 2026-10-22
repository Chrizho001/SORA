"use client";

import { motion } from "framer-motion";
import { Check, UploadCloud } from "lucide-react";
import { SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { InstallButton } from "@/components/ui/InstallButton";
import { site, steps } from "@/content/site";

export function Steps() {
  return (
    <section id="how-it-works" aria-labelledby="steps-title" className="py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          tag="How It Works"
          id="steps-title"
          title={["From Lecture PDF to Exam Ready", "in 3 Simple Steps"]}
          subtitle="No learning curve. No complicated setup. Just open the app and start revising."
        />

        {/* 3 Step Cards Grid */}
        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Step 1 */}
          <Reveal delay={0.05} className="flex">
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="group flex w-full flex-col justify-between rounded-[1.35rem] bg-surface p-7 shadow-[var(--shadow-soft)] ring-1 ring-line transition-shadow duration-300 hover:shadow-[var(--shadow-lift)] sm:p-8"
            >
              <div>
                <span className="grid size-10 place-items-center rounded-full bg-ink font-display text-sm font-bold text-white shadow-sm transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:rotate-12 group-hover:scale-105">
                  01
                </span>
                <h3 className="mt-6 font-display text-xl font-semibold tracking-tight text-ink">
                  {steps[0].title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {steps[0].body}
                </p>
              </div>

              {/* Step 1 Mock Mini UI */}
              <div className="my-8 rounded-xl border border-line bg-mist/40 p-4 transition-colors group-hover:bg-mist/60">
                <div className="flex items-center justify-between text-[0.6875rem] font-semibold text-muted">
                  <span>INPUT MATERIAL</span>
                  <span className="text-ink">PDF / Slides</span>
                </div>
                <div className="mt-3 rounded-lg border border-dashed border-line-strong bg-surface p-3 text-center transition-all group-hover:border-ink/40">
                  <UploadCloud className="mx-auto size-5 text-muted transition-transform group-hover:-translate-y-0.5" />
                  <p className="mt-1 text-xs font-medium text-ink">“Bio201_Lecture06_Respiration.pdf”</p>
                  <p className="text-[0.625rem] text-muted">4.2 MB · 48 slides extracted</p>
                </div>
                <div className="mt-3 flex gap-1.5 text-[0.625rem]">
                  <span className="rounded bg-mist px-2 py-0.5 font-medium text-ink">Slides</span>
                  <span className="rounded bg-mist px-2 py-0.5 font-medium text-ink">Readings</span>
                  <span className="rounded bg-mist px-2 py-0.5 font-medium text-ink">Notes</span>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-line pt-4 text-xs font-medium text-muted">
                <Check className="size-4 text-ink" />
                <span>{steps[0].note}</span>
              </div>
            </motion.div>
          </Reveal>

          {/* Step 2 */}
          <Reveal delay={0.15} className="flex">
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="group flex w-full flex-col justify-between rounded-[1.35rem] bg-surface p-7 shadow-[var(--shadow-soft)] ring-1 ring-line transition-shadow duration-300 hover:shadow-[var(--shadow-lift)] sm:p-8"
            >
              <div>
                <span className="grid size-10 place-items-center rounded-full bg-ink font-display text-sm font-bold text-white shadow-sm transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:rotate-12 group-hover:scale-105">
                  02
                </span>
                <h3 className="mt-6 font-display text-xl font-semibold tracking-tight text-ink">
                  {steps[1].title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {steps[1].body}
                </p>
              </div>

              {/* Step 2 Mock Mini UI */}
              <div className="my-8 rounded-xl border border-line bg-mist/40 p-4 transition-colors group-hover:bg-mist/60">
                <div className="flex items-center justify-between text-[0.6875rem] font-semibold text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 animate-pulse rounded-full bg-signal" />
                    GENERATING DECK...
                  </span>
                  <span className="text-ink">In background</span>
                </div>
                {/* Shimmer skeleton lines */}
                <div className="mt-4 space-y-2.5">
                  <div className="skeleton h-2.5 w-full rounded" />
                  <div className="skeleton h-2.5 w-4/5 rounded" />
                  <div className="skeleton h-2.5 w-3/5 rounded" />
                </div>
                <div className="mt-4 rounded-lg bg-ink py-2 text-center text-xs font-medium text-white shadow-sm transition-transform group-hover:scale-[1.02]">
                  ✦ Preparing 24 Active Recall Cards
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-line pt-4 text-xs font-medium text-muted">
                <Check className="size-4 text-ink" />
                <span>{steps[1].note}</span>
              </div>
            </motion.div>
          </Reveal>

          {/* Step 3 */}
          <Reveal delay={0.25} className="flex">
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              className="group flex w-full flex-col justify-between rounded-[1.35rem] bg-surface p-7 shadow-[var(--shadow-soft)] ring-1 ring-line transition-shadow duration-300 hover:shadow-[var(--shadow-lift)] sm:p-8"
            >
              <div>
                <span className="grid size-10 place-items-center rounded-full bg-ink font-display text-sm font-bold text-white shadow-sm transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:rotate-12 group-hover:scale-105">
                  03
                </span>
                <h3 className="mt-6 font-display text-xl font-semibold tracking-tight text-ink">
                  {steps[2].title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {steps[2].body}
                </p>
              </div>

              {/* Step 3 Mock Mini UI */}
              <div className="my-8 rounded-xl border border-line bg-mist/40 p-4 transition-colors group-hover:bg-mist/60">
                <div className="flex items-center justify-between text-[0.6875rem] font-semibold text-muted">
                  <span>READY FOR REVIEW</span>
                  <span className="text-signal font-semibold">100% Ready</span>
                </div>
                <div className="mt-3 rounded-lg border border-line bg-surface p-3 text-xs">
                  <p className="font-semibold text-ink">“What is the net ATP yield of glycolysis?”</p>
                  <p className="mt-1 text-muted">→ 2 ATP, 2 NADH, 2 Pyruvate</p>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="flex-1 rounded bg-surface py-1 text-center text-[0.6875rem] font-medium text-muted ring-1 ring-line">
                    Flip Card
                  </span>
                  <span className="flex-1 rounded bg-ink py-1 text-center font-display text-[0.6875rem] font-medium text-white shadow-sm">
                    Start Quiz
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-line pt-4 text-xs font-medium text-muted">
                <Check className="size-4 text-ink" />
                <span>{steps[2].note}</span>
              </div>
            </motion.div>
          </Reveal>
        </div>

        {/* Ready to try it yourself banner */}
        <Reveal delay={0.2} className="mt-12">
          <div className="flex flex-col items-center justify-between gap-6 rounded-[1.35rem] bg-surface p-8 shadow-[var(--shadow-soft)] ring-1 ring-line sm:flex-row sm:p-10">
            <div>
              <h4 className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                Ready to try it yourself?
              </h4>
              <p className="mt-1 text-sm text-muted sm:text-base">
                Upload your first lecture PDF and get test-ready flashcards while you keep studying.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink href={site.routes.signup} size="md">
                Get started free
              </ButtonLink>
              <InstallButton size="md" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
