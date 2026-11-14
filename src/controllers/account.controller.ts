// Server Actions for account management & public catalog reads (docs/API.md §2/§5.1).

'use server'

import { accountService } from '@/src/services/account.service'
import { revalidateKatalogCache } from '@/src/lib/cache/revalidate'
import type {
  AccountCreateInput,
  AccountCredentialsInput,
  AccountListAdminInput,
  AccountRestoreInput,
  AccountUpdateInput,
  PhotoAddInput,
  PhotoRemoveInput,
  PhotoReorderInput,
  CatalogQueryInput,
} from '@/src/validation/catalog'

export async function listKatalogAction(input: CatalogQueryInput) {
  return accountService.listPublic(input)
}

export async function getAccountBySlugAction(slug: string) {
  return accountService.getBySlug(slug)
}

export async function listAccountsAdminAction(input: AccountListAdminInput) {
  return accountService.listAdmin(input)
}

export async function getAccountAdminAction(input: { id: string }) {
  return accountService.getAdmin(input)
}

export async function createAccountAction(input: AccountCreateInput) {
  const result = await accountService.create(input)
  if (result.ok) await revalidateKatalogCache()
  return result
}

export async function updateAccountAction(input: AccountUpdateInput) {
  const result = await accountService.update(input)
  if (result.ok) await revalidateKatalogCache()
  return result
}

export async function setAccountCredentialsAction(input: AccountCredentialsInput) {
  const result = await accountService.setCredentials(input)
  if (result.ok) await revalidateKatalogCache()
  return result
}

export async function delistAccountAction(input: { id: string }) {
  const result = await accountService.delist(input)
  if (result.ok) await revalidateKatalogCache()
  return result
}

export async function relistAccountAction(input: { id: string }) {
  const result = await accountService.relist(input)
  if (result.ok) await revalidateKatalogCache()
  return result
}

export async function restoreAccountAction(input: AccountRestoreInput) {
  const result = await accountService.restore(input)
  if (result.ok) await revalidateKatalogCache()
  return result
}

export async function deleteAccountAction(input: { id: string }) {
  const result = await accountService.delete(input)
  if (result.ok) await revalidateKatalogCache()
  return result
}

function isFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    typeof (value as File).arrayBuffer === 'function' &&
    'size' in value &&
    'name' in value
  )
}

export async function uploadAccountPhotoAction(formData: FormData) {
  const accountId = formData.get('akunId')
  const file = formData.get('file')
  if (typeof accountId !== 'string' || !isFile(file)) {
    return { ok: false as const, code: 'INPUT_INVALID', message: 'Invalid photo file.' }
  }
  const result = await accountService.uploadPhoto({ accountId: accountId, file })
  if (result.ok) await revalidateKatalogCache()
  return result
}

export async function addAccountPhotoAction(input: PhotoAddInput) {
  const result = await accountService.addPhoto(input)
  if (result.ok) await revalidateKatalogCache()
  return result
}

export async function removeAccountPhotoAction(input: PhotoRemoveInput) {
  const result = await accountService.removePhoto(input)
  if (result.ok) await revalidateKatalogCache()
  return result
}

export async function reorderAccountPhotosAction(input: PhotoReorderInput) {
  const result = await accountService.reorderPhotos(input)
  if (result.ok) await revalidateKatalogCache()
  return result
}
