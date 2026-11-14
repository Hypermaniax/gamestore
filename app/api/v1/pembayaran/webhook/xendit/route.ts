// Legacy Xendit callback path. Keep this alias so existing provider callback URLs
// continue to work after the public API path moved to `/api/v1/payments/...`.

export { POST } from '@/app/api/v1/payments/webhook/xendit/route'
