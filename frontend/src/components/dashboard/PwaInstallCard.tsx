"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CheckCircle2, Download, Smartphone, X, Share, PlusSquare } from "lucide-react";
import { notify } from "@/components/auth/ToastProvider";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallCard({ className = "" }: { className?: string }) {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari navigator.standalone check
      window.navigator.standalone === true
    );
  });
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      deferredPrompt.current = null;
      notify.success("SORA PWA installed! You can now launch it from your home screen.", "App Installed");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt();
      const choice = await deferredPrompt.current.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      deferredPrompt.current = null;
    } else {
      // Show iOS / manual instructions
      setShowIosModal(true);
    }
  };

  if (isInstalled) {
    return (
      <div
        className={`rounded-2xl bg-[#1d202a] border border-[#2c303f] p-3.5 text-white ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-display font-semibold text-white truncate">SORA Installed</p>
            <p className="text-[0.6875rem] text-gray-400">Ready for offline studying</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1d202a] to-[#161821] border border-[#2e3242] p-4 text-white shadow-lift ${className}`}
      >
        {/* Top visual graphic with lime badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="size-10 rounded-xl bg-[#c8f560] text-[#141413] flex items-center justify-center font-bold shadow-sm">
            <Smartphone className="size-5" />
          </div>

          <button
            type="button"
            onClick={handleInstallClick}
            aria-label="Install app"
            className="size-8 rounded-full bg-white/10 hover:bg-[#c8f560] hover:text-[#141413] text-white flex items-center justify-center transition-all duration-200 active:scale-95"
            title="Install PWA"
          >
            <ArrowUpRight className="size-4" />
          </button>
        </div>

        {/* Text descriptions */}
        <h3 className="font-display font-semibold text-sm text-white leading-snug">
          Download our mobile app
        </h3>
        <p className="text-[0.7rem] text-gray-400 font-body mt-1 leading-normal">
          Install SORA on your phone for instant offline summaries and flashcards.
        </p>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleInstallClick}
          className="mt-3.5 w-full inline-flex items-center justify-center gap-2 h-9 rounded-xl bg-[#c8f560] hover:bg-[#bbf048] active:scale-[0.98] text-[#141413] text-xs font-display font-bold transition-all shadow-sm"
        >
          <Download className="size-3.5" />
          <span>{isInstallable ? "Install App Now" : "Add to Home Screen"}</span>
        </button>
      </div>

      {/* iOS / Manual PWA Installation Guide Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-surface border border-line p-6 shadow-2xl text-ink space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div className="flex items-center gap-2">
                <Smartphone className="size-5 text-ink" />
                <h4 className="font-display font-bold text-base">Install SORA to Home Screen</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                className="size-7 rounded-full text-muted hover:bg-mist hover:text-ink flex items-center justify-center"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-muted font-body leading-relaxed">
              Install SORA directly on your device to enjoy full-screen study sessions without browser toolbars.
            </p>

            <div className="space-y-3 text-xs font-body">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-canvas border border-line">
                <span className="size-7 rounded-lg bg-mist text-ink flex items-center justify-center shrink-0 font-bold">
                  <Share className="size-3.5" />
                </span>
                <span>
                  <strong>Step 1:</strong> Tap the <strong>Share</strong> button on your browser menu.
                </span>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-canvas border border-line">
                <span className="size-7 rounded-lg bg-mist text-ink flex items-center justify-center shrink-0 font-bold">
                  <PlusSquare className="size-3.5" />
                </span>
                <span>
                  <strong>Step 2:</strong> Scroll down and select <strong>&quot;Add to Home Screen&quot;</strong>.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="w-full h-10 rounded-xl bg-night text-white font-display text-xs font-semibold hover:bg-ink transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
}
