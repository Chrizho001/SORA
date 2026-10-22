"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { buttonClasses, IconSwap, RollLabel } from "./Button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Secondary hero CTA. Uses the browser's native PWA install prompt when it
 * is available; otherwise shows short "Add to Home Screen" steps.
 */
export function InstallButton({
  variant = "dark",
  size = "md",
  className,
}: {
  variant?: "dark" | "light" | "night";
  size?: "md" | "lg";
  className?: string;
}) {
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  async function handleClick() {
    if (deferred.current) {
      await deferred.current.prompt();
      const choice = await deferred.current.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      deferred.current = null;
      return;
    }
    setOpen((v) => !v);
  }

  return (
    <div ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        onClick={handleClick}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={buttonClasses(variant, size, className)}
      >
        <RollLabel key={installed ? "done" : "install"}>{installed ? "App installed" : "Install app"}</RollLabel>
        <IconSwap axis="y">
          <Download className="size-[1.05rem]" strokeWidth={2} />
        </IconSwap>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-label="How to install the app"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-1/2 top-full z-30 mt-3 w-[min(18rem,calc(100vw-2.5rem))] -translate-x-1/2 rounded-2xl bg-surface p-5 text-left text-ink shadow-[var(--shadow-float)] ring-1 ring-line sm:left-0 sm:translate-x-0"
          >
            <div className="flex items-start justify-between gap-4">
              <p className="font-display text-[0.9375rem] font-semibold">Add SORA to your home screen</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-mist hover:text-ink"
                aria-label="Close"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <ol className="mt-4 space-y-3 text-[0.9375rem] text-muted">
              <li className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-mist text-ink">
                  <Share className="size-4" aria-hidden />
                </span>
                Tap Share (Safari) or the ⋮ menu (Chrome)
              </li>
              <li className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-mist text-ink">
                  <SquarePlus className="size-4" aria-hidden />
                </span>
                Choose “Add to Home Screen”
              </li>
            </ol>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
