"use client";

import React from "react";
import {
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { User } from "@/lib/auth-api";
import { PwaInstallCard } from "../PwaInstallCard";

interface SettingsViewProps {
  user: User;
}

export function SettingsView({ user }: SettingsViewProps) {
  return (
    <div className="space-y-6 max-w-3xl pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
          Settings & App Preferences
        </h1>
        <p className="text-xs sm:text-sm text-muted font-body mt-0.5">
          Manage your Progressive Web App installation, notifications, and student profile.
        </p>
      </div>

      {/* PWA Mobile Installation Card */}
      <section className="rounded-3xl bg-surface border border-line p-6 shadow-soft space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-[#c8f560] text-[#141413] flex items-center justify-center font-bold">
            <Smartphone className="size-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-ink">
              Progressive Web App (PWA)
            </h3>
            <p className="text-xs text-muted font-body">
              Install SORA directly onto your iOS or Android home screen for instant full-screen offline access.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <PwaInstallCard className="max-w-md" />
        </div>
      </section>

      {/* Account & Security Information */}
      <section className="rounded-3xl bg-surface border border-line p-6 shadow-soft space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-canvas text-ink flex items-center justify-center font-bold border border-line">
            <ShieldCheck className="size-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-ink">
              Account & Security Verification
            </h3>
            <p className="text-xs text-muted font-body">
              Verified Django REST Framework JWT session details
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-body pt-2">
          <div className="p-3.5 rounded-2xl bg-canvas/50 border border-line">
            <span className="text-subtle font-display font-semibold uppercase text-[0.6875rem] block mb-1">
              Student Name
            </span>
            <p className="font-display font-bold text-ink text-sm">
              {user.first_name} {user.last_name}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-canvas/50 border border-line">
            <span className="text-subtle font-display font-semibold uppercase text-[0.6875rem] block mb-1">
              Email Address
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-ink font-semibold">{user.email}</span>
              {user.is_email_verified ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <AlertCircle className="size-4 text-amber-600" />
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-canvas/50 border border-line">
            <span className="text-subtle font-display font-semibold uppercase text-[0.6875rem] block mb-1">
              Authentication Method
            </span>
            <p className="text-ink font-semibold capitalize">
              {user.auth_providers.length > 0 ? user.auth_providers.join(", ") : "Email & Password"}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-canvas/50 border border-line">
            <span className="text-subtle font-display font-semibold uppercase text-[0.6875rem] block mb-1">
              Token Security
            </span>
            <p className="text-emerald-700 font-semibold flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>In-Memory JWT + HttpOnly Cookie</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
