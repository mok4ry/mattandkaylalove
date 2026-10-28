import { SCENES } from '../story'

/**
 * The physical pages of the book, as opposed to the story's spreads.
 *
 * Every spread is one leaf (turn it and the next spread appears), except that a
 * thin stack of flipbook pages is bound in after FLIPBOOK_AFTER: turning past it
 * riffles through them, so the words of the next spread jump about and settle.
 *
 * Physical leaf 0 is the cover; story leaf j (the one whose front is spread j's
 * right page) is physical leaf `physical(j)`.
 */
export const FLIPBOOK_AFTER = SCENES.indexOf('once')
export const FLIPS = 10

/** Leaves after the cover, flipbook pages included. */
export const TOTAL_LEAVES = SCENES.length - 1 + FLIPS

export const physical = (j: number) => (j <= FLIPBOOK_AFTER ? j : j + FLIPS)

/** How many physical leaves (the cover included) lie turned when spread `s` is open. */
export const turnedCount = (s: number) => (s <= FLIPBOOK_AFTER ? s : s + FLIPS)

export type LeafKind = { kind: 'story'; j: number } | { kind: 'flip'; k: number }

/** What physical leaf i (1…TOTAL_LEAVES) is. Flip leaves are numbered 1…FLIPS. */
export function leafAt(i: number): LeafKind {
  if (i <= FLIPBOOK_AFTER) return { kind: 'story', j: i }
  if (i <= FLIPBOOK_AFTER + FLIPS) return { kind: 'flip', k: i - FLIPBOOK_AFTER }
  return { kind: 'story', j: i - FLIPS }
}

/**
 * When a jump turns several leaves at once, each is released in turn: seconds after
 * the jump that leaf i starts moving, and how briskly it swings (spring stiffness).
 * Pages riffle at a steady pace, like a thumb running through a flipbook.
 */
export function riffle(from: number, to: number): Map<number, { delay: number; stiffness: number }> {
  const plan = new Map<number, { delay: number; stiffness: number }>()
  if (Math.abs(to - from) <= 1) return plan
  if (to > from) {
    for (let i = from; i < to; i++) plan.set(i, { delay: (i - from) * 0.1, stiffness: i === 0 ? 14 : 60 })
  } else {
    let t = 0
    for (let i = from - 1; i >= to; i--) {
      plan.set(i, { delay: t, stiffness: i === 0 ? 14 : 70 })
      t += 0.045
    }
  }
  return plan
}
