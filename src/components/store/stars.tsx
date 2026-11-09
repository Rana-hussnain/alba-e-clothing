'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarsProps {
  /** rating value, e.g. 4.6 */
  value: number
  /** pixel size of each star */
  size?: number
  /** optional review count shown next to the stars */
  count?: number
  className?: string
}

/** Five-star row; fractional value rendered via partial-width overlay. Optional count text. */
export function Stars({ value, size = 12, count, className }: StarsProps) {
  const full = Math.floor(value)
  const frac = value - full
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className="inline-flex items-center gap-px"
        role="img"
        aria-label={`Rated ${value.toFixed(1)} out of 5 stars`}
      >
        {Array.from({ length: 5 }).map((_, i) => {
          const fill = i < full ? 1 : i === full ? frac : 0
          return (
            <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
              <Star
                className="absolute inset-0 text-muted-foreground/30"
                strokeWidth={1.5}
                style={{ width: size, height: size }}
              />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star
                  className="fill-primary text-primary"
                  strokeWidth={1.5}
                  style={{ width: size, height: size }}
                />
              </span>
            </span>
          )
        })}
      </span>
      <span className="text-[11px] font-semibold tabular-nums">{value.toFixed(1)}</span>
      {typeof count === 'number' && (
        <span className="text-[11px] text-muted-foreground">({count})</span>
      )}
    </span>
  )
}
