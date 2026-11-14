// Shared zod primitives for every action input.
// Pure module: no Prisma, no next/headers — safe to import from client components.

import { z } from 'zod'

export const usernameSchema = z
  .string('Username is required.')
  .trim()
  .regex(/^[a-zA-Z0-9_.-]{3,30}$/, 'Username must be 3–30 characters: letters, numbers, dots, hyphens.')

export const emailSchema = z
  .string('Email is required.')
  .trim()
  .toLowerCase()
  .pipe(z.email('Invalid email address.'))

export const passwordSchema = z
  .string('Password is required.')
  .min(8, 'Password must be at least 8 characters.')

export const tokenSchema = z
  .string('Link is invalid.')
  .trim()
  .min(1, 'Link is invalid.')

export function requiredStringSchema(message: string) {
  return z.string(message).trim().min(1, message)
}

/** BigInt ids travel as decimal strings across the Server Action boundary. */
export const bigintIdSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, 'Invalid ID.')
  .transform((value) => BigInt(value))
