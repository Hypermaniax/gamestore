import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { parseLocalPhotoPath } from '../../src/lib/photo'
import { deleteAccountPhoto, saveAccountPhoto } from '../../src/lib/account-photo'

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])

let directory = ''

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'gamestore-photo-'))
})

afterEach(async () => {
  await rm(directory, { recursive: true, force: true })
})

describe('account photo storage', () => {
  it('saves an image with a random name and deletes it', async () => {
    const file = new File([PNG], 'bukti.png', { type: 'image/png' })
    const url = await saveAccountPhoto(file, '123', directory)

    expect(url).toMatch(/^\/uploads\/accounts\/123\/[0-9a-f-]{36}\.png$/)
    const localPath = parseLocalPhotoPath(url)
    expect(localPath?.accountId).toBe('123')
    const contents = await readFile(path.join(directory, '123', localPath!.name))
    expect(contents.equals(PNG)).toBe(true)

    await deleteAccountPhoto(url, directory)
    await expect(access(path.join(directory, '123', localPath!.name))).rejects.toThrow()
  })

  it('rejects a non-image file even when the MIME type claims otherwise', async () => {
    const file = new File(['bukan gambar'], 'palsu.png', { type: 'image/png' })
    await expect(saveAccountPhoto(file, '123', directory)).rejects.toThrow('Photo format must be JPG, PNG, or WebP.')
  })

  it('rejects legacy local photo paths', () => {
    expect(parseLocalPhotoPath('/uploads/akun/123/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png')).toBeNull()
  })
})
