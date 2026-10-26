"use client";

import React from "react";
import { ToastContainer, toast, ToastOptions } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastContainer
        position="bottom-right"
        autoClose={4500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        toastClassName="!rounded-xl !shadow-lift !border !border-line !font-display !text-sm !text-ink !bg-white"
        progressClassName="!bg-night"
      />
    </>
  );
}

/**
 * Helper toast alerts matching SORA design language
 */
export const notify = {
  success: (message: string, title?: string, options?: ToastOptions) => {
    toast.success(
      <div>
        {title && <div className="font-semibold font-display text-ink">{title}</div>}
        <div className="text-muted text-xs mt-0.5">{message}</div>
      </div>,
      {
        icon: <span>✨</span>,
        ...options,
      }
    );
  },
  error: (message: string, title?: string, options?: ToastOptions) => {
    toast.error(
      <div>
        {title && <div className="font-semibold font-display text-red-600">{title}</div>}
        <div className="text-red-950 text-xs mt-0.5">{message}</div>
      </div>,
      {
        icon: <span>⚠️</span>,
        ...options,
      }
    );
  },
  warning: (message: string, title?: string, options?: ToastOptions) => {
    toast.warning(
      <div>
        {title && <div className="font-semibold font-display text-amber-600">{title}</div>}
        <div className="text-amber-950 text-xs mt-0.5">{message}</div>
      </div>,
      {
        icon: <span>⚠️</span>,
        ...options,
      }
    );
  },
  info: (message: string, title?: string, options?: ToastOptions) => {
    toast.info(
      <div>
        {title && <div className="font-semibold font-display text-ink">{title}</div>}
        <div className="text-muted text-xs mt-0.5">{message}</div>
      </div>,
      {
        icon: <span>ℹ️</span>,
        ...options,
      }
    );
  },
};
