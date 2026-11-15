// Thin Server Action wrappers over auth services — ref: docs/API.md §0/§1.
// Every action here is an untrusted entry point; validation/business rules live in the
// services, never in the UI. Input types come from the shared zod schemas.

'use server'

import { redirect } from 'next/navigation'
import { authService, EMAIL_OTP_RESEND_SECONDS } from '@/src/services/auth.service'
import {
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@/src/validation/auth'
import type {
  ChangePasswordInput,
  ConfirmEmailChangeInput,
  LoginInput,
  RegisterInput,
  RequestEmailChangeInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  TotpActivateInput,
  TotpLoginInput,
  TotpRecoveryRegenerateInput,
  TotpSetupInput,
  VerifyEmailInput,
} from '@/src/validation/auth'

export async function registerAction(input: RegisterInput) {
  return authService.register(input, { autoLogin: true, deferEmail: true })
}

export async function verifyEmailAction(input: VerifyEmailInput) {
  return authService.verifyEmail(input)
}

export async function resendVerificationAction(email: string) {
  return authService.resendVerification(email, { deferEmail: true })
}

export async function loginAction(input: LoginInput) {
  return authService.login({ ...input, device: 'web' })
}

export async function refreshAction() {
  return authService.refresh()
}

export async function logoutAction() {
  await authService.logout()
}

export async function logoutAllAction() {
  return authService.logoutAll()
}

export async function requestPasswordResetAction(input: RequestPasswordResetInput) {
  return authService.requestPasswordReset(input)
}

export async function resetPasswordAction(input: ResetPasswordInput) {
  return authService.resetPassword(input)
}

export async function changePasswordAction(input: ChangePasswordInput) {
  return authService.changePassword(input)
}

export async function requestEmailChangeAction(input: RequestEmailChangeInput) {
  return authService.requestEmailChange(input)
}

export async function confirmEmailChangeAction(input: ConfirmEmailChangeInput) {
  return authService.confirmEmailChange(input)
}

export async function loginTotpAction(input: TotpLoginInput) {
  return authService.loginTotp({ ...input, device: 'web' })
}

export async function totpSetupAction(input: TotpSetupInput) {
  return authService.setupTotp(input)
}

export async function totpActivateAction(input: TotpActivateInput) {
  return authService.activateTotp(input)
}

export async function totpRecoveryRegenerateAction(input: TotpRecoveryRegenerateInput) {
  return authService.regenerateRecoveryCodes(input)
}

/* ------------------------------------------------------- useActionState forms */

const text = (formData: FormData, key: string): string => {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

export type RegisterFormState = { error: string | null }

export async function registerFormAction(
  _prevState: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const parsed = registerSchema.safeParse({
    username: text(formData, 'username'),
    email: text(formData, 'email'),
    password: text(formData, 'password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid data.' }
  }

  const result = await registerAction(parsed.data)
  if (!result.ok) return { error: result.message }

  redirect('/verify-email')
}

export type LoginFormState = {
  error: string | null
  code?: string
  challengeToken?: string
  redirectTo?: string
  peran?: string
  username?: string
  emailVerified?: boolean
}

export async function loginFormAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    usernameOrEmail: text(formData, 'identity'),
    password: text(formData, 'password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid data.', code: 'INPUT_INVALID' }
  }

  const result = await loginAction(parsed.data)
  if (!result.ok) return { error: result.message, code: result.code }

  if (result.jalur === 'perlu-totp') {
    return { error: null, challengeToken: result.token }
  }
  if (result.jalur === 'perlu-setup-totp') {
    return { error: null, redirectTo: '/totp/setup' }
  }

  return {
    error: null,
    redirectTo: result.peran === 'ADMIN' ? '/panel' : '/',
    peran: result.peran,
    username: result.username,
    emailVerified: result.emailVerified,
  }
}

export type VerifyEmailFormState = {
  ok: boolean
  action: 'verify' | 'resend' | null
  error: string | null
  code?: string
  notice?: string
  cooldown?: number
  resetCode?: boolean
}

export async function verifyEmailFormAction(
  _prevState: VerifyEmailFormState,
  formData: FormData,
): Promise<VerifyEmailFormState> {
  if (formData.get('intent') === 'resend') {
    const result = await resendVerificationAction(text(formData, 'email'))
    if (!result.ok) {
      return { ok: false, action: 'resend', error: result.message, code: result.code }
    }
    return {
      ok: true,
      action: 'resend',
      error: null,
      notice: 'A new code has been sent. Check your inbox and spam folder.',
      cooldown: EMAIL_OTP_RESEND_SECONDS,
      resetCode: true,
    }
  }

  const parsed = verifyEmailSchema.safeParse({ code: text(formData, 'code') })
  if (!parsed.success) {
    return {
      ok: false,
      action: 'verify',
      error: parsed.error.issues[0]?.message ?? 'Enter the 6-digit code from your email.',
      code: 'INPUT_INVALID',
    }
  }

  const result = await verifyEmailAction(parsed.data)
  if (!result.ok) {
    return { ok: false, action: 'verify', error: result.message, code: result.code }
  }

  return { ok: true, action: 'verify', error: null }
}

export type RequestPasswordResetFormState = { ok: boolean; error: string | null }

export async function requestPasswordResetFormAction(
  _prevState: RequestPasswordResetFormState,
  formData: FormData,
): Promise<RequestPasswordResetFormState> {
  const parsed = requestPasswordResetSchema.safeParse({ email: text(formData, 'email') })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid data.' }
  }

  const result = await requestPasswordResetAction(parsed.data)
  if (!result.ok) return { ok: false, error: result.message }

  return { ok: true, error: null }
}

export type ResetPasswordFormState = { ok: boolean; error: string | null; code?: string }

export async function resetPasswordFormAction(
  _prevState: ResetPasswordFormState,
  formData: FormData,
): Promise<ResetPasswordFormState> {
  const password = text(formData, 'password')
  if (password !== text(formData, 'konfirmasi')) {
    return { ok: false, error: 'Passwords do not match.', code: 'INPUT_INVALID' }
  }

  const parsed = resetPasswordSchema.safeParse({ token: text(formData, 'token'), password })
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid data.',
      code: 'INPUT_INVALID',
    }
  }

  const result = await resetPasswordAction(parsed.data)
  if (!result.ok) return { ok: false, error: result.message, code: result.code }

  return { ok: true, error: null }
}
