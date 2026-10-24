'use client'

// Logo and cover uploads: prepared in the browser before they're stored, so a
// 6 MB phone photo becomes a quick-loading image for customers on mobile data.
//
// - Logo: centre-cropped square, 512 px, WebP (keeps transparency; browsers
//   without WebP encoding fall back to PNG).
// - Cover: longest edge 1600 px, JPEG, at most 600 KB.
// Re-encoding through a canvas also strips EXIF/GPS metadata.

import { compressFile, decodeFile } from '@/app/[locale]/(stores)/stores/pos/_logics/scanner/image'

export type ImageKind = 'logo' | 'cover'

export const MAX_INPUT_BYTES = 15 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/avif']
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,image/gif'

export const imageProblem = (file: { name: string; type: string; size: number }) => {
  if (file.type && !ACCEPTED.includes(file.type)) return 'Use a photo or image file (JPG, PNG, WebP or HEIC)'
  if (file.size > MAX_INPUT_BYTES) return 'That image is over 15 MB — choose a smaller one'
  return null
}

export const LOGO_SIZE = 512

const squareCrop = async (file: Blob, size: number): Promise<Blob | null> => {
  const src = await decodeFile(file)
  try {
    const side = Math.min(src.width, src.height)
    const out = Math.min(size, side)
    const canvas = document.createElement('canvas')
    canvas.width = out
    canvas.height = out
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(src.source, (src.width - side) / 2, (src.height - side) / 2, side, side, 0, 0, out, out)
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/webp', 0.9))
  } finally {
    src.release?.()
  }
}

export const prepareImage = async (file: Blob, kind: ImageKind): Promise<Blob> => {
  const out =
    kind === 'logo' ? await squareCrop(file, LOGO_SIZE) : await compressFile(file, { maxEdge: 1600, quality: 0.78, maxBytes: 600 * 1024 })
  if (!out) throw new Error(kind === 'logo' ? 'Couldn’t read that image' : 'Couldn’t make that photo small enough — try another')
  return out
}

export const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error ?? new Error('Couldn’t read the image'))
    r.readAsDataURL(blob)
  })

export const isDataUrl = (s?: string) => !!s && s.startsWith('data:')
