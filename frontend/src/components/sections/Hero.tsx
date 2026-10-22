"use client";

import { motion } from "framer-motion";
import { ArrowRight, FileText, GalleryVerticalEnd, Layers, Smartphone } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { InstallButton } from "@/components/ui/InstallButton";
import { CountUp } from "@/components/ui/Motion";
import { staggerChild, staggerParent } from "@/components/ui/Reveal";
import { heroStats, site } from "@/content/site";
import { PhoneMockup } from "./PhoneMockup";

const icons = { phone: Smartphone, file: FileText, cards: Layers } as const;
const ease = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="container pb-20 pt-10 sm:pt-14 lg:pb-28 lg:pt-16">
      <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        <motion.div variants={staggerParent} initial="hidden" animate="show" className="min-w-0 lg:pl-6">
          <motion.h1
            id="hero-title"
            variants={staggerChild}
            className="text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.035em] text-ink min-[400px]:text-[2.9rem] sm:text-[3.6rem] xl:text-[4.25rem]"
          >
            Turn Lectures into{" "}
            <motion.span
              aria-hidden
              initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 8 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.55 }}
              className="relative top-[-0.06em] inline-grid size-[0.95em] place-items-center rounded-[0.22em] bg-[linear-gradient(160deg,#2f333c,#14161b)] align-middle text-white shadow-[0_10px_22px_-10px_rgb(17_19_24/0.7),inset_0_1px_0_rgb(255_255_255/0.12)]"
            >
              <GalleryVerticalEnd className="size-[0.55em]" strokeWidth={1.75} />
            </motion.span>{" "}
            Flashcards in Minutes, Not Nights
          </motion.h1>

          <motion.p
            variants={staggerChild}
            className="mt-7 max-w-[34rem] text-lg leading-relaxed text-muted sm:text-[1.25rem]"
          >
            Just drop in your lecture PDF. {site.name} turns it into a clear summary, ready-to-review
            flashcards and a quiz that shows exactly what you don’t know yet.
          </motion.p>

          <motion.div variants={staggerChild} className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-3">
            <ButtonLink
              href={site.routes.signup}
              size="lg"
              icon={<ArrowRight className="size-[1.05rem]" aria-hidden />}
            >
              Get started free
            </ButtonLink>
            <span className="font-display text-sm font-semibold text-ink-2">or</span>
            <InstallButton size="lg" />
          </motion.div>

          <motion.dl variants={staggerChild} className="mt-14 grid max-w-[30rem] grid-cols-3">
            {heroStats.map((stat, i) => {
              const Icon = icons[stat.icon];
              return (
                <div
                  key={stat.value}
                  className={`group min-w-0 ${i > 0 ? "border-l border-line pl-4 sm:pl-7" : "pr-4 sm:pr-7"} ${i === 1 ? "pr-4 sm:pr-7" : ""}`}
                >
                  <Icon
                    className="size-6 text-ink transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:-translate-y-1"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <dd className="tabular mt-6 font-display text-[1.6rem] font-semibold tracking-[-0.03em] text-ink sm:text-[2rem]">
                    <CountUp value={stat.value} delay={0.6 + i * 0.15} />
                  </dd>
                  <dt className="mt-1 text-[0.9375rem] leading-snug text-muted">
                    {stat.label[0]}
                    <br />
                    {stat.label[1]}
                  </dt>
                </div>
              );
            })}
          </motion.dl>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease }}
          className="min-w-0"
        >
          <PhoneMockup />
        </motion.div>
      </div>
    </section>
  );
}
