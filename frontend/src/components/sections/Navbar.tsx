"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { Menu, X } from "lucide-react";
import clsx from "clsx";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { nav, site } from "@/content/site";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 220, damping: 40, mass: 0.3 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={clsx(
        "sticky top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-500",
        scrolled || open
          ? "bg-paper/85 shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl"
          : "bg-paper/0",
      )}
    >
      <nav aria-label="Main" className="container flex h-[4.5rem] items-center justify-between gap-6">
        <Link href="#top" className="group -m-1 rounded-lg p-1" aria-label={`${site.name} home`}>
          <Logo />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="relative rounded-full px-3.5 py-2 font-display text-[0.875rem] font-medium text-muted transition-colors duration-300 hover:text-ink after:absolute after:inset-x-3.5 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-ink after:transition-transform after:duration-500 after:ease-[var(--ease-out-expo)] hover:after:scale-x-100"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 lg:flex">
          <ButtonLink href={site.routes.login} variant="light" className="h-10 px-6 text-sm">
            Log in
          </ButtonLink>
          <ButtonLink href={site.routes.signup} className="h-10 px-5 text-sm">
            Get started
          </ButtonLink>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <ButtonLink href={site.routes.signup} className="h-10 px-4 text-sm max-[359px]:hidden">
            Get started
          </ButtonLink>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-11 place-items-center rounded-[11px] bg-surface text-ink ring-1 ring-line transition-[transform,box-shadow] duration-300 hover:shadow-[var(--shadow-soft)] active:scale-95"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={open ? "x" : "menu"}
                initial={{ opacity: 0, rotate: -45 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 45 }}
                transition={{ duration: 0.2 }}
              >
                {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </nav>

      {/* Reading progress: a hairline that fills as the page is read */}
      <motion.div
        aria-hidden
        style={{ scaleX: progress }}
        className={clsx(
          "absolute inset-x-0 bottom-0 h-px origin-left bg-ink/60 transition-opacity duration-500",
          scrolled && !open ? "opacity-100" : "opacity-0",
        )}
      />

      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "calc(100dvh - 4.5rem)" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden bg-paper lg:hidden"
          >
            <div className="container flex h-full flex-col pb-10 pt-6">
              <ul className="flex flex-col">
                {nav.map((item, i) => (
                  <motion.li
                    key={item.href}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="border-b border-line"
                  >
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between py-5 font-display text-2xl font-medium tracking-[-0.02em] text-ink transition-[padding] duration-300 hover:pl-1"
                    >
                      {item.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <div className="mt-auto grid gap-3 pt-10">
                <ButtonLink href={site.routes.signup} size="lg" onClick={() => setOpen(false)}>
                  Get started free
                </ButtonLink>
                <ButtonLink href={site.routes.login} variant="light" size="lg" onClick={() => setOpen(false)}>
                  Log in
                </ButtonLink>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
