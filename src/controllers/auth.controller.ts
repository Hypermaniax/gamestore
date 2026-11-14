// Thin Server Action wrappers over auth services — ref: docs/API.md §0/§1.
// Every action here is an untrusted entry point; validation/business rules live in the
// services, never in the UI. Input types come from the shared zod schemas.

'use server'

import { authService } from '@/src/services/auth.service'
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
} from '@/src/validation/auth'

export async function registerAction(input: RegisterInput) {
  return authService.register(input)
}

export async function verifyEmailAction(token: string) {
  return authService.verifyEmail(token)
}

export async function resendVerificationAction(email: string) {
  return authService.resendVerification(email)
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
