/** JazzCash payment-detail helpers shared by the order and payment APIs. */

/** Upper-case, no spaces/dashes: "t12 345-678" → "T12345678" */
export function normalizeTid(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/[\s-]/g, '').toUpperCase() : ''
}

export const validTid = (tid: string) => /^[A-Z0-9]{6,30}$/.test(tid)

export const validSenderNumber = (n: string) => /^03[0-9]{9}$/.test(n)
