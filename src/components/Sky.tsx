import { useEffect, useRef } from 'react'

/** Deterministic pseudo-random, so the sky is the same on every visit (and in screenshots). */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

/**
 * Hundreds of small stars, painted once onto a canvas at the screen's full resolution:
 * varied in size, brightness and warmth, thinning toward the horizon, with a soft glow
 * around the brightest. Repainted only when the window changes size.
 */
function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const paint = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const { innerWidth: w, innerHeight: h } = window
      canvas.width = w * dpr
      canvas.height = h * dpr
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)
      const rand = seeded(7)
      const count = Math.round((w * h) / 2200)
      for (let i = 0; i < count; i++) {
        const x = rand() * w
        const y = Math.pow(rand(), 1.5) * h // denser up high
        const fade = 1 - (y / h) * 0.75 // fainter toward the horizon
        const size = 0.35 + Math.pow(rand(), 5) * 1.6
        const alpha = (0.35 + rand() * 0.65) * fade
        const tint = rand()
        const color = tint < 0.2 ? '255, 236, 205' : tint < 0.4 ? '214, 226, 255' : '255, 255, 250'
        if (size > 1.1) {
          const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 5)
          glow.addColorStop(0, `rgba(${color}, ${alpha * 0.45})`)
          glow.addColorStop(1, `rgba(${color}, 0)`)
          ctx.fillStyle = glow
          ctx.fillRect(x - size * 5, y - size * 5, size * 10, size * 10)
        }
        ctx.fillStyle = `rgba(${color}, ${alpha})`
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    paint()
    window.addEventListener('resize', paint)
    return () => window.removeEventListener('resize', paint)
  }, [])

  return <canvas ref={ref} className="sky-starfield" />
}

/** A few bright stars that twinkle, each with a soft halo and fine diffraction spikes. */
const rand = seeded(42)
const TWINKLERS = Array.from({ length: 14 }, () => ({
  left: 3 + rand() * 94,
  top: 2 + Math.pow(rand(), 1.4) * 70,
  size: 10 + rand() * 16,
  delay: -rand() * 6,
  duration: 3.5 + rand() * 4,
}))

function Twinkler({ style }: { style: React.CSSProperties }) {
  return (
    <svg className="sky-twinkler" viewBox="0 0 40 40" style={style}>
      <defs>
        <radialGradient id="twinkle-halo">
          <stop offset="0" stopColor="#fffdf2" stopOpacity="0.95" />
          <stop offset="0.25" stopColor="#fff2c8" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff2c8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="twinkle-spike-h" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="twinkle-spike-v" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="12" fill="url(#twinkle-halo)" />
      <rect x="2" y="19.4" width="36" height="1.2" fill="url(#twinkle-spike-h)" />
      <rect x="19.4" y="2" width="1.2" height="36" fill="url(#twinkle-spike-v)" />
      <circle cx="20" cy="20" r="1.8" fill="#fffef8" />
    </svg>
  )
}

/** A crescent moon with soft shading, faint craters and a layered glow (lit on the right, as in the book's art). */
function Moon() {
  return (
    <div className="sky-moon">
      <div className="sky-moon-halo" />
      <svg viewBox="0 0 200 200">
        <defs>
          <radialGradient id="moon-face" cx="70%" cy="38%" r="70%">
            <stop offset="0" stopColor="#fffcee" />
            <stop offset="0.55" stopColor="#f8eac4" />
            <stop offset="1" stopColor="#d9c38f" />
          </radialGradient>
          {/* the terminator: the crescent's inner edge fades into shadow */}
          <radialGradient id="moon-shade" cx="38%" cy="46%" r="62%">
            <stop offset="0.55" stopColor="#8f7a52" stopOpacity="0.55" />
            <stop offset="0.8" stopColor="#8f7a52" stopOpacity="0" />
          </radialGradient>
          <mask id="moon-crescent">
            <circle cx="100" cy="100" r="78" fill="#fff" />
            <circle cx="66" cy="86" r="70" fill="#000" />
          </mask>
          <filter id="moon-soft">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>
        <g mask="url(#moon-crescent)">
          <circle cx="100" cy="100" r="78" fill="url(#moon-face)" />
          <g fill="#b9a26e" opacity="0.28" filter="url(#moon-soft)">
            <circle cx="150" cy="78" r="9" />
            <circle cx="160" cy="118" r="6" />
            <circle cx="138" cy="150" r="11" />
            <circle cx="118" cy="168" r="5" />
            <circle cx="166" cy="96" r="3.5" />
            <circle cx="146" cy="128" r="4" />
          </g>
          <circle cx="100" cy="100" r="78" fill="url(#moon-shade)" />
        </g>
      </svg>
    </div>
  )
}

/** The twilight sky behind the book. Everything here is decorative. */
export function Sky() {
  return (
    <div className="sky" aria-hidden data-testid="sky">
      <div className="sky-glow" />
      <Starfield />
      {TWINKLERS.map((t, i) => (
        <Twinkler
          key={i}
          style={{
            left: `${t.left}%`,
            top: `${t.top}%`,
            width: t.size,
            height: t.size,
            animationDelay: `${t.delay}s`,
            animationDuration: `${t.duration}s`,
          }}
        />
      ))}
      <Moon />
      <div className="sky-cloud sky-cloud-1" />
      <div className="sky-cloud sky-cloud-2" />
      <div className="sky-cloud sky-cloud-3" />
      <div className="sky-grain" />
    </div>
  )
}
