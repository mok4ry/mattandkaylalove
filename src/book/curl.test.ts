import { describe, expect, it } from 'vitest'
import { curlAt, gutterDip, pagePoint, REST_TILT } from './curl'

const W = 0.15
const steps = Array.from({ length: 21 }, (_, i) => i / 20)

describe('page curl', () => {
  it('lies flat on the right before turning and flat on the left after', () => {
    for (const s of [0, W / 2, W]) {
      const [x0, z0] = pagePoint(s, W, 0.5, curlAt(0))
      expect(x0).toBeCloseTo(s)
      expect(z0).toBeCloseTo(0)
      const [x1, z1] = pagePoint(s, W, 0.5, curlAt(1))
      expect(x1).toBeCloseTo(-s)
      expect(z1).toBeCloseTo(0)
    }
  })

  it('stays hinged at the spine', () => {
    for (const p of steps) {
      const [x, z] = pagePoint(0, W, 0.2, curlAt(p))
      expect(x).toBeCloseTo(0, 9)
      expect(z).toBeCloseTo(0, 9)
    }
  })

  it('never stretches: every row keeps the page width', () => {
    for (const p of steps) {
      for (const v of [0, 0.5, 1]) {
        let length = 0
        let prev = pagePoint(0, W, v, curlAt(p))
        for (let i = 1; i <= 200; i++) {
          const next = pagePoint((W * i) / 200, W, v, curlAt(p))
          length += Math.hypot(next[0] - prev[0], next[1] - prev[1])
          prev = next
        }
        expect(length).toBeCloseTo(W, 4)
      }
    }
  })

  it('never dips into the stack below', () => {
    for (const p of steps)
      for (const v of [0, 0.5, 1])
        for (const s of [W / 4, W / 2, W]) expect(pagePoint(s, W, v, curlAt(p))[1]).toBeGreaterThanOrEqual(-1e-9)
  })

  it('curls mid-turn, with the bottom corner leading', () => {
    const c = curlAt(0.4)
    const [, zTopEdge] = pagePoint(W, W, 1, c)
    const [xBottom] = pagePoint(W, W, 0, c)
    const [xTop] = pagePoint(W, W, 1, c)
    expect(zTopEdge).toBeGreaterThan(0)
    // The bottom corner is further over toward the left page than the top corner.
    expect(xBottom).toBeLessThan(xTop)
  })
})

describe('an open book at rest', () => {
  it('lies flat while closed, and tilts up from the spine once open', () => {
    const [, zClosed] = pagePoint(W, W, 0.5, curlAt(0, 0))
    expect(zClosed).toBeCloseTo(0)
    const [xRight, zRight] = pagePoint(W, W, 0.5, curlAt(0, 1))
    expect(Math.atan2(zRight, xRight)).toBeCloseTo(REST_TILT)
    const [xLeft, zLeft] = pagePoint(W, W, 0.5, curlAt(1, 1))
    expect(Math.atan2(zLeft, -xLeft)).toBeCloseTo(REST_TILT)
  })

  it('sinks pages into the gutter, deepest at the spine and smoothing out', () => {
    expect(gutterDip(0, 0.005, 0.05)).toBeCloseTo(0.005)
    expect(gutterDip(0.05, 0.005, 0.05)).toBe(0)
    expect(gutterDip(0.1, 0.005, 0.05)).toBe(0)
    expect(gutterDip(-0.01, 0.005, 0.05)).toBe(gutterDip(0.01, 0.005, 0.05))
    let prev = Infinity
    for (let x = 0; x <= 0.05; x += 0.005) {
      const d = gutterDip(x, 0.005, 0.05)
      expect(d).toBeLessThanOrEqual(prev)
      prev = d
    }
  })
})
