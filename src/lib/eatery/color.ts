// WCAG 2.x contrast maths. Restaurant owners pick any colours they like; these
// helpers keep text readable by nudging a colour until it passes.

export type RGB = [number, number, number]

export const isHex = (s: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s.trim())

export const hexToRgb = (hex: string): RGB => {
  let h = hex.trim().replace('#', '')
  if (h.length === 3) h = h.replace(/./g, (c) => c + c)
  const n = parseInt(h, 16)
  return Number.isNaN(n) ? [0, 0, 0] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export const rgbToHex = ([r, g, b]: RGB) =>
  '#' +
  [r, g, b]
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')

const channel = (v: number) => {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export const luminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// t = 0 → a, t = 1 → b
export const mix = (a: string, b: string, t: number) => {
  const [x, y] = [hexToRgb(a), hexToRgb(b)]
  return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t])
}

export const withAlpha = (hex: string, alpha: number) => {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Black or white, whichever reads better on `bg`.
export const readableOn = (bg: string) => (contrast('#ffffff', bg) >= contrast('#111111', bg) ? '#ffffff' : '#111111')

// The colour closest to `fg` (keeping its hue) that reaches `min` contrast on
// `bg`: moved towards whichever of white or black stands out more on `bg`.
export const ensureContrast = (fg: string, bg: string, min: number): string => {
  if (contrast(fg, bg) >= min) return fg
  const target = contrast('#ffffff', bg) >= contrast('#000000', bg) ? '#ffffff' : '#000000'
  for (let t = 0.05; t <= 1.0001; t += 0.05) {
    const c = mix(fg, target, t)
    if (contrast(c, bg) >= min) return c
  }
  return target
}

export const formatRatio = (r: number) => `${(Math.floor(r * 10) / 10).toFixed(1)}:1`
