"use client";

import { Stars } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { CountUp } from "@/components/ui/Motion";
import { marqueeQuotes, proofStats } from "@/content/site";

export function MarqueeStats() {
  return (
    <section aria-label="Social proof and metrics" className="pb-24 pt-4">
      {/* Marquee ticker strip with subtle edge fade */}
      <div className="edge-fade relative w-full overflow-hidden border-y border-line bg-paper/60 py-3.5 backdrop-blur-sm">
        <div className="flex w-max animate-[marquee_50s_linear_infinite] items-center gap-10 whitespace-nowrap hover:[animation-play-state:paused]">
          {[...marqueeQuotes, ...marqueeQuotes].map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 text-sm text-muted">
              <span>“{item.quote}”</span>
              <span className="font-display font-medium text-ink">{item.handle}</span>
              <span className="size-1 rounded-full bg-line-strong" aria-hidden />
            </div>
          ))}
        </div>
      </div>

      {/* Ratings & 4-column stats card */}
      <div className="container mt-20">
        <Reveal className="flex flex-col items-center text-center">
          <p className="font-display text-sm font-medium tracking-wide text-muted">
            Loved by <span className="font-semibold text-ink">50,000+</span> students worldwide
          </p>
          <div className="mt-3 flex items-center gap-2 text-ink">
            <Stars animated={true} delay={0.15} className="size-4 fill-ink text-ink" />
            <span className="font-display text-sm font-semibold tracking-tight">4.9/5</span>
            <span className="text-xs text-muted">from 3,800+ reviews</span>
          </div>
        </Reveal>

        <Reveal delay={0.15} className="mt-10">
          <div className="mx-auto max-w-5xl rounded-[1.35rem] bg-surface p-8 shadow-[var(--shadow-soft)] ring-1 ring-line transition-all duration-300 hover:shadow-[var(--shadow-lift)] sm:p-10">
            <dl className="grid grid-cols-2 gap-8 divide-line sm:grid-cols-4 sm:divide-x sm:divide-y-0">
              {proofStats.map((stat, i) => (
                <div
                  key={stat.label}
                  className={`flex flex-col items-center text-center ${i > 0 ? "sm:pl-8" : ""} ${
                    i % 2 === 1 ? "max-sm:border-l max-sm:border-line max-sm:pl-6" : ""
                  }`}
                >
                  <dd className="tabular font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl lg:text-[2.65rem]">
                    <CountUp value={stat.value} delay={0.2 + i * 0.1} />
                  </dd>
                  <dt className="mt-2 text-sm font-medium text-muted">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
