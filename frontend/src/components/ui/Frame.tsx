"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * The reference frames the light part of the page with hairline rails and
 * diagonal hatching in the outer gutters. Rails only appear when there is
 * room for them (lg+), so nothing crowds or overflows on phones.
 */
export function Rails({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
        <div className="container relative h-full">
          <div className="absolute inset-y-0 left-0 w-px bg-line" />
          <div className="absolute inset-y-0 right-0 w-px bg-line" />
          <div className="hatch absolute inset-y-0 right-full w-14 border-r border-line/0" />
          <div className="hatch absolute inset-y-0 left-full w-14" />
        </div>
      </div>
      {children}
    </div>
  );
}

/**
 * Full-width hairline with small squares where it crosses the rails.
 * The line draws outward from the centre as it scrolls into view, then
 * the rail joints settle in, like a ruled sheet being marked up.
 */
export function Divider() {
  return (
    <motion.div
      aria-hidden
      className="relative"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -6% 0px" }}
    >
      <motion.div
        className="h-px w-full origin-center bg-line"
        variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 1.6, ease } } }}
      />
      <div className="container pointer-events-none absolute inset-x-0 -top-[3px] hidden lg:block">
        <div className="relative">
          {["-left-[3.5px]", "-right-[3.5px]"].map((pos) => (
            <motion.span
              key={pos}
              className={`absolute ${pos} size-[7px] rounded-[2px] border border-line-strong bg-paper`}
              variants={{
                hidden: { scale: 0, rotate: -45, opacity: 0 },
                show: { scale: 1, rotate: 0, opacity: 1, transition: { duration: 0.7, ease, delay: 0.7 } },
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
