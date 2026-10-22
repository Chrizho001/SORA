"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { InstallButton } from "@/components/ui/InstallButton";
import { SectionTag } from "@/components/ui/Section";
import { CountUp, SplitLines, InViewStagger } from "@/components/ui/Motion";
import { finalCta, site } from "@/content/site";

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="relative overflow-hidden bg-night py-28 text-white sm:py-36">
      {/* Background Subtle Grid */}
      <div
        aria-hidden
        className="night-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_50%_40%,black_30%,transparent_80%)]"
      />

      {/* Floating Concept Flashcards on the sides (mirroring inspiration) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block">
        {/* Top Left Card */}
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [-6, -4, -6] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-4 top-20 w-64 rounded-2xl bg-surface p-4 text-ink shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
        >
          <span className="rounded bg-mist px-2 py-0.5 text-[0.625rem] font-semibold text-muted">
            {finalCta.notes[0].tag}
          </span>
          <p className="mt-2 text-xs font-medium leading-relaxed text-ink-2">
            {finalCta.notes[0].text}
          </p>
          <div className="mt-2 flex justify-between text-[0.625rem] text-muted">
            <span>{finalCta.notes[0].meta}</span>
            <span>★ Mastered</span>
          </div>
        </motion.div>

        {/* Bottom Left Card */}
        <motion.div
          animate={{ y: [0, 8, 0], rotate: [3, 5, 3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -left-6 bottom-24 w-64 rounded-2xl bg-surface p-4 text-ink shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
        >
          <span className="rounded bg-mist px-2 py-0.5 text-[0.625rem] font-semibold text-muted">
            {finalCta.notes[1].tag}
          </span>
          <p className="mt-2 text-xs font-medium leading-relaxed text-ink-2">
            {finalCta.notes[1].text}
          </p>
          <div className="mt-2 flex justify-between text-[0.625rem] text-muted">
            <span>{finalCta.notes[1].meta}</span>
            <span>★ Mastered</span>
          </div>
        </motion.div>

        {/* Top Right Card */}
        <motion.div
          animate={{ y: [0, 8, 0], rotate: [6, 4, 6] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute -right-4 top-24 w-64 rounded-2xl bg-surface p-4 text-ink shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
        >
          <span className="rounded bg-mist px-2 py-0.5 text-[0.625rem] font-semibold text-muted">
            {finalCta.notes[2].tag}
          </span>
          <p className="mt-2 text-xs font-medium leading-relaxed text-ink-2">
            {finalCta.notes[2].text}
          </p>
          <div className="mt-2 flex justify-between text-[0.625rem] text-muted">
            <span>{finalCta.notes[2].meta}</span>
            <span>★ High Yield</span>
          </div>
        </motion.div>

        {/* Bottom Right Card */}
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [-3, -5, -3] }}
          transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute -right-6 bottom-20 w-64 rounded-2xl bg-surface p-4 text-ink shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
        >
          <span className="rounded bg-mist px-2 py-0.5 text-[0.625rem] font-semibold text-muted">
            {finalCta.notes[3].tag}
          </span>
          <p className="mt-2 text-xs font-medium leading-relaxed text-ink-2">
            {finalCta.notes[3].text}
          </p>
          <div className="mt-2 flex justify-between text-[0.625rem] text-muted">
            <span>{finalCta.notes[3].meta}</span>
            <span>★ Verified</span>
          </div>
        </motion.div>
      </div>

      <div className="container relative z-10">
        <InViewStagger className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <SectionTag tone="night">Available on Any Device · Free for Students</SectionTag>

          <h2
            id="cta-title"
            className="mt-8 font-display text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl lg:text-[4rem]"
          >
            <SplitLines lines={["Start Studying Smarter", "Today"]} />
          </h2>

          <p className="mt-6 max-w-xl text-lg text-white/75 sm:text-xl">
            Join 50,000+ students who have stopped cramming the night before. Your first active-recall
            deck is 60 seconds away.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <ButtonLink
              href={site.routes.signup}
              size="lg"
              variant="white"
              icon={<ArrowRight className="size-[1.05rem]" />}
            >
              Get started free
            </ButtonLink>
            <span className="font-display text-sm font-semibold text-white/60">or</span>
            <InstallButton variant="night" size="lg" />
          </div>

          <p className="mt-6 text-xs text-white/50">
            100% free for students · No credit card required · Instant access
          </p>

          {/* 3 Bottom Stat Boxes */}
          <div className="mt-16 grid w-full max-w-2xl grid-cols-3 gap-4">
            {finalCta.stats.map((stat, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.04 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center justify-center rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-white/[0.08]"
              >
                <div className="tabular font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  <CountUp value={stat.value} delay={0.2 + i * 0.1} />
                </div>
                <div className="mt-1 text-xs text-white/65">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </InViewStagger>
      </div>
    </section>
  );
}
