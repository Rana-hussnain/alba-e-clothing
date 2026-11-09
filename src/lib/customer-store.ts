import { create } from 'zustand'

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  emailVerified: boolean
}

export type AuthMode = 'login' | 'register' | 'forgot' | 'reset'

interface CustomerState {
  customer: Customer | null
  ready: boolean // first /api/auth/me finished
  verificationRequired: boolean
  authOpen: boolean
  authMode: AuthMode
  resetToken: string | null
  fetchMe: () => Promise<void>
  setCustomer: (c: Customer | null) => void
  openAuth: (mode?: AuthMode, resetToken?: string | null) => void
  setAuthMode: (mode: AuthMode) => void
  closeAuth: () => void
  logout: () => Promise<void>
}

export const useCustomer = create<CustomerState>()((set) => ({
  customer: null,
  ready: false,
  verificationRequired: false,
  authOpen: false,
  authMode: 'login',
  resetToken: null,
  fetchMe: async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' })
      const data = await res.json()
      set({
        customer: data.customer ?? null,
        verificationRequired: Boolean(data.verificationRequired),
        ready: true,
      })
    } catch {
      set({ customer: null, ready: true })
    }
  },
  setCustomer: (customer) => set({ customer }),
  openAuth: (mode = 'login', resetToken = null) => set({ authOpen: true, authMode: mode, resetToken }),
  setAuthMode: (authMode) => set({ authMode }),
  closeAuth: () => set({ authOpen: false }),
  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      set({ customer: null })
    }
  },
}))
