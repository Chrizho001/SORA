"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, BatteryFull, Bell, Mic, Signal, Sparkle, Wifi } from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

const prompts = ["Summarise my Week 6 lecture PDF", "Quiz me on cell signalling"];

/**
 * A code-drawn phone showing SORA's home screen, tilted in perspective like
 * the reference. The bottom fades into the paper.
 */
export function PhoneMockup() {
  const reduce = useReducedMotion();

  return (
    <div className="relative mx-auto flex h-[30rem] w-full max-w-[34rem] items-start justify-center overflow-hidden rounded-[1.75rem] sm:h-[36rem] lg:h-[40rem]">
      {/* dotted field, fading at the edges */}
      <div
        aria-hidden
        className="dot-field absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_at_50%_35%,black_20%,transparent_72%)]"
      />

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 60, rotateX: 4, rotateY: 0, rotateZ: 0 }}
        animate={{ opacity: 1, y: 0, rotateX: 14, rotateY: -12, rotateZ: -9 }}
        transition={{ duration: 1.4, ease, delay: 0.25 }}
        style={{ transformPerspective: 1600 }}
        className="relative mt-14 w-[16.5rem] sm:mt-16 sm:w-[18.75rem] [mask-image:linear-gradient(to_bottom,black_62%,transparent_94%)]"
      >
        <motion.div
          animate={reduce ? undefined : { y: [0, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* frame */}
          <div className="rounded-[3rem] bg-[linear-gradient(145deg,#3a3d44,#0d0e11_40%,#25272d)] p-[0.6rem] shadow-[0_40px_80px_-30px_rgb(17_19_24/0.55),inset_0_0_0_1px_rgb(255_255_255/0.08)]">
            <div className="relative h-[34rem] overflow-hidden rounded-[2.5rem] bg-surface sm:h-[38rem]">
              {/* status bar */}
              <div className="flex items-center justify-between px-7 pt-4 font-display text-[0.8125rem] font-semibold text-ink">
                <span className="tabular">9:41</span>
                <span className="flex items-center gap-1.5" aria-hidden>
                  <Signal className="size-3.5" strokeWidth={2.5} />
                  <Wifi className="size-3.5" strokeWidth={2.5} />
                  <BatteryFull className="size-4" strokeWidth={2} />
                </span>
              </div>
              <div className="absolute left-1/2 top-3 h-7 w-24 -translate-x-1/2 rounded-full bg-black" aria-hidden />

              {/* app header */}
              <div className="mt-6 flex items-center justify-between px-6 text-ink" aria-hidden>
                <ArrowLeft className="size-5" />
                <span className="flex items-center gap-3">
                  <Bell className="size-[1.1rem]" />
                </span>
              </div>

              <div className="mt-8 px-6 text-center">
                <p className="font-display text-[1.5rem] font-semibold leading-[1.12] tracking-[-0.03em] text-ink sm:text-[1.65rem]">
                  What Are We Studying Today?
                </p>
                <p className="mt-2 font-display text-[0.75rem] font-medium text-muted">
                  Next deadline: Biochem essay · Fri
                </p>
              </div>

              {/* AI orb */}
              <div className="mt-9 flex justify-center">
                <span className="relative grid size-14 place-items-center rounded-full bg-ink text-white shadow-[0_12px_24px_-10px_rgb(17_19_24/0.6)]">
                  {!reduce ? (
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-full ring-2 ring-ink/30"
                      animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                    />
                  ) : null}
                  <Sparkle className="size-6 fill-white" strokeWidth={1.5} aria-hidden />
                </span>
              </div>

              {/* suggestion chips */}
              <div className="mt-8 flex flex-col items-center gap-3 px-4">
                {prompts.map((p, i) => (
                  <motion.span
                    key={p}
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 + i * 0.15, duration: 0.8, ease }}
                    className={`flex items-center gap-2 rounded-full bg-surface px-4 py-2.5 font-display text-[0.75rem] font-medium text-ink shadow-[0_6px_18px_-8px_rgb(17_19_24/0.25)] ring-1 ring-line ${i === 1 ? "ml-8" : ""}`}
                  >
                    <span className="size-1.5 rounded-full bg-[#a99bf0]" />
                    {p}
                  </motion.span>
                ))}
              </div>

              {/* mic */}
              <div className="mt-12 flex justify-center">
                <span className="grid size-14 place-items-center rounded-full bg-mist text-ink shadow-inner blur-[0.5px]">
                  <Mic className="size-5" aria-hidden />
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
