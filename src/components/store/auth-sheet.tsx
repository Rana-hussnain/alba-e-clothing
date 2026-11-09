'use client'

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useCustomer } from '@/lib/customer-store'
import { AuthPanel } from './auth-panel'

const TITLES = {
  login: ['Sign In', 'Sign in to place orders and track them.'],
  register: ['Create Account', 'Only registered customers can place orders.'],
  forgot: ['Forgot Password', "Enter your email and we'll send a reset link."],
  reset: ['New Password', 'Choose a new password for your account.'],
} as const

/** Slide-over sign-in / register panel, opened from the header account button. */
export function AuthSheet() {
  const { authOpen, closeAuth, authMode } = useCustomer()
  const [title, desc] = TITLES[authMode]

  return (
    <Sheet open={authOpen} onOpenChange={(o) => !o && closeAuth()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border text-left">
          <SheetTitle className="text-sm font-bold tracking-[0.2em] uppercase">{title}</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">{desc}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <AuthPanel onAuthenticated={closeAuth} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
