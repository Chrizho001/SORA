"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";
import { faqs, site } from "@/content/site";

export function Faq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  function toggle(idx: number) {
    setOpenIdx((cur) => (cur === idx ? null : idx));
  }

  return (
    <section id="faq" aria-labelledby="faq-title" className="py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          tag="FAQ"
          id="faq-title"
          title={["Questions? We’ve Got", "Answers."]}
          subtitle="Everything you need to know about SORA before you start revising."
        />

        {/* Accordion Box */}
        <Reveal delay={0.1} className="mt-16">
          <div className="mx-auto max-w-3xl overflow-hidden rounded-[1.5rem] bg-surface shadow-[var(--shadow-soft)] ring-1 ring-line">
            <div className="divide-y divide-line">
              {faqs.map((faq, idx) => {
                const isOpen = openIdx === idx;
                return (
                  <div key={idx} className="transition-colors hover:bg-mist/30">
                    <button
                      type="button"
                      onClick={() => toggle(idx)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 p-6 text-left sm:p-7"
                    >
                      <span className="font-display text-base font-semibold text-ink sm:text-lg">
                        {faq.q}
                      </span>
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-mist text-ink transition-transform duration-300">
                        <Plus
                          className={`size-4 transition-transform duration-300 ${
                            isOpen ? "rotate-45" : "rotate-0"
                          }`}
                        />
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 pt-1 text-base leading-relaxed text-muted sm:px-7 sm:pb-7">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* Contact note */}
        <div className="mt-12 text-center text-sm text-muted">
          Still have questions?{" "}
          <a
            href={site.routes.support}
            className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
          >
            Contact our student support team
          </a>
        </div>
      </div>
    </section>
  );
}
