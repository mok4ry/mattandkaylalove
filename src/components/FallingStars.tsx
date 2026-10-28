import { createPortal } from 'react-dom'
import { Sparkle, Star } from '../art'

const COLORS = ['var(--boy)', 'var(--boy-soft)', 'var(--gold-soft)', 'var(--boy-deep)']

/**
 * A gentle shower of blue and gold stars for the big reveal. Pure CSS animation.
 * Portaled to <body> so the page-turn perspective doesn't trap it behind the page.
 */
export function FallingStars({ count = 28 }: { count?: number }) {
  return createPortal(
    <div className="falling-stars" aria-hidden data-testid="falling-stars">
      {Array.from({ length: count }, (_, i) => {
        const Shape = i % 3 === 0 ? Sparkle : Star
        return (
          <Shape
            key={i}
            className="falling-star"
            style={{
              left: `${(i * 37) % 100}%`,
              width: 10 + ((i * 7) % 14),
              color: COLORS[i % COLORS.length],
              animationDelay: `${(i * 0.43) % 6}s`,
              animationDuration: `${7 + ((i * 5) % 6)}s`,
            }}
          />
        )
      })}
    </div>,
    document.body,
  )
}
