"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { motion, type Variants } from "framer-motion";
import { Star } from "lucide-react";
import { InViewStagger, SplitLines, ease } from "./Motion";

export function SectionTag({ children, tone = "paper" }: { children: ReactNode; tone?: "paper" | "night" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-display text-[0.6875rem] font-medium uppercase tracking-[0.12em]",
        tone === "paper"
          ? "bg-surface text-ink-2 shadow-[var(--shadow-soft)] ring-1 ring-line"
          : "bg-white/[0.04] text-white/80 ring-1 ring-white/15",
      )}
    >
      <span className={clsx("size-1.5 rounded-full", tone === "paper" ? "bg-ink" : "bg-signal")} />
      {children}
    </span>
  );
}

const tagVariants: Variants = {
  hidden: { opacity: 0, scale: 0.85, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.7, ease } },
};

const subtitleVariants: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease } },
};

type SectionHeadingProps = {
  tag: string;
  /** One string per line. Lines break from `sm` up and flow together on phones. */
  title: readonly string[];
  subtitle?: ReactNode;
  id?: string;
  className?: string;
};

export function SectionHeading({ tag, title, subtitle, id, className }: SectionHeadingProps) {
  return (
    <InViewStagger
      stagger={0.045}
      className={clsx("mx-auto flex max-w-2xl flex-col items-center text-center", className)}
    >
      <motion.span variants={tagVariants}>
        <SectionTag>{tag}</SectionTag>
      </motion.span>
      <h2
        id={id}
        className="mt-6 text-[2.125rem] font-semibold leading-[1.06] text-ink sm:text-5xl lg:text-[3.5rem]"
      >
        <SplitLines lines={title} />
      </h2>
      {subtitle ? (
        <motion.p
          variants={subtitleVariants}
          className="mt-6 max-w-[36ch] text-lg leading-relaxed text-muted sm:text-xl"
        >
          {subtitle}
        </motion.p>
      ) : null}
    </InViewStagger>
  );
}

/**
 * Five stars. With `animated`, they light up one after another the first
 * time they scroll into view.
 */
export function Stars({
  className = "size-3.5",
  label = "5 out of 5 stars",
  animated = false,
  delay = 0,
}: {
  className?: string;
  label?: string;
  animated?: boolean;
  delay?: number;
}) {
  if (!animated) {
    return (
      <span className="inline-flex items-center gap-1" role="img" aria-label={label}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={clsx(className, "fill-current")} strokeWidth={0} aria-hidden />
        ))}
      </span>
    );
  }
  return (
    <motion.span
      className="inline-flex items-center gap-1"
      role="img"
      aria-label={label}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: delay } } }}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <motion.span
          key={i}
          className="inline-flex"
          variants={{
            hidden: { opacity: 0.15, scale: 0.4, rotate: -40 },
            show: { opacity: 1, scale: 1, rotate: 0, transition: { type: "spring", stiffness: 420, damping: 18 } },
          }}
        >
          <Star className={clsx(className, "fill-current")} strokeWidth={0} aria-hidden />
        </motion.span>
      ))}
    </motion.span>
  );
}
