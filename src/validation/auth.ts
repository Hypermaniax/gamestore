// Auth action contracts — one definition shared by Server Actions and client forms.
// Issue messages are user-facing (Indonesian); identifiers stay English.

import { z } from 'zod'
import {
  emailSchema,
  passwordSchema,
  requiredStringSchema,
  tokenSchema,
  usernameSchema,
} from './common'

export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
})

export const identitySchema = requiredStringSchema('Email or username is required.').toLowerCase()

export const loginSchema = z.object({
  usernameOrEmail: identitySchema,
  password: requiredStringSchema('Password is required.'),
  device: z.string().max(150).optional(),
})

export const verificationTokenSchema = tokenSchema

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
})

export const changePasswordSchema = z.object({
  passwordLama: requiredStringSchema('Current password is required.'),
  passwordBaru: passwordSchema,
})

export const requestEmailChangeSchema = z.object({
  newEmail: emailSchema,
  password: requiredStringSchema('Current password is required.'),
})

export const confirmEmailChangeSchema = z.object({
  tokenLama: tokenSchema,
  tokenBaru: tokenSchema,
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type RequestEmailChangeInput = z.infer<typeof requestEmailChangeSchema>
export type ConfirmEmailChangeInput = z.infer<typeof confirmEmailChangeSchema>

/* ------------------------------------------------------------------ TOTP */

const totpDigitsSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'TOTP code must be 6 digits.')

/** Login step 2 accepts either a 6-digit TOTP or a recovery code. */
export const totpLoginSchema = z.object({
  challengeToken: requiredStringSchema('Invalid verification token.'),
  code: z.string().trim().min(6, 'Code is required.').max(20, 'Invalid code.'),
  device: z.string().max(150).optional(),
})

export const totpSetupSchema = z.object({
  challengeToken: tokenSchema.optional(),
})

export const totpActivateSchema = z.object({
  challengeToken: tokenSchema.optional(),
  code: totpDigitsSchema,
})

export const totpRecoveryRegenerateSchema = z.object({
  password: requiredStringSchema('Current password is required.'),
  code: z.string().trim().min(6, 'Code is required.').max(20, 'Invalid code.'),
})

export type TotpLoginInput = z.infer<typeof totpLoginSchema>
export type TotpSetupInput = z.infer<typeof totpSetupSchema>
export type TotpActivateInput = z.infer<typeof totpActivateSchema>
export type TotpRecoveryRegenerateInput = z.infer<typeof totpRecoveryRegenerateSchema>
