import { z } from "zod";

/**
 * Password validation matching backend requirements:
 * - Minimum 8 characters
 * - Cannot be entirely numeric
 */
const passwordValidation = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password cannot exceed 128 characters")
  .refine((val) => !/^\d+$/.test(val), {
    message: "Password cannot be entirely numbers",
  });

/**
 * Register Form Schema
 * POST /api/v1/auth/register/
 * Fields: email, first_name, last_name, password, password_confirm
 */
export const registerSchema = z
  .object({
    first_name: z
      .string()
      .trim()
      .min(1, "First name is required")
      .max(150, "First name cannot exceed 150 characters"),
    last_name: z
      .string()
      .trim()
      .min(1, "Last name is required")
      .max(150, "Last name cannot exceed 150 characters"),
    email: z
      .string()
      .trim()
      .min(1, "Email address is required")
      .email("Please enter a valid email address")
      .max(254, "Email address cannot exceed 254 characters"),
    password: passwordValidation,
    password_confirm: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "Passwords do not match",
    path: ["password_confirm"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Login Form Schema
 * POST /api/v1/auth/login/
 * Fields: email, password, remember_me (client-side)
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  remember_me: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Forgot Password Schema
 * POST /api/v1/auth/password-reset/
 * Fields: email
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Password Reset Confirm Schema
 * POST /api/v1/auth/password-reset/confirm/
 * Fields: uid, token, new_password, new_password_confirm
 */
export const resetPasswordConfirmSchema = z
  .object({
    uid: z.string().min(1, "Reset user identifier is required"),
    token: z.string().min(1, "Reset token is required"),
    new_password: passwordValidation,
    new_password_confirm: z
      .string()
      .min(1, "Please confirm your new password"),
  })
  .refine((data) => data.new_password === data.new_password_confirm, {
    message: "Passwords do not match",
    path: ["new_password_confirm"],
  });

export type ResetPasswordConfirmFormData = z.infer<
  typeof resetPasswordConfirmSchema
>;

/**
 * Resend Email Verification Schema
 * POST /api/v1/auth/verify-email/resend/
 */
export const resendVerificationSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .email("Please enter a valid email address"),
});

export type ResendVerificationFormData = z.infer<
  typeof resendVerificationSchema
>;

/**
 * Change Password Schema
 * POST /api/v1/auth/password/change/
 */
export const changePasswordSchema = z
  .object({
    old_password: z.string().min(1, "Current password is required"),
    new_password: passwordValidation,
    new_password_confirm: z
      .string()
      .min(1, "Please confirm your new password"),
  })
  .refine((data) => data.new_password === data.new_password_confirm, {
    message: "New passwords do not match",
    path: ["new_password_confirm"],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

/**
 * Profile Update Schema
 * PATCH /api/v1/auth/me/
 */
export const profileUpdateSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(150, "First name cannot exceed 150 characters"),
  last_name: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(150, "Last name cannot exceed 150 characters"),
});

export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
