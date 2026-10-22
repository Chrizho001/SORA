"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Stars, SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { CountUp } from "@/components/ui/Motion";
import { featuredReview, reviews } from "@/content/site";
import { BookOpen, Trophy } from "lucide-react";

export function Reviews() {
  return (
    <section id="reviews" aria-labelledby="reviews-title" className="py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          tag="Reviews"
          id="reviews-title"
          title={["Students Are Passing.", "Fast."]}
          subtitle="Real results from university students using SORA for active recall every single day."
        />

        {/* Featured Big Dark Card */}
        <Reveal delay={0.1} className="mt-16">
          <div className="relative overflow-hidden rounded-[1.75rem] bg-[linear-gradient(160deg,#1f232c,#101217)] p-8 text-white shadow-[var(--shadow-float)] ring-1 ring-white/10 sm:p-12 lg:p-14">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
              {/* Left Quote Column */}
              <div className="lg:col-span-7">
                <Stars animated={true} delay={0.2} className="size-4 fill-white text-white" />
                <blockquote className="mt-6 font-display text-xl font-medium leading-relaxed tracking-tight text-white/95 sm:text-2xl lg:text-[1.7rem]">
                  {featuredReview.quote}
                </blockquote>

                <div className="mt-8 flex items-center gap-4">
                  <div className="relative size-12 overflow-hidden rounded-full ring-2 ring-white/20">
                    <Image
                      src={featuredReview.avatar}
                      alt={featuredReview.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-display text-base font-semibold text-white">
                      {featuredReview.name}
                    </div>
                    <div className="text-xs text-white/60">{featuredReview.meta}</div>
                  </div>
                </div>
              </div>

              {/* Right 4-Stat Box Grid */}
              <div className="grid grid-cols-2 gap-4 lg:col-span-5">
                {featuredReview.stats.map((stat, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.03 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col justify-between rounded-2xl bg-white/[0.05] p-5 ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-white/[0.08]"
                  >
                    <div className="tabular font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      <CountUp value={stat.value} delay={0.2 + idx * 0.1} />
                    </div>
                    <div className="mt-2 text-xs font-medium text-white/80">{stat.label}</div>
                    <div className="mt-0.5 text-[0.6875rem] text-white/40">{stat.sub}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* 6-Grid Testimonial Cards */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((rev, idx) => (
            <Reveal key={rev.name} delay={0.08 * (idx + 1)} className="flex">
              <motion.div
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
                className="group flex w-full flex-col justify-between rounded-[1.35rem] bg-surface p-7 shadow-[var(--shadow-soft)] ring-1 ring-line transition-shadow duration-300 hover:shadow-[var(--shadow-lift)] sm:p-8"
              >
                <div>
                  {/* User Profile Header */}
                  <div className="flex items-center gap-3.5">
                    <div className="relative size-11 shrink-0 overflow-hidden rounded-full ring-1 ring-line transition-transform duration-300 group-hover:scale-105">
                      <Image
                        src={rev.avatar}
                        alt={rev.name}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-display text-sm font-semibold text-ink sm:text-base">
                        {rev.name}
                      </h4>
                      <p className="truncate text-xs text-muted">{rev.meta}</p>
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="mt-4">
                    <Stars className="size-3.5 fill-ink text-ink" />
                  </div>

                  {/* Quote */}
                  <p className="mt-3 text-sm leading-relaxed text-ink-2 sm:text-[0.9375rem]">
                    {rev.quote}
                  </p>
                </div>

                {/* Footer Metrics */}
                <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-xs font-medium text-muted">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="size-3.5 text-muted" />
                    <span>{rev.cards} cards revised</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Trophy className="size-3.5 text-muted" />
                    <span>{rev.quizzes} quizzes taken</span>
                  </span>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
