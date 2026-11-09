/** Shared review limits/cleanup — used by the API and the form, so both always agree. */
export const REVIEW_MIN_CHARS = 10
export const REVIEW_MAX_CHARS = 600

export function cleanComment(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // control characters
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, REVIEW_MAX_CHARS)
}

/** "Ahmed Khan" → "Ahmed K." — we never show a customer's full name publicly. */
export function publicName(fullName: string): string {
  const [first, ...rest] = fullName.trim().split(/\s+/)
  const initial = rest.length ? ` ${rest[rest.length - 1][0].toUpperCase()}.` : ''
  return `${first.slice(0, 20)}${initial}`
}
