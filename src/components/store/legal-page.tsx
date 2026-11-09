import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { COMPANY_EMAIL, COMPANY_PHONE_LABEL, COMPANY_PHONE_ALT_LABEL, WHATSAPP_LINK } from '@/lib/contact'

const LINKS = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/returns', label: 'Returns & Refunds' },
]

/** Shared layout for the Privacy / Terms / Returns pages. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-[0.22em] uppercase hover:opacity-80">
            ALBA-E
          </Link>
          <Link href="/" className="inline-flex items-center gap-1 text-[11px] tracking-[0.18em] uppercase hover:text-[#d9a856]">
            <ChevronLeft className="h-4 w-4" /> Back to store
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight mb-2">{title}</h1>
        <p className="text-xs text-muted-foreground mb-10">Last updated: {updated}</p>
        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:text-foreground [&_h2]:text-[13px] [&_h2]:font-bold [&_h2]:tracking-[0.16em] [&_h2]:uppercase [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_strong]:text-foreground">
          {children}
        </div>

        <div className="mt-14 pt-6 border-t border-border text-xs text-muted-foreground space-y-2">
          <p>
            Questions? Email <a className="underline" href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>, call {COMPANY_PHONE_LABEL} / {COMPANY_PHONE_ALT_LABEL}, or{' '}
            <a className="underline" href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">message us on WhatsApp</a>.
          </p>
          <p className="flex flex-wrap gap-x-5 gap-y-1">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="underline underline-offset-4 hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </p>
        </div>
      </main>
    </div>
  )
}
