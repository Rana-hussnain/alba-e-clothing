'use client'

import { useState } from 'react'
import { Check, Eye, EyeOff, Loader2, MailCheck, ShieldCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCustomer, type AuthMode } from '@/lib/customer-store'
import { toast } from 'sonner'

interface AuthPanelProps {
  /** called after a successful sign-in (e.g. to continue checkout) */
  onAuthenticated?: () => void
}

const inputCls = 'h-11 rounded-none border-border focus-visible:ring-1 focus-visible:ring-primary bg-background'
const btnCls =
  'w-full h-12 bg-primary text-primary-foreground text-xs font-semibold tracking-[0.18em] uppercase hover:bg-primary/85 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2'
const linkCls =
  'text-[11px] font-medium tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors'

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        maxLength={128}
        className={`${inputCls} pr-11`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[11px] font-semibold tracking-[0.14em] uppercase">
        {label}
      </Label>
      {children}
    </div>
  )
}

function PasswordRules({ password }: { password: string }) {
  const rules = [
    { ok: password.length >= 10, label: 'At least 10 characters' },
    { ok: /[A-Za-z]/.test(password) && /[0-9]/.test(password), label: 'Letters and numbers' },
  ]
  return (
    <ul className="mt-2 space-y-1">
      {rules.map((r) => (
        <li
          key={r.label}
          className={`flex items-center gap-1.5 text-[11px] ${r.ok ? 'text-emerald-700' : 'text-muted-foreground'}`}
        >
          <Check className={`h-3 w-3 ${r.ok ? 'opacity-100' : 'opacity-30'}`} /> {r.label}
        </li>
      ))}
    </ul>
  )
}

export function AuthPanel({ onAuthenticated }: AuthPanelProps) {
  const { authMode: mode, setAuthMode, setCustomer, resetToken } = useCustomer()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null) // "check your email" style success state

  const switchMode = (m: AuthMode) => {
    setError(null)
    setNotice(null)
    setPassword('')
    setConfirm('')
    setAuthMode(m)
  }

  const post = async (url: string, body: unknown) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, data }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mode === 'register' || mode === 'reset') {
      if (password.length < 10) return setError('Password must be at least 10 characters')
      if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
        return setError('Password must contain at least one letter and one number')
      if (password !== confirm) return setError('The two passwords do not match')
    }

    setBusy(true)
    try {
      if (mode === 'login') {
        const { ok, data } = await post('/api/auth/login', { email, password })
        if (!ok) return setError(data.error || 'Could not sign in')
        setCustomer(data.customer)
        setPassword('')
        toast.success(`Welcome back, ${data.customer.name.split(' ')[0]}!`)
        onAuthenticated?.()
      } else if (mode === 'register') {
        const { ok, data } = await post('/api/auth/register', { name, email, phone, password })
        if (!ok) return setError(data.error || 'Could not create the account')
        setPassword('')
        setConfirm('')
        setNotice(data.message || 'Account created. Check your email for the verification link, then sign in.')
      } else if (mode === 'forgot') {
        const { ok, data } = await post('/api/auth/forgot', { email })
        if (!ok) return setError(data.error || 'Something went wrong')
        setNotice(data.message)
      } else {
        const { ok, data } = await post('/api/auth/reset', { token: resetToken, password })
        if (!ok) return setError(data.error || 'Could not reset the password')
        setPassword('')
        setConfirm('')
        setAuthMode('login')
        setNotice(null)
        toast.success(data.message || 'Password updated — please sign in')
      }
    } catch {
      setError('Could not reach the server. Check your internet and try again.')
    } finally {
      setBusy(false)
    }
  }

  /* ---- success states ---- */
  if (notice) {
    return (
      <div className="text-center py-6 space-y-4">
        <MailCheck className="h-10 w-10 mx-auto text-emerald-600" strokeWidth={1.25} />
        <p className="text-sm leading-relaxed text-muted-foreground">{notice}</p>
        <button className={linkCls} onClick={() => switchMode('login')}>
          Go to sign in
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {mode === 'register' && (
        <>
          <Field id="auth-name" label="Full Name">
            <Input
              id="auth-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Ahmed Khan"
              maxLength={60}
              className={inputCls}
            />
          </Field>
        </>
      )}

      {mode !== 'reset' && (
        <Field id="auth-email" label="Email">
          <Input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            maxLength={254}
            className={inputCls}
          />
        </Field>
      )}

      {mode === 'register' && (
        <Field id="auth-phone" label="Mobile Number">
          <Input
            id="auth-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder="03001234567"
            maxLength={16}
            className={inputCls}
          />
        </Field>
      )}

      {(mode === 'login' || mode === 'register' || mode === 'reset') && (
        <Field id="auth-password" label={mode === 'reset' ? 'New Password' : 'Password'}>
          <PasswordInput
            id="auth-password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          {mode !== 'login' && <PasswordRules password={password} />}
        </Field>
      )}

      {(mode === 'register' || mode === 'reset') && (
        <Field id="auth-confirm" label="Confirm Password">
          <PasswordInput id="auth-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </Field>
      )}

      {error && (
        <p role="alert" className="text-xs text-destructive leading-relaxed border border-destructive/30 bg-destructive/5 p-3">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className={btnCls}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {mode === 'login' && 'Sign In'}
        {mode === 'register' && 'Create Account'}
        {mode === 'forgot' && 'Send Reset Link'}
        {mode === 'reset' && 'Save New Password'}
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {mode === 'login' && (
          <>
            <button type="button" className={linkCls} onClick={() => switchMode('forgot')}>
              Forgot password?
            </button>
            <button type="button" className={linkCls} onClick={() => switchMode('register')}>
              Create account
            </button>
          </>
        )}
        {mode === 'register' && (
          <button type="button" className={linkCls} onClick={() => switchMode('login')}>
            Already have an account? Sign in
          </button>
        )}
        {(mode === 'forgot' || mode === 'reset') && (
          <button type="button" className={linkCls} onClick={() => switchMode('login')}>
            Back to sign in
          </button>
        )}
      </div>

      <p className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed pt-2 border-t border-border">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" />
        Your password is stored encrypted and never shown to anyone. Sign-in locks automatically after repeated wrong attempts.
      </p>
    </form>
  )
}
