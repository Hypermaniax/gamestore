import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  MAX_PHOTO_BYTES,
  parseLocalPhotoPath,
  photoExtension,
  type PhotoMime,
} from './photo'

const UPLOAD_ROOT = path.join(
  /*turbopackIgnore: true*/ process.cwd(),
  'public',
  'uploads',
  'accounts',
)

function sniffPhoto(buffer: Buffer): PhotoMime | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png'
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

export async function saveAccountPhoto(
  file: File,
  accountId: string,
  root = UPLOAD_ROOT,
): Promise<string> {
  if (!/^\d+$/.test(accountId)) throw new Error('Invalid account ID.')
  if (file.size === 0) throw new Error('Photo file is empty.')
  if (file.size > MAX_PHOTO_BYTES) throw new Error('Photo size must be at most 5 MB.')

  const buffer = Buffer.from(await file.arrayBuffer())
  const mime = sniffPhoto(buffer)
  if (!mime) throw new Error('Photo format must be JPG, PNG, or WebP.')

  const name = `${randomUUID()}.${photoExtension(mime)}`
  const directory = path.join(root, accountId)
  await mkdir(directory, { recursive: true, mode: 0o755 })
  await writeFile(path.join(/*turbopackIgnore: true*/ directory, name), buffer, { mode: 0o644, flag: 'wx' })
  return `/uploads/accounts/${accountId}/${name}`
}

export async function deleteAccountPhoto(url: string, root = UPLOAD_ROOT): Promise<void> {
  const localPath = parseLocalPhotoPath(url)
  if (!localPath) return
  try {
    await unlink(path.join(/*turbopackIgnore: true*/ root, localPath.accountId, localPath.name))
  } catch {
    return
  }
}
