import { z } from 'zod';
import { phoneSchema } from './common';

// Per SRS §6.1.1 / §6.1.3 — min 8 chars, mix of letters + digits as a baseline.
// We deliberately avoid requiring symbols (NIST 800-63B SP guidance: length > complexity).
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .refine((v) => /[A-Za-z]/.test(v), 'Password must contain a letter')
  .refine((v) => /[0-9]/.test(v), 'Password must contain a digit');

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email');

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(80, 'Name is too long');

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { message: 'You must accept the Terms & Privacy Policy' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password required').max(128),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export const verifyEmailSchema = z.object({
  token: z.string().min(20).max(200),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export const profileSchema = z.object({
  name: nameSchema,
  phone: phoneSchema.optional().or(z.literal('').transform(() => undefined)),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
