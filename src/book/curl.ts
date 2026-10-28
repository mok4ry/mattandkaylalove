/**
 * The shape of a page as it turns.
 *
 * A turning page is hinged at the spine (s = 0) and bends along its width:
 * the outer edge lags behind the spine, so the page curls over like paper
 * rather than swinging like a board. The bottom corner leads slightly, as
 * if a finger were lifting it. Each row of the page is a circular arc
 * (constant curvature), which keeps the page the same length while it bends.
 */

export type Curl = {
  /** Angle at the spine: 0 = lying flat on the right, π = flat on the left. */
  angle: number
  /** How much the outer edge lags behind the spine, in radians across the page. */
  bend: number
  /** Extra lift for the bottom corner. */
  lead: number
}

/** How far each half of an open book tilts up from the spine (radians): open books sit in a shallow V. */
export const REST_TILT = 0.12

/**
 * Curl for a turn that is `p` of the way done (0..1). Flat at both ends, most curled mid-turn.
 * `open` (0..1) is how far the book itself is open: an open book's halves tilt up from the spine.
 */
export function curlAt(p: number, open = 0): Curl {
  const lift = Math.sin(Math.PI * p)
  const tilt = REST_TILT * open
  return { angle: tilt + p * (Math.PI - 2 * tilt), bend: 1.1 * lift, lead: 0.5 * lift }
}

/**
 * How far an open book's pages sink into the gutter, `x` from the spine: deepest at the
 * spine, easing smoothly to nothing `length` away. Pages curve down into the binding
 * rather than lying flat right up to it.
 */
export function gutterDip(x: number, depth: number, length: number): number {
  const u = Math.min(Math.abs(x) / length, 1)
  return depth * (1 - u) * (1 - u)
}

/**
 * Where a point on the page ends up: `s` is its distance from the spine
 * (0..width), `v` its height on the page (0 = bottom, 1 = top).
 * Returns [x, z]: x across the book (spine at 0, right page positive) and z toward the reader.
 */
export function pagePoint(s: number, width: number, v: number, c: Curl): [number, number] {
  const a = c.angle
  // Curvature for this row. Clamped so no part of the page dips below the
  // stack it's leaving or overshoots the stack it's landing on.
  const turn = Math.min(Math.max(c.bend - c.lead * (0.5 - v), -(Math.PI - a) * 0.95), a * 0.95)
  const k = turn / width
  if (Math.abs(k) < 1e-6) return [s * Math.cos(a), s * Math.sin(a)]
  return [(Math.sin(a) - Math.sin(a - k * s)) / k, (Math.cos(a - k * s) - Math.cos(a)) / k]
}
