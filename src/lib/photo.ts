export const MAX_PHOTO_BYTES = 5 * 1024 * 1024
export const MAX_PHOTO_COUNT = 5
export const LOCAL_PHOTO_PREFIX = '/uploads/accounts/'

export const PHOTO_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const

export type PhotoMime = keyof typeof PHOTO_MIME

export function isPhotoMime(value: string): value is PhotoMime {
  return value in PHOTO_MIME
}

export function photoExtension(mime: PhotoMime): string {
  return PHOTO_MIME[mime]
}

export function parseLocalPhotoPath(
  url: string,
): { accountId: string; name: string } | null {
  const match = url.match(/^\/uploads\/accounts\/(\d+)\/([0-9a-f-]{36}\.(?:jpg|jpeg|png|webp))$/i)
  if (!match) return null
  return { accountId: match[1], name: match[2] }
}
