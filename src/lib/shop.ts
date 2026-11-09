// Shared types, pricing constants and helpers for the storefront

export type Category = 'kids' | 'men'

export interface Product {
  id: string
  slug: string
  name: string
  category: Category
  subtype: string
  description: string
  price: number // PKR
  image: string
  sizes: string // JSON array string
  colors: string // JSON array string
  featured: boolean
  /** pieces left; null/undefined = not tracked; 0 = sold out */
  stock?: number | null
  /** from approved customer reviews; 0 when there are none yet */
  ratingAverage?: number
  ratingCount?: number
}

export interface CartItem {
  productId: string
  slug: string
  name: string
  category: Category
  image: string
  price: number
  size: string
  qty: number
}

export interface OrderItem {
  productId: string
  name: string
  category: string
  size: string
  qty: number
  price: number
  lineTotal: number
}

export interface Order {
  id: string
  orderNumber: string
  firstName: string
  lastName: string
  address: string
  city: string
  contactNumber: string
  postalCode: string
  email: string | null
  itemsJson: string
  subtotal: number
  shippingCharges: number
  totalPayable: number
  status: string
  paymentMethod: string // "JAZZCASH"
  paymentStatus: string // "PENDING" | "VERIFYING" | "PAID" | "REJECTED"
  senderNumber: string | null
  paidAt: string | null
  txnRef: string | null
  courier?: string | null
  trackingNumber?: string | null
  createdAt: string
}

/** Flat shipping charge (PKR) — as specified by the store policy */
export const SHIPPING_CHARGES = 300

export function parseJsonArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function formatPKR(amount: number): string {
  return `PKR ${amount.toLocaleString('en-US')}`
}

export interface PaymentBreakdown {
  subtotal: number
  shippingCharges: number
  totalPayable: number
}

/** Order total — full payment is taken up front, then the parcel is dispatched */
export function calcPayment(subtotal: number): PaymentBreakdown {
  const shippingCharges = SHIPPING_CHARGES
  const totalPayable = subtotal + shippingCharges
  return { subtotal, shippingCharges, totalPayable }
}
