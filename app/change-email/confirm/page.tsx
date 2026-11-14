export const instant = false

import { ConfirmEmailChangeForm } from './confirm-email-change-form'

export default async function ConfirmEmailChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const { token } = await searchParams
  return <ConfirmEmailChangeForm token={typeof token === 'string' ? token : ''} />
}
