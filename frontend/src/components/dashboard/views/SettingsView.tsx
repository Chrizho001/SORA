"use client";

import React, { useState, useEffect } from "react";
import {
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  KeyRound,
  Bell,
  BellRing,
  Smartphone,
  Loader2,
  Eye,
  EyeOff,
  Info,
  Check,
  AlertTriangle,
} from "lucide-react";
import { User, authApi, AuthApiError } from "@/lib/auth-api";
import { useAuth } from "@/lib/auth-context";
import { setStoredAccessToken } from "@/lib/axios-client";
import {
  changePasswordSchema,
  profileUpdateSchema,
} from "@/lib/auth-schemas";
import {
  notificationsApi,
  NotificationPreference,
} from "@/lib/dashboard-api";
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from "@/lib/use-dashboard-queries";
import {
  ALL_NOTIFICATION_TYPES,
  getNotificationMeta,
  NotificationType,
} from "@/lib/notification-types";
import {
  urlBase64ToUint8Array,
  isPushSupported,
  isIOS,
  getActivePushSubscription,
  unsubscribeFromPush,
} from "@/lib/push-notifications";
import { notify } from "@/components/auth/ToastProvider";
import { PwaInstallCard } from "../PwaInstallCard";

interface SettingsViewProps {
  user: User;
}

export function SettingsView({ user }: SettingsViewProps) {
  return (
    <div className="space-y-8 max-w-3xl pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
          Settings & App Preferences
        </h1>
        <p className="text-xs sm:text-sm text-muted font-body mt-0.5">
          Manage your student profile, account security, notifications, and device preferences.
        </p>
      </div>

      {/* SECTION 1: PROFILE */}
      <ProfileSection key={`profile-${user.id}-${user.first_name}-${user.last_name}`} user={user} />

      {/* SECTION 2: SECURITY & AUTH */}
      <SecuritySection user={user} />

      {/* SECTION 3: NOTIFICATIONS & WEB PUSH */}
      <NotificationsSection />

      {/* SECTION 4: PROGRESSIVE WEB APP (PWA) */}
      <section className="rounded-3xl bg-surface border border-line p-6 shadow-soft space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-[#c8f560] text-[#141413] flex items-center justify-center font-bold">
            <Smartphone className="size-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base text-ink">
              Progressive Web App (PWA)
            </h2>
            <p className="text-xs text-muted font-body">
              Install SORA directly onto your iOS or Android home screen for instant full-screen offline access.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <PwaInstallCard className="max-w-md" />
        </div>
      </section>
    </div>
  );
}

/**
 * ==========================================
 * SECTION 1: STUDENT PROFILE
 * ==========================================
 */
function ProfileSection({ user }: { user: User }) {
  const { setUser } = useAuth();
  const [firstName, setFirstName] = useState(user.first_name || "");
  const [lastName, setLastName] = useState(user.last_name || "");
  const [profileErrors, setProfileErrors] = useState<{
    first_name?: string;
    last_name?: string;
  }>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrors({});

    const result = profileUpdateSchema.safeParse({
      first_name: firstName,
      last_name: lastName,
    });

    if (!result.success) {
      const fieldErrors: { first_name?: string; last_name?: string } = {};
      for (const issue of result.error.issues) {
        if (issue.path[0] === "first_name") fieldErrors.first_name = issue.message;
        if (issue.path[0] === "last_name") fieldErrors.last_name = issue.message;
      }
      setProfileErrors(fieldErrors);
      return;
    }

    try {
      setIsSavingProfile(true);
      const updated = await authApi.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      setUser(updated);
      notify.success("Your profile details have been saved.", "Profile Updated");
    } catch (err: unknown) {
      if (err instanceof AuthApiError && err.errors) {
        setProfileErrors({
          first_name: err.errors.first_name?.[0],
          last_name: err.errors.last_name?.[0],
        });
      }
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      notify.error(msg, "Profile Update Failed");
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <section className="rounded-3xl bg-surface border border-line p-6 shadow-soft space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-2xl bg-[#c8f560] text-[#141413] flex items-center justify-center font-bold">
          <UserIcon className="size-5" />
        </div>
        <div>
          <h2 className="font-display font-bold text-base text-ink">
            Student Profile
          </h2>
          <p className="text-xs text-muted font-body">
            Your personal information and academic identity.
          </p>
        </div>
      </div>

      <form onSubmit={handleProfileSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* First Name */}
          <div>
            <label
              htmlFor="first_name"
              className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5"
            >
              First Name
            </label>
            <input
              id="first_name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={150}
              placeholder="First name"
              className={`w-full px-3.5 py-2.5 rounded-xl bg-canvas border text-sm text-ink placeholder:text-subtle/60 focus:outline-none focus:ring-2 focus:ring-[#c8f560] transition-colors ${
                profileErrors.first_name ? "border-rose-500" : "border-line"
              }`}
            />
            {profileErrors.first_name && (
              <p className="text-xs text-rose-600 mt-1 font-medium">
                {profileErrors.first_name}
              </p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label
              htmlFor="last_name"
              className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5"
            >
              Last Name
            </label>
            <input
              id="last_name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={150}
              placeholder="Last name"
              className={`w-full px-3.5 py-2.5 rounded-xl bg-canvas border text-sm text-ink placeholder:text-subtle/60 focus:outline-none focus:ring-2 focus:ring-[#c8f560] transition-colors ${
                profileErrors.last_name ? "border-rose-500" : "border-line"
              }`}
            />
            {profileErrors.last_name && (
              <p className="text-xs text-rose-600 mt-1 font-medium">
                {profileErrors.last_name}
              </p>
            )}
          </div>
        </div>

        {/* Email Address (Read-only with badge) */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5"
          >
            Email Address
          </label>
          <div className="relative flex items-center">
            <input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="w-full px-3.5 py-2.5 rounded-xl bg-canvas/60 border border-line text-sm text-muted cursor-not-allowed select-none pr-28"
            />
            <div className="absolute right-3 flex items-center">
              {user.is_email_verified ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 border border-emerald-500/20">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 border border-amber-500/20">
                  <AlertCircle className="size-3.5 text-amber-600" />
                  Unverified
                </span>
              )}
            </div>
          </div>
          <p className="text-[0.6875rem] text-subtle mt-1.5 font-body">
            Email address is tied to your student account and cannot be modified directly.
          </p>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSavingProfile}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-display font-semibold text-xs text-[#141413] bg-[#c8f560] hover:bg-[#bbf045] active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none shadow-sm"
          >
            {isSavingProfile && <Loader2 className="size-3.5 animate-spin" />}
            Save Profile Changes
          </button>
        </div>
      </form>
    </section>
  );
}

/**
 * ==========================================
 * SECTION 2: SECURITY & AUTHENTICATION
 * ==========================================
 */
function SecuritySection({ user }: { user: User }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordErrors, setPasswordErrors] = useState<{
    old_password?: string;
    new_password?: string;
    new_password_confirm?: string;
  }>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isRequestingReset, setIsRequestingReset] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});

    const result = changePasswordSchema.safeParse({
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    });

    if (!result.success) {
      const fieldErrors: {
        old_password?: string;
        new_password?: string;
        new_password_confirm?: string;
      } = {};
      for (const issue of result.error.issues) {
        if (issue.path[0] === "old_password") fieldErrors.old_password = issue.message;
        if (issue.path[0] === "new_password") fieldErrors.new_password = issue.message;
        if (issue.path[0] === "new_password_confirm")
          fieldErrors.new_password_confirm = issue.message;
      }
      setPasswordErrors(fieldErrors);
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await authApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      });

      // Store returned rotated access token with setStoredAccessToken
      setStoredAccessToken(res.access);

      notify.success(
        "Password changed successfully. Your session was refreshed.",
        "Password Updated"
      );

      // Clear password form
      setOldPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (err: unknown) {
      if (err instanceof AuthApiError && err.errors) {
        setPasswordErrors({
          old_password: err.errors.old_password?.[0],
          new_password: (err.errors.new_password || err.errors.password)?.[0],
          new_password_confirm: (
            err.errors.new_password_confirm || err.errors.password_confirm
          )?.[0],
        });
      }
      const msg = err instanceof Error ? err.message : "Failed to change password.";
      notify.error(msg, "Password Update Failed");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSetPassword = async () => {
    try {
      setIsRequestingReset(true);
      await authApi.requestPasswordReset(user.email);
      notify.success(
        "We emailed you a link to set a password.",
        "Check Your Email"
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to send password setup email.";
      notify.error(msg, "Request Failed");
    } finally {
      setIsRequestingReset(false);
    }
  };

  return (
    <section className="rounded-3xl bg-surface border border-line p-6 shadow-soft space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-2xl bg-canvas text-ink flex items-center justify-center font-bold border border-line">
          <ShieldCheck className="size-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="font-display font-bold text-base text-ink">
            Security & Authentication
          </h2>
          <p className="text-xs text-muted font-body">
            Manage your password and verified sign-in methods.
          </p>
        </div>
      </div>

      {/* Change Password OR Set Password */}
      {user.has_password ? (
        <form onSubmit={handlePasswordChange} className="space-y-4 pt-1">
          <h3 className="text-xs font-bold font-display uppercase tracking-wider text-subtle">
            Change Password
          </h3>

          {/* Current Password */}
          <div>
            <label
              htmlFor="old_password"
              className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5"
            >
              Current Password
            </label>
            <div className="relative">
              <input
                id="old_password"
                type={showOldPassword ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-canvas border text-sm text-ink placeholder:text-subtle/60 focus:outline-none focus:ring-2 focus:ring-[#c8f560] transition-colors pr-10 ${
                  passwordErrors.old_password ? "border-rose-500" : "border-line"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-ink transition-colors"
                aria-label={showOldPassword ? "Hide password" : "Show password"}
              >
                {showOldPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {passwordErrors.old_password && (
              <p className="text-xs text-rose-600 mt-1 font-medium">
                {passwordErrors.old_password}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* New Password */}
            <div>
              <label
                htmlFor="new_password"
                className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5"
              >
                New Password
              </label>
              <div className="relative">
                <input
                  id="new_password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-canvas border text-sm text-ink placeholder:text-subtle/60 focus:outline-none focus:ring-2 focus:ring-[#c8f560] transition-colors pr-10 ${
                    passwordErrors.new_password ? "border-rose-500" : "border-line"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-ink transition-colors"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {passwordErrors.new_password && (
                <p className="text-xs text-rose-600 mt-1 font-medium">
                  {passwordErrors.new_password}
                </p>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label
                htmlFor="new_password_confirm"
                className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="new_password_confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-canvas border text-sm text-ink placeholder:text-subtle/60 focus:outline-none focus:ring-2 focus:ring-[#c8f560] transition-colors pr-10 ${
                    passwordErrors.new_password_confirm ? "border-rose-500" : "border-line"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-ink transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {passwordErrors.new_password_confirm && (
                <p className="text-xs text-rose-600 mt-1 font-medium">
                  {passwordErrors.new_password_confirm}
                </p>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isChangingPassword}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-display font-semibold text-xs text-[#141413] bg-[#c8f560] hover:bg-[#bbf045] active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none shadow-sm"
            >
              {isChangingPassword && <Loader2 className="size-3.5 animate-spin" />}
              Update Password
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4 rounded-2xl bg-canvas/60 border border-line space-y-3">
          <div className="flex items-start gap-3">
            <Info className="size-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-display font-bold text-sm text-ink">
                No Password Set
              </h3>
              <p className="text-xs text-muted font-body mt-0.5">
                You sign in via social authentication (e.g. Google). Set a password to also allow standard email and password logins.
              </p>
            </div>
          </div>
          <div className="pt-1">
            <button
              type="button"
              onClick={handleSetPassword}
              disabled={isRequestingReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-display font-semibold text-xs text-[#141413] bg-[#c8f560] hover:bg-[#bbf045] active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none"
            >
              {isRequestingReset ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <KeyRound className="size-3.5" />
              )}
              Set a Password
            </button>
          </div>
        </div>
      )}

      {/* Linked Sign-In Methods (auth_providers) */}
      <div className="pt-2 border-t border-line/60">
        <h3 className="text-xs font-bold font-display uppercase tracking-wider text-subtle mb-3">
          Linked Sign-In Methods
        </h3>
        <div className="space-y-2.5">
          {/* Social Providers */}
          {user.auth_providers && user.auth_providers.length > 0 ? (
            user.auth_providers.map((provider) => (
              <div
                key={provider}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-canvas/50 border border-line"
              >
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-xl bg-surface border border-line flex items-center justify-center font-bold text-xs uppercase text-ink">
                    {provider.slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink capitalize">
                      {provider}
                    </p>
                    <p className="text-[0.6875rem] text-muted">
                      Social Identity Provider
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                  <Check className="size-3" /> Connected
                </span>
              </div>
            ))
          ) : null}

          {/* Email & Password */}
          {user.has_password && (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-canvas/50 border border-line">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-surface border border-line flex items-center justify-center text-ink">
                  <Lock className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-ink">
                    Email & Password
                  </p>
                  <p className="text-[0.6875rem] text-muted">
                    Direct credentials sign-in
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                <Check className="size-3" /> Active
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * ==========================================
 * SECTION 3: NOTIFICATION PREFERENCES & PUSH
 * ==========================================
 */
function NotificationsSection() {
  const { data: preferences = [], isLoading: isPrefsLoading } =
    useNotificationPreferences();
  const updatePreferenceMutation = useUpdateNotificationPreference();

  const [pushSupported] = useState<boolean>(() => isPushSupported());
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    () => (typeof Notification !== "undefined" ? Notification.permission : "default")
  );
  const [isPushActive, setIsPushActive] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);
  const userIsIOS = isIOS();

  useEffect(() => {
    if (isPushSupported()) {
      getActivePushSubscription().then((sub) => {
        setIsPushActive(!!sub);
      });
    }
  }, []);

  const handleEnablePush = async () => {
    if (!pushSupported) {
      notify.error("Push notifications are not supported on this browser.", "Unsupported");
      return;
    }

    try {
      setIsPushLoading(true);
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission === "denied") {
        notify.error(
          "Push notifications were blocked. Please enable permissions in your browser address bar.",
          "Permission Denied"
        );
        return;
      }

      if (permission !== "granted") {
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        notify.error(
          "NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured.",
          "Configuration Error"
        );
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      const subJson = subscription.toJSON();
      const p256dh = subJson.keys?.p256dh || "";
      const auth = subJson.keys?.auth || "";

      // Exact backend PushSubscriptionSerializer shape: { endpoint, p256dh, auth, user_agent }
      const payload = {
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        keys: { p256dh, auth },
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      };

      const serverSub = await notificationsApi.createPushSubscription(payload);
      if (serverSub?.id) {
        try {
          localStorage.setItem("sora_push_sub_id", serverSub.id);
        } catch {
          // ignore quota issues
        }
      }

      setIsPushActive(true);
      notify.success("Push notifications enabled on this device!", "Push Enabled");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to enable push notifications.";
      notify.error(msg, "Push Activation Failed");
    } finally {
      setIsPushLoading(false);
    }
  };

  const handleDisablePush = async () => {
    try {
      setIsPushLoading(true);

      let subId: string | null = null;
      try {
        subId = localStorage.getItem("sora_push_sub_id");
      } catch {
        subId = null;
      }

      // Unsubscribe locally in service worker PushManager
      await unsubscribeFromPush();

      // Delete subscription row on backend if ID was stored
      if (subId) {
        try {
          await notificationsApi.deletePushSubscription(subId);
        } catch (err) {
          console.warn("Failed to delete push subscription on server:", err);
        }
        try {
          localStorage.removeItem("sora_push_sub_id");
        } catch {
          // ignore
        }
      }

      setIsPushActive(false);
      notify.info("Push notifications have been disabled on this device.", "Push Disabled");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to disable push notifications.";
      notify.error(msg, "Disable Failed");
    } finally {
      setIsPushLoading(false);
    }
  };

  const getPreference = (type: NotificationType): NotificationPreference => {
    const existing = preferences.find((p) => p.notification_type === type);
    if (existing) return existing;
    return {
      notification_type: type,
      in_app_enabled: true,
      push_enabled: true,
      email_enabled: false,
    };
  };

  const handleTogglePref = (
    type: NotificationType,
    field: "in_app_enabled" | "push_enabled"
  ) => {
    const current = getPreference(type);
    updatePreferenceMutation.mutate({
      notification_type: type,
      [field]: !current[field],
    });
  };

  return (
    <section className="rounded-3xl bg-surface border border-line p-6 shadow-soft space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-2xl bg-[#c8f560] text-[#141413] flex items-center justify-center font-bold">
          <BellRing className="size-5" />
        </div>
        <div>
          <h2 className="font-display font-bold text-base text-ink">
            Notifications & Alerts
          </h2>
          <p className="text-xs text-muted font-body">
            Configure Web Push alerts and choose notification types.
          </p>
        </div>
      </div>

      {/* Web Push Device Status Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-canvas/60 border border-line space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-sm text-ink flex items-center gap-2">
              Web Push Notifications
              {isPushActive && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold bg-emerald-500/15 text-emerald-700 border border-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Push enabled on this device
                </span>
              )}
            </h3>
            <p className="text-xs text-muted font-body mt-0.5">
              Receive background deadline reminders and AI study milestone updates even when SORA is closed.
            </p>
          </div>

          {/* Enable or Disable Button */}
          <div>
            {isPushActive ? (
              <button
                type="button"
                onClick={handleDisablePush}
                disabled={isPushLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 active:scale-[0.98] transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {isPushLoading && <Loader2 className="size-3 animate-spin" />}
                Disable
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={isPushLoading || !pushSupported || pushPermission === "denied"}
                className="px-4 py-2 rounded-xl font-display font-semibold text-xs text-[#141413] bg-[#c8f560] hover:bg-[#bbf045] active:scale-[0.98] transition-all disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm"
              >
                {isPushLoading && <Loader2 className="size-3.5 animate-spin" />}
                <Bell className="size-3.5" />
                Enable Push Notifications
              </button>
            )}
          </div>
        </div>

        {/* Permission Denied Guide */}
        {pushPermission === "denied" && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
            <AlertTriangle className="size-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 dark:text-rose-300 font-body">
              <span className="font-semibold">Push notifications are blocked in your browser:</span> To re-enable alerts, click the lock or site settings icon in your browser address bar and set <strong>Notifications</strong> to <strong>Allow</strong>.
            </div>
          </div>
        )}

        {/* iOS Home Screen Warning */}
        <div
          className={`p-3 rounded-xl border flex items-start gap-2.5 transition-colors ${
            userIsIOS
              ? "bg-amber-500/15 border-amber-500/30"
              : "bg-canvas/80 border-line"
          }`}
        >
          <Info className="size-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 font-body">
            <span className="font-semibold">iOS 16.4+ Requirement:</span> On iPhone and iPad, Apple requires SORA to be installed to your Home Screen to deliver background push notifications (tap <strong>Share</strong> in Safari &rarr; <strong>Add to Home Screen</strong>).
          </div>
        </div>
      </div>

      {/* Per-Type Preferences Matrix */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between pb-2 border-b border-line">
          <h3 className="text-xs font-bold font-display uppercase tracking-wider text-subtle">
            Notification Delivery Channels
          </h3>
          <div className="flex items-center gap-6 text-[0.6875rem] font-bold uppercase tracking-wider text-subtle pr-2">
            <span className="w-12 text-center">In-App</span>
            <span className="w-12 text-center">Push</span>
          </div>
        </div>

        {isPrefsLoading ? (
          <div className="p-8 text-center text-xs text-muted flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Loading notification preferences...
          </div>
        ) : (
          <div className="divide-y divide-line/40">
            {ALL_NOTIFICATION_TYPES.map((typeKey) => {
              const meta = getNotificationMeta(typeKey);
              const Icon = meta.icon;
              const pref = getPreference(typeKey);

              return (
                <div
                  key={typeKey}
                  className="py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0 pr-2">
                    <div className="size-8 rounded-xl bg-canvas border border-line flex items-center justify-center shrink-0 mt-0.5 text-ink">
                      <Icon className="size-4 text-muted" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate font-display">
                        {meta.label}
                      </p>
                      <p className="text-[0.6875rem] text-muted line-clamp-1 font-body">
                        {meta.description}
                      </p>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="flex items-center gap-6 shrink-0 pr-2">
                    {/* In-app Toggle */}
                    <button
                      type="button"
                      role="switch"
                      aria-label={`Toggle in-app notifications for ${meta.label}`}
                      aria-checked={pref.in_app_enabled}
                      onClick={() => handleTogglePref(typeKey, "in_app_enabled")}
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                        pref.in_app_enabled ? "bg-[#c8f560]" : "bg-line/60"
                      }`}
                    >
                      <span
                        className={`size-4 rounded-full bg-white shadow-sm transform transition-transform ${
                          pref.in_app_enabled
                            ? "translate-x-6 bg-[#141413]"
                            : "translate-x-0"
                        }`}
                      />
                    </button>

                    {/* Push Toggle */}
                    <button
                      type="button"
                      role="switch"
                      aria-label={`Toggle push notifications for ${meta.label}`}
                      aria-checked={pref.push_enabled}
                      onClick={() => handleTogglePref(typeKey, "push_enabled")}
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                        pref.push_enabled ? "bg-[#c8f560]" : "bg-line/60"
                      }`}
                    >
                      <span
                        className={`size-4 rounded-full bg-white shadow-sm transform transition-transform ${
                          pref.push_enabled
                            ? "translate-x-6 bg-[#141413]"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
