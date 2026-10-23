// Files and WhatsApp sharing for documents.

export const MAX_FILE_BYTES = 15 * 1024 * 1024

export const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
export const ACCEPT_ATTR = '.pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx,application/pdf,image/*'

export const fileProblem = (file: { name: string; type: string; size: number }): string | null => {
  if (file.size > MAX_FILE_BYTES) return `${file.name} is larger than 15 MB`
  const ext = file.name.toLowerCase().split('.').pop() ?? ''
  const okExt = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'doc', 'docx'].includes(ext)
  if (!ACCEPTED_FILE_TYPES.includes(file.type) && !okExt) return `${file.name}: use a PDF, photo or Word document`
  return null
}

export const formatBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`

export const isImage = (mime: string) => mime.startsWith('image/')
export const isPdf = (mime: string) => mime === 'application/pdf'

// "024 123 4567" / "+233 24 123 4567" / "233241234567" → "233241234567".
// Returns null when it doesn't look like a phone number.
export const toWhatsAppNumber = (phone: string | undefined | null, countryCode = '233'): string | null => {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 9) return null
  if (digits.startsWith(countryCode)) return digits
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.startsWith('0')) return countryCode + digits.slice(1)
  if (digits.length === 9) return countryCode + digits
  return digits
}

// wa.me deep link: opens a chat (with that number, if given) pre-filled with text.
export const whatsAppLink = (text: string, phone?: string | null) => {
  const number = toWhatsAppNumber(phone)
  return `https://wa.me/${number ?? ''}?text=${encodeURIComponent(text)}`
}

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export type ShareResult = 'shared' | 'cancelled' | 'link' | 'downloaded'

// Share a document to WhatsApp, as well as the device allows:
// 1. A hosted link (API mode) → WhatsApp message with the link, any device.
// 2. Phones (Web Share with files) → the system share sheet with the actual
//    file; the user picks WhatsApp and the chat.
// 3. Otherwise → download the file and open WhatsApp (Web) with the message,
//    addressed to `phone` when given, so the file can be attached.
export const shareToWhatsApp = async (opts: {
  title: string
  message: string
  phone?: string | null
  link?: string | null
  file?: { blob: Blob; fileName: string; mimeType: string } | null
}): Promise<ShareResult> => {
  if (opts.link) {
    window.open(whatsAppLink(`${opts.message}\n${opts.link}`, opts.phone), '_blank', 'noopener')
    return 'link'
  }
  if (opts.file) {
    const file = new File([opts.file.blob], opts.file.fileName, { type: opts.file.mimeType })
    if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: opts.title, text: opts.message })
        return 'shared'
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return 'cancelled'
      }
    }
    downloadBlob(opts.file.blob, opts.file.fileName)
  }
  window.open(whatsAppLink(opts.message, opts.phone), '_blank', 'noopener')
  return 'downloaded'
}

export { downloadBlob }
