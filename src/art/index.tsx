/**
 * Storybook clip art, drawn as inline SVG so it scales cleanly and can be
 * recolored with CSS custom properties. All pieces are decorative
 * (aria-hidden) — the text carries the meaning.
 */
import type { SVGProps } from 'react'

type ArtProps = SVGProps<SVGSVGElement>

const base = { 'aria-hidden': true, focusable: false } as const

export function Star(props: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path
        d="M12 2.5l2.6 6.1 6.6.5-5 4.3 1.6 6.4L12 16.4l-5.8 3.4 1.6-6.4-5-4.3 6.6-.5z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Sparkle(props: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" {...base} {...props}>
      <path d="M12 1c.6 5.4 2.6 8.4 11 11-8.4 2.6-10.4 5.6-11 11-.6-5.4-2.6-8.4-11-11 8.4-2.6 10.4-5.6 11-11z" fill="currentColor" />
    </svg>
  )
}

export function Moon(props: ArtProps) {
  return (
    <svg viewBox="0 0 64 64" {...base} {...props}>
      {/* mirrored so the crescent opens to the left */}
      <g transform="translate(64 0) scale(-1 1)">
        <path
          d="M42 6a26 26 0 1 0 16 44A22 22 0 0 1 42 6z"
          fill="var(--moon, #f6e7b4)"
          stroke="var(--gold, #c9a24a)"
          strokeWidth="1.5"
        />
        <circle cx="30" cy="40" r="2.5" fill="#e9d595" />
        <circle cx="22" cy="28" r="1.6" fill="#e9d595" />
        <circle cx="34" cy="50" r="1.4" fill="#e9d595" />
      </g>
    </svg>
  )
}

export function Cloud(props: ArtProps) {
  return (
    <svg viewBox="0 0 120 56" {...base} {...props}>
      <path
        d="M22 50c-10 0-16-6-16-13s6-13 15-13c2-10 10-17 21-17 9 0 16 5 19 12 3-2 6-3 10-3 10 0 17 7 18 16 9 1 15 7 15 14s-6 4-14 4z"
        fill="currentColor"
      />
    </svg>
  )
}

export function Crown(props: ArtProps & { jewel?: string }) {
  const { jewel = 'var(--rose, #d9a3a8)', ...rest } = props
  return (
    <svg viewBox="0 0 64 48" {...base} {...rest}>
      <path
        d="M6 40 L4 12 L18 24 L32 6 L46 24 L60 12 L58 40 Z"
        fill="var(--gold-soft, #e6c97a)"
        stroke="var(--gold-deep, #a37f2c)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="6" y="38" width="52" height="7" rx="2" fill="var(--gold, #c9a24a)" stroke="var(--gold-deep, #a37f2c)" strokeWidth="2" />
      <circle cx="4" cy="11" r="3" fill="var(--gold, #c9a24a)" />
      <circle cx="32" cy="5" r="3.5" fill="var(--gold, #c9a24a)" />
      <circle cx="60" cy="11" r="3" fill="var(--gold, #c9a24a)" />
      <circle cx="32" cy="28" r="4.5" fill={jewel} stroke="var(--gold-deep, #a37f2c)" strokeWidth="1.5" />
      <circle cx="17" cy="32" r="2.6" fill={jewel} opacity=".8" />
      <circle cx="47" cy="32" r="2.6" fill={jewel} opacity=".8" />
    </svg>
  )
}

export function Castle(props: ArtProps) {
  return (
    <svg viewBox="0 0 200 120" {...base} {...props}>
      <g fill="var(--castle, #e9dcc0)" stroke="var(--ink-soft, #8a7560)" strokeWidth="2" strokeLinejoin="round">
        {/* side towers */}
        <rect x="20" y="40" width="30" height="80" />
        <rect x="150" y="40" width="30" height="80" />
        {/* keep */}
        <rect x="60" y="56" width="80" height="64" />
        <rect x="85" y="20" width="30" height="100" />
      </g>
      {/* roofs */}
      <g fill="var(--roof, #8fa9d6)" stroke="var(--ink-soft, #8a7560)" strokeWidth="2" strokeLinejoin="round">
        <path d="M16 42 L35 6 L54 42 Z" />
        <path d="M146 42 L165 6 L184 42 Z" />
        <path d="M81 22 L100 -8 L119 22 Z" transform="translate(0 6)" />
      </g>
      {/* crenellations */}
      <path d="M60 56 v-8 h10 v8 h10 v-8 h10 v8 M110 56 v-8 h10 v8 h10 v-8 h10 v8" fill="none" stroke="var(--ink-soft, #8a7560)" strokeWidth="2" />
      {/* door + windows */}
      <path d="M88 120 v-22 a12 12 0 0 1 24 0 v22" fill="var(--door, #b98c5a)" stroke="var(--ink-soft, #8a7560)" strokeWidth="2" />
      <g fill="var(--window, #f3d27a)">
        <path d="M95 46 v-8 a5 5 0 0 1 10 0 v8 z" />
        <path d="M30 70 v-8 a5 5 0 0 1 10 0 v8 z" />
        <path d="M160 70 v-8 a5 5 0 0 1 10 0 v8 z" />
      </g>
      {/* flags */}
      <path d="M35 6 v-6 l10 3 -10 3" fill="var(--rose, #d9a3a8)" stroke="var(--ink-soft, #8a7560)" strokeWidth="1" />
      <path d="M165 6 v-6 l10 3 -10 3" fill="var(--rose, #d9a3a8)" stroke="var(--ink-soft, #8a7560)" strokeWidth="1" />
    </svg>
  )
}

export function Envelope(props: ArtProps) {
  return (
    <svg viewBox="0 0 64 48" {...base} {...props}>
      <rect x="3" y="6" width="58" height="38" rx="4" fill="#fffaf0" stroke="var(--gold-deep, #a37f2c)" strokeWidth="2" />
      <path d="M4 9 L32 30 L60 9" fill="none" stroke="var(--gold-deep, #a37f2c)" strokeWidth="2" strokeLinejoin="round" />
      {/* wax seal heart */}
      <path
        d="M32 36c-6-4-9-7-9-10.5a4.5 4.5 0 0 1 9-1.2 4.5 4.5 0 0 1 9 1.2c0 3.5-3 6.5-9 10.5z"
        fill="var(--rose-deep, #b8606b)"
      />
    </svg>
  )
}

export function Gift(props: ArtProps) {
  return (
    <svg viewBox="0 0 64 64" {...base} {...props}>
      <rect x="8" y="26" width="48" height="34" rx="3" fill="var(--boy-soft, #bcd3ef)" stroke="var(--boy-deep, #3f6fae)" strokeWidth="2" />
      <rect x="4" y="18" width="56" height="10" rx="2" fill="var(--boy, #6f9fd8)" stroke="var(--boy-deep, #3f6fae)" strokeWidth="2" />
      <rect x="28" y="18" width="8" height="42" fill="var(--gold, #c9a24a)" />
      <path d="M32 18c-4-10-16-12-16-5 0 4 8 5 16 5zM32 18c4-10 16-12 16-5 0 4-8 5-16 5z" fill="var(--gold-soft, #e6c97a)" stroke="var(--gold-deep, #a37f2c)" strokeWidth="2" />
    </svg>
  )
}

/** Ornamental vine for the corners of a storybook page. */
export function Flourish(props: ArtProps) {
  return (
    <svg viewBox="0 0 80 80" {...base} {...props}>
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M4 76 C4 40 20 14 76 4" />
        <path d="M14 52 c8 -2 12 -8 12 -16" />
        <path d="M30 28 c8 0 14 -4 16 -12" />
        <path d="M10 64 c-4 -6 -2 -12 4 -14" />
      </g>
      <g fill="currentColor">
        <circle cx="26" cy="36" r="2.2" />
        <circle cx="46" cy="16" r="2.2" />
        <path d="M58 9 c-2 -6 4 -8 6 -4 c2 -4 8 -2 6 4 c-2 3 -6 5 -6 5 s-4 -2 -6 -5z" />
      </g>
    </svg>
  )
}
