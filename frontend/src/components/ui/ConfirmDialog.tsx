"use client";

import React from "react";
import { Dialog } from "./Dialog";
import { AlertTriangle } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  isDestructive,
  isLoading = false,
}: ConfirmDialogProps) {
  const isDanger = isDestructive !== undefined ? isDestructive : tone === "danger";

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          {isDanger && (
            <div className="size-9 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="size-4" />
            </div>
          )}
          <p className="text-xs text-muted font-body leading-relaxed pt-1">
            {description}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-canvas hover:bg-mist text-ink text-xs font-display font-semibold transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-xs font-display font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 ${
              isDanger
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-night hover:bg-ink text-[#c8f560]"
            }`}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
