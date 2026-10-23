"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUpRight,
  CheckCircle2,
  Download,
  Smartphone,
  X,
  Share,
  PlusSquare,
} from "lucide-react";
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
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

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

  // Close modal on Escape
  useEffect(() => {
    if (!showIosModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowIosModal(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showIosModal]);

  const handleInstallClick = async () => {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt();
      const choice = await deferredPrompt.current.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      deferredPrompt.current = null;
    } else {
      setShowIosModal(true);
    }
  };

  if (isInstalled) {
    return (
      <div
        className={`rounded-2xl bg-[#1d202a] border border-[#2c303f] p-3.5 text-white transition-all hover:border-[#3d4256] ${className}`}
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

  const modalContent =
    mounted && showIosModal
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-modal-title"
            onClick={() => setShowIosModal(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
          >
            {/* Modal Dialog Card (opaque solid white, stopped propagation) */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-white border border-line-strong p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] text-ink space-y-4 animate-in zoom-in-95 duration-200"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-line">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-2xl bg-[#c8f560] text-[#141413] flex items-center justify-center font-bold shadow-xs">
                    <Smartphone className="size-4.5" />
                  </div>
                  <div>
                    <h4 id="pwa-modal-title" className="font-display font-bold text-base text-ink">
                      Install SORA to Phone
                    </h4>
                    <p className="text-[0.6875rem] text-muted font-body">Progressive Web App</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowIosModal(false)}
                  className="size-8 rounded-full text-muted hover:bg-mist hover:text-ink flex items-center justify-center transition-colors active:scale-95"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>

              <p className="text-xs text-muted font-body leading-relaxed">
                Add SORA to your home screen for full-screen offline access without browser toolbars.
              </p>

              {/* Instructions steps */}
              <div className="space-y-2.5 text-xs font-body">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-canvas/80 border border-line">
                  <span className="size-8 rounded-xl bg-white text-ink flex items-center justify-center shrink-0 font-bold shadow-xs">
                    <Share className="size-4 text-emerald-600" />
                  </span>
                  <span>
                    <strong>Step 1:</strong> Tap the <strong>Share</strong> icon on Safari or the ⋮ menu on Chrome.
                  </span>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-2xl bg-canvas/80 border border-line">
                  <span className="size-8 rounded-xl bg-white text-ink flex items-center justify-center shrink-0 font-bold shadow-xs">
                    <PlusSquare className="size-4 text-emerald-600" />
                  </span>
                  <span>
                    <strong>Step 2:</strong> Select <strong>&quot;Add to Home Screen&quot;</strong> and tap Add.
                  </span>
                </div>
              </div>

              {/* Confirm button */}
              <button
                id="close-pwa-modal-btn"
                type="button"
                onClick={() => setShowIosModal(false)}
                className="w-full h-10 rounded-2xl bg-[#14161f] hover:bg-night text-[#c8f560] font-display text-xs font-bold transition-all shadow-md active:scale-95"
              >
                Got It, Thanks!
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1d202a] to-[#161821] border border-[#2e3242] p-4 text-white shadow-lift hover:border-[#42475e] transition-all duration-300 ${className}`}
      >
        {/* Top visual graphic with lime badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="size-10 rounded-xl bg-[#c8f560] text-[#141413] flex items-center justify-center font-bold shadow-sm group-hover:scale-105 transition-transform duration-200">
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

        {/* Action Button with hover animation */}
        <button
          id="pwa-install-btn"
          type="button"
          onClick={handleInstallClick}
          className="mt-3.5 w-full inline-flex items-center justify-center gap-2 h-9 rounded-xl bg-[#c8f560] hover:bg-[#bbf048] hover:shadow-[0_0_15px_rgba(200,245,96,0.3)] active:scale-[0.98] text-[#141413] text-xs font-display font-bold transition-all duration-200 shadow-sm"
        >
          <Download className="size-3.5" />
          <span>{isInstallable ? "Install App Now" : "Add to Home Screen"}</span>
        </button>
      </div>

      {modalContent}
    </>
  );
}
