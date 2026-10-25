"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { SettingsView } from "@/components/dashboard/views/SettingsView";

export default function SettingsPage() {
  const { user } = useAuth();

  if (!user) return null;

  return <SettingsView user={user} />;
}
