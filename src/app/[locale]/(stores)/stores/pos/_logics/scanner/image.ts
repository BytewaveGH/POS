'use client'

// Client-side image preparation before upload.
//
// - Longest edge ≤ maxEdge, JPEG at `quality`, re-encoded through a canvas
//   (which also drops EXIF/GPS metadata).
// - EXIF orientation: photos from the file picker are decoded with
//   createImageBitmap(..., { imageOrientation: 'from-image' }) so the pixels are
//   upright before drawing — the server does not rotate. Camera frames come
//   from a <video> and are already upright.
// - If the result is still over maxBytes, quality and then size are stepped
//   down; null means it couldn't be made small enough (reject before upload).

export type CompressOptions = { maxEdge: number; quality: number; maxBytes: number }

export const fitWithin = (width: number, height: number, maxEdge: number) => {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

type Drawable = { source: CanvasImageSource; width: number; height: number; release?: () => void }

const encode = (src: Drawable, maxEdge: number, quality: number): Promise<Blob | null> => {
  const { width, height } = fitWithin(src.width, src.height, maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)
  ctx.drawImage(src.source, 0, 0, width, height)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', quality))
}

// Tries the requested settings first, then progressively smaller/lower quality.
export const encodeWithinLimit = async (
  src: Drawable,
  opts: CompressOptions,
  encoder: (src: Drawable, maxEdge: number, quality: number) => Promise<Blob | null> = encode
): Promise<Blob | null> => {
  const attempts: [number, number][] = [
    [opts.maxEdge, opts.quality],
    [opts.maxEdge, Math.min(opts.quality, 0.65)],
    [Math.round(opts.maxEdge * 0.75), 0.6],
    [Math.round(opts.maxEdge * 0.5), 0.55],
  ]
  for (const [edge, q] of attempts) {
    const blob = await encoder(src, edge, q)
    if (blob && blob.size <= opts.maxBytes) return blob
  }
  return null
}

// Decodes a user-chosen file with EXIF orientation applied.
export const decodeFile = async (file: Blob): Promise<Drawable> => {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() }
    } catch {
      // Fall through to <img>, which also honours EXIF orientation in current browsers.
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) }
  } catch (err) {
    URL.revokeObjectURL(url)
    throw err
  }
}

export const compressFile = async (file: Blob, opts: CompressOptions): Promise<Blob | null> => {
  const decoded = await decodeFile(file)
  try {
    return await encodeWithinLimit(decoded, opts)
  } finally {
    decoded.release?.()
  }
}

// Region (in video pixels) → compressed JPEG.
export const compressVideoRegion = (
  video: HTMLVideoElement,
  rect: { sx: number; sy: number; w: number; h: number },
  opts: CompressOptions
): Promise<Blob | null> => {
  const canvas = document.createElement('canvas')
  canvas.width = rect.w
  canvas.height = rect.h
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)
  ctx.drawImage(video, rect.sx, rect.sy, rect.w, rect.h, 0, 0, rect.w, rect.h)
  return encodeWithinLimit({ source: canvas, width: rect.w, height: rect.h }, opts)
}

// Used for the single automatic retry after a 413.
export const recompressSmaller = async (image: Blob, opts: CompressOptions): Promise<Blob | null> => {
  const smaller = {
    ...opts,
    maxEdge: Math.round(opts.maxEdge * 0.6),
    quality: Math.min(opts.quality, 0.6),
    maxBytes: Math.min(opts.maxBytes, image.size * 0.6),
  }
  return compressFile(image, smaller)
}
