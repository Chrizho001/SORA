"use client";

import { animate, motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import { Fragment, useEffect, useMemo, useRef, type ReactNode } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

/* ------------------------------------------------------------------
   CountUp: "1.8M+", "45,820", "+31%", "~4 min", "4.9★" all count from
   zero to their value, keeping prefix, suffix, decimals and grouping.
   Server HTML holds the final value; screen readers only read that.
------------------------------------------------------------------- */
type Parsed = { prefix: string; num: number; decimals: number; grouped: boolean; suffix: string };

function parse(value: string): Parsed | null {
  const m = value.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const [, prefix, raw, suffix] = m;
  return {
    prefix,
    num: parseFloat(raw.replace(/,/g, "")),
    decimals: raw.includes(".") ? raw.split(".")[1].length : 0,
    grouped: raw.includes(","),
    suffix,
  };
}

function format(p: Parsed, v: number) {
  const n = p.grouped
    ? v.toLocaleString("en-US", { minimumFractionDigits: p.decimals, maximumFractionDigits: p.decimals })
    : v.toFixed(p.decimals);
  return `${p.prefix}${n}${p.suffix}`;
}

export function CountUp({
  value,
  duration = 1.8,
  delay = 0,
  className,
}: {
  value: string;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -8% 0px" });
  const reduce = useReducedMotion();
  const parsed = useMemo(() => parse(value), [value]);
  const enabled = !!parsed && parsed.num > 0 && !reduce;

  useEffect(() => {
    const node = ref.current;
    if (!node || !parsed || !enabled) return;
    if (!inView) return;
    node.textContent = format(parsed, 0);
    const controls = animate(0, parsed.num, {
      duration,
      delay,
      ease,
      onUpdate: (v) => {
        node.textContent = format(parsed, v);
      },
      onComplete: () => {
        node.textContent = value;
      },
    });
    return () => controls.stop();
  }, [inView, enabled, parsed, duration, delay, value]);

  return (
    <span className={className}>
      <span ref={ref} aria-hidden>
        {value}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}

/* ------------------------------------------------------------------
   Masked word reveal: each word rises out of its own clipping line.
   Used for headings so type arrives like it is being set.
------------------------------------------------------------------- */
export const wordVariants: Variants = {
  hidden: { y: "110%", opacity: 0 },
  show: { y: "0%", opacity: 1, transition: { duration: 0.9, ease } },
};

export function MaskWord({ children }: { children: ReactNode }) {
  return (
    <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-top">
      <motion.span className="inline-block" variants={wordVariants}>
        {children}
      </motion.span>
    </span>
  );
}

/** Renders words of each line; lines break from `sm` up and flow together on phones. */
export function SplitLines({ lines }: { lines: readonly string[] }) {
  return (
    <>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {li > 0 ? (
            <>
              <br className="hidden sm:inline" />{" "}
            </>
          ) : null}
          {line.split(" ").map((word, wi) => (
            <Fragment key={wi}>
              {wi > 0 ? " " : null}
              <MaskWord>{word}</MaskWord>
            </Fragment>
          ))}
        </Fragment>
      ))}
    </>
  );
}

/** Stagger container that starts when scrolled into view. */
export function InViewStagger({
  children,
  stagger = 0.05,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  stagger?: number;
  delay?: number;
  className?: string;
  as?: "div" | "span" | "ul" | "dl";
}) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
    >
      {children}
    </Comp>
  );
}

export { ease };
