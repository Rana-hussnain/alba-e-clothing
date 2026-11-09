'use client'

import Image from 'next/image'
import { useState } from 'react'
import {
  ChevronLeft,
  Copy,
  Loader2,
  Lock,
  MailWarning,
  Smartphone,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatPKR, calcPayment, type Order } from '@/lib/shop'
import { useCart } from '@/lib/store'
import { useCustomer } from '@/lib/customer-store'
import { AuthPanel } from './auth-panel'
import { JAZZCASH_ACCOUNT_DISPLAY, JAZZCASH_ACCOUNT_NAME } from '@/lib/contact'
import { toast } from 'sonner'

interface CheckoutProps {
  onBack: () => void
  onSuccess: (order: Order) => void
}

interface FormState {
  firstName: string
  lastName: string
  address: string
  city: string
  contactNumber: string
  postalCode: string
}

const EMPTY_FORM: FormState = {
  firstName: '',
  lastName: '',
  address: '',
  city: '',
  contactNumber: '',
  postalCode: '',
}

export function Checkout({ onBack, onSuccess }: CheckoutProps) {
  const { items, clear } = useCart()
  const { customer, ready, verificationRequired } = useCustomer()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [resent, setResent] = useState(false)

  const [senderNumber, setSenderNumber] = useState('')
  const [tid, setTid] = useState('')
  const [payErrors, setPayErrors] = useState<{ senderNumber?: string; tid?: string }>({})
  const [paidConfirmed, setPaidConfirmed] = useState(false)

  // Prefill from the account once (name / phone)
  const [prefilled, setPrefilled] = useState(false)
  if (customer && !prefilled) {
    setPrefilled(true)
    const [first, ...rest] = customer.name.trim().split(/\s+/)
    setForm((f) => ({
      ...f,
      firstName: f.firstName || first || '',
      lastName: f.lastName || rest.join(' '),
      contactNumber: f.contactNumber || customer.phone || '',
    }))
  }

  const needsVerify = !!customer && verificationRequired && !customer.emailVerified

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const payment = calcPayment(subtotal)

  const setField = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const validate = (): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {}
    if (!form.firstName.trim()) next.firstName = 'First name is required'
    if (!form.lastName.trim()) next.lastName = 'Last name is required'
    if (!form.address.trim()) next.address = 'Address is required'
    if (!form.city.trim()) next.city = 'City is required'
    if (!form.contactNumber.trim()) next.contactNumber = 'Contact number is required'
    else if (!/^03[0-9]{9}$/.test(form.contactNumber.replace(/[\s-]/g, '')))
      next.contactNumber = 'Enter a valid mobile number, e.g. 03001234567'
    if (!form.postalCode.trim()) next.postalCode = 'Postal code is required'
    setErrors(next)
    const pay: { senderNumber?: string; tid?: string } = {}
    if (!/^03[0-9]{9}$/.test(senderNumber.replace(/[\s-]/g, '')))
      pay.senderNumber = 'Enter the JazzCash number you paid from, e.g. 03001234567'
    if (!/^[A-Za-z0-9]{6,30}$/.test(tid.replace(/[\s-]/g, '')))
      pay.tid = 'Enter the TID from your JazzCash confirmation (6–30 letters/numbers)'
    setPayErrors(pay)
    return Object.keys(next).length === 0 && Object.keys(pay).length === 0
  }

  const resendVerification = async () => {
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Could not send the email')
      setResent(true)
      toast.success('Verification email sent — check your inbox')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send the email')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) {
      toast.error('Your cart is empty')
      return
    }
    if (!validate()) {
      toast.error('Please complete your delivery and payment details')
      return
    }
    if (!paidConfirmed) {
      toast.error('Please confirm that you have sent the payment')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          senderNumber: senderNumber.replace(/[\s-]/g, ''),
          txnRef: tid.trim(),
          items: items.map((i) => ({ productId: i.productId, qty: i.qty, size: i.size })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 401) {
          useCustomer.getState().setCustomer(null)
          throw new Error('Your session expired — please sign in again')
        }
        if (data.code === 'TID_USED') {
          setPayErrors({ tid: 'This TID has already been used for another order' })
        }
        if (data.code === 'EMAIL_UNVERIFIED') {
          await useCustomer.getState().fetchMe()
        }
        throw new Error(data.error || 'Failed to place order')
      }
      clear()
      toast.success(`Order ${data.order.orderNumber} placed — we will verify your payment`)
      onSuccess(data.order as Order)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to place order')
    } finally {
      setSubmitting(false)
    }
  }

  const field = (key: keyof FormState, label: string, opts?: { optional?: boolean; type?: string; placeholder?: string; inputMode?: 'numeric' | 'text' | 'tel' }) => (
    <div className="space-y-1.5">
      <Label htmlFor={key} className="text-[11px] font-semibold tracking-[0.14em] uppercase">
        {label}
        {opts?.optional ? (
          <span className="text-muted-foreground font-normal normal-case tracking-normal"> (Optional)</span>
        ) : (
          <span className="text-destructive"> *</span>
        )}
      </Label>
      <Input
        id={key}
        type={opts?.type ?? 'text'}
        inputMode={opts?.inputMode}
        placeholder={opts?.placeholder}
        value={form[key]}
        onChange={(e) => setField(key, e.target.value)}
        aria-invalid={!!errors[key]}
        className="h-11 rounded-none border-border focus-visible:ring-1 focus-visible:ring-primary bg-background"
      />
      {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
    </div>
  )

  if (items.length === 0) {
    return (
      <section className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h1 className="text-xl font-bold uppercase tracking-tight mb-3">Nothing to check out</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Your cart is empty. Add a few pieces from the collection first.
        </p>
        <button
          onClick={onBack}
          className="h-12 px-8 bg-primary text-primary-foreground text-xs font-semibold tracking-[0.18em] uppercase hover:bg-primary/85 transition-colors"
        >
          Back to Shopping
        </button>
      </section>
    )
  }

  if (!ready) {
    return (
      <section className="max-w-md mx-auto px-4 py-24 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
      </section>
    )
  }

  if (!customer) {
    return (
      <section className="max-w-md mx-auto px-4 sm:px-6 py-10 sm:py-14" aria-label="Sign in to order">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-[11px] font-medium tracking-[0.18em] uppercase text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          Continue Shopping
        </button>
        <h1 className="text-2xl font-bold uppercase tracking-tight mb-2">Sign in to order</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          Only registered customers can place orders. Your cart is saved — sign in or create an account to continue.
        </p>
        <AuthPanel />
      </section>
    )
  }

  if (needsVerify) {
    return (
      <section className="max-w-md mx-auto px-4 sm:px-6 py-14 text-center">
        <MailWarning className="h-10 w-10 mx-auto mb-4 text-amber-600" strokeWidth={1.25} />
        <h1 className="text-xl font-bold uppercase tracking-tight mb-3">Verify your email</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          We sent a verification link to <span className="font-semibold text-foreground">{customer.email}</span>.
          Open it, then come back here and refresh this page to place your order.
        </p>
        <button
          onClick={resendVerification}
          disabled={resent}
          className="h-12 px-8 bg-primary text-primary-foreground text-xs font-semibold tracking-[0.18em] uppercase hover:bg-primary/85 disabled:opacity-60"
        >
          {resent ? 'Email sent' : 'Resend verification email'}
        </button>
      </section>
    )
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12" aria-label="Checkout">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-[11px] font-medium tracking-[0.18em] uppercase text-muted-foreground hover:text-primary transition-colors mb-6"
      >
        <ChevronLeft className="h-4 w-4" />
        Continue Shopping
      </button>

      <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight mb-8">Checkout</h1>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-5 gap-10">
        {/* LEFT — 1. Delivery Address */}
        <div className="lg:col-span-3 space-y-8">
          <div>
            <h2 className="text-sm font-bold tracking-[0.2em] uppercase flex items-center gap-3 mb-5">
              <span className="h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">1</span>
              Delivery Address
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Signed in as <span className="font-semibold text-foreground">{customer.email}</span> — confirmation goes to this email.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {field('firstName', 'First Name', { placeholder: 'Ahmed' })}
              {field('lastName', 'Last Name', { placeholder: 'Khan' })}
              {field('address', 'Address', { placeholder: 'House 12, Street 5, Gulberg III' })}
              {field('city', 'City', { placeholder: 'Lahore' })}
              {field('contactNumber', 'Contact Number', { placeholder: '03001234567', inputMode: 'tel' })}
              {field('postalCode', 'Postal Code', { placeholder: '54000', inputMode: 'numeric' })}
            </div>
          </div>

          {/* Return Policy */}
          <div>
            <h2 className="text-sm font-bold tracking-[0.2em] uppercase flex items-center gap-3 mb-5">
              <span className="h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">3</span>
              Return Policy
            </h2>
            <div className="border border-border p-5 bg-secondary/50">
              <p className="text-sm font-semibold mb-1.5 uppercase tracking-wide">
                Return is available within 3 days only
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Items must be unworn, unwashed and returned in their original packaging
                with tags attached. To request a return, contact us within 3 days of
                receiving your order with your order number and photos of the item.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT — 2. Price & Payment */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-28 space-y-6">
            <div>
              <h2 className="text-sm font-bold tracking-[0.2em] uppercase flex items-center gap-3 mb-5">
                <span className="h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">2</span>
                Price &amp; Payment
              </h2>

              <div className="border border-border divide-y divide-border">
                {/* Items */}
                <div className="p-5 space-y-4 max-h-72 overflow-y-auto">
                  {items.map((i) => (
                    <div key={`${i.productId}-${i.size}`} className="flex gap-3">
                      <div className="relative h-16 w-12 shrink-0 bg-[#f4f3f1] overflow-hidden">
                        <Image src={i.image} alt={i.name} fill className="object-cover" sizes="48px" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide truncate">{i.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.14em] mt-0.5">
                          Size {i.size} × {i.qty}
                        </p>
                      </div>
                      <p className="text-xs font-semibold shrink-0">{formatPKR(i.price * i.qty)}</p>
                    </div>
                  ))}
                </div>

                {/* Payment breakdown — full payment, no COD */}
                <dl className="p-5 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Product Price (PKR)</dt>
                    <dd className="font-medium">{formatPKR(payment.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Shipping Charges</dt>
                    <dd className="font-medium">{formatPKR(payment.shippingCharges)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2.5">
                    <dt className="font-semibold">Total — Paid in Full</dt>
                    <dd className="font-semibold">{formatPKR(payment.totalPayable)}</dd>
                  </div>
                </dl>

                {/* JazzCash payment + TID */}
                <div className="p-5 space-y-4">
                  <p className="text-[11px] font-semibold tracking-[0.16em] uppercase flex items-center gap-2">
                    <Smartphone className="h-4 w-4" /> Pay with JazzCash
                  </p>
                  <div className="border border-foreground bg-secondary/60 p-4 space-y-3 text-sm">
                    <p className="text-muted-foreground leading-relaxed">
                      1. Send <span className="font-semibold text-foreground">{formatPKR(payment.totalPayable)}</span> to:
                    </p>
                    <p className="text-xl font-bold tracking-[0.06em] flex items-center gap-2">
                      {JAZZCASH_ACCOUNT_DISPLAY}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(JAZZCASH_ACCOUNT_DISPLAY.replace(/\s/g, ''))
                          toast.success('JazzCash number copied')
                        }}
                        className="h-7 w-7 border border-border bg-background inline-flex items-center justify-center hover:bg-secondary"
                        aria-label="Copy JazzCash account number"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      Account name: <span className="font-semibold text-foreground">{JAZZCASH_ACCOUNT_NAME}</span>
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      2. Copy the <span className="font-semibold text-foreground">TID / Transaction ID</span> from the
                      confirmation SMS, then enter it below. We cross-check it before dispatch.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="jc-sender" className="text-[11px] font-semibold tracking-[0.14em] uppercase">
                      Number You Paid From <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="jc-sender"
                      inputMode="tel"
                      placeholder="03001234567"
                      value={senderNumber}
                      onChange={(e) => {
                        setSenderNumber(e.target.value)
                        if (payErrors.senderNumber) setPayErrors((p) => ({ ...p, senderNumber: undefined }))
                      }}
                      aria-invalid={!!payErrors.senderNumber}
                      className="h-11 rounded-none border-border bg-background"
                    />
                    {payErrors.senderNumber && <p className="text-xs text-destructive">{payErrors.senderNumber}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="jc-tid" className="text-[11px] font-semibold tracking-[0.14em] uppercase">
                      JazzCash TID <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="jc-tid"
                      placeholder="e.g. 12345678901"
                      value={tid}
                      onChange={(e) => {
                        setTid(e.target.value)
                        if (payErrors.tid) setPayErrors((p) => ({ ...p, tid: undefined }))
                      }}
                      aria-invalid={!!payErrors.tid}
                      className="h-11 rounded-none border-border bg-background font-mono"
                    />
                    {payErrors.tid && <p className="text-xs text-destructive">{payErrors.tid}</p>}
                  </div>
                  <label className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paidConfirmed}
                      onChange={(e) => setPaidConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-black"
                    />
                    I have already sent the full amount, and this TID is genuine. Fake or reused TIDs are rejected.
                  </label>
                </div>

                <div className="p-5 bg-secondary/60">
                  <p className="text-[11px] font-semibold tracking-[0.16em] uppercase mb-1.5 flex items-center gap-1.5">
                    <Lock className="h-3 w-3" /> Secure Checkout
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your parcel is dispatched only after the owner verifies your TID against the JazzCash account.
                    You will get an email the moment your payment is confirmed.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-13 py-4 bg-primary text-primary-foreground text-xs font-semibold tracking-[0.18em] uppercase hover:bg-primary/85 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Placing order…
                </>
              ) : (
                `Place Order — ${formatPKR(payment.totalPayable)}`
              )}
            </button>
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              By placing your order you agree to the 3-day return policy and confirm
              that your delivery details are correct.
            </p>
          </div>
        </div>
      </form>
    </section>
  )
}
