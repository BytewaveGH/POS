// Owner (admin) login contract shared by the NextAuth `authorize` callback
// (server) and the sign-in form (browser).
//
// POST /auth/admin-login → 200 tokens · 401 bad credentials · 403 suspended ·
// 409 the password matches several of this owner's businesses (body lists them;
// resend with `tenant` = the chosen slug).
//
// NextAuth only hands a short `code` string from `authorize` back to signIn(),
// so the 409 business list travels inside that code (base64url JSON). It only
// exists after the password was verified and holds no secrets: slug, name, type.

export interface OwnerBusiness {
  slug: string
  name: string
  appType: string
}

export const LOGIN_CODES = {
  invalid: 'invalid_credentials',
  suspended: 'suspended',
  unavailable: 'unavailable',
  chooseBusiness: 'choose-business.',
} as const

const toBase64Url = (text: string) => {
  const b64 =
    typeof Buffer !== 'undefined'
      ? Buffer.from(text, 'utf8').toString('base64')
      : btoa(Array.from(new TextEncoder().encode(text), (b) => String.fromCharCode(b)).join(''))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (code: string) => {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/')
  if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64').toString('utf8')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

export const encodeBusinessChoice = (businesses: OwnerBusiness[]) =>
  LOGIN_CODES.chooseBusiness + toBase64Url(JSON.stringify(businesses.map(({ slug, name, appType }) => ({ slug, name, appType }))))

// Returns the businesses to choose from, or null if the code isn't a 409 choice.
export const decodeBusinessChoice = (code: string | undefined | null): OwnerBusiness[] | null => {
  if (!code?.startsWith(LOGIN_CODES.chooseBusiness)) return null
  try {
    const list = JSON.parse(fromBase64Url(code.slice(LOGIN_CODES.chooseBusiness.length)))
    if (!Array.isArray(list)) return null
    const valid = list.filter((b) => b && typeof b.slug === 'string' && b.slug && typeof b.name === 'string')
    return valid.length > 0 ? valid.map((b) => ({ slug: b.slug, name: b.name, appType: String(b.appType ?? 'retail') })) : null
  } catch {
    return null
  }
}

export const ownerLoginErrorMessage = (code: string | undefined | null) => {
  switch (code) {
    case LOGIN_CODES.suspended:
      return 'This business is suspended. Contact Bytewave support to restore access.'
    case LOGIN_CODES.unavailable:
      return 'We couldn’t sign you in right now. Please try again in a moment.'
    default:
      return 'Invalid email or password'
  }
}
