import { describe, expect, it } from 'vitest'
import { SCENES } from '../story'
import { FLIPBOOK_AFTER, FLIPS, leafAt, physical, riffle, TOTAL_LEAVES, turnedCount } from './layout'

describe('the physical pages', () => {
  it('bind the flipbook pages in between the first spread and the next', () => {
    expect(SCENES[FLIPBOOK_AFTER]).toBe('once')
    expect(leafAt(FLIPBOOK_AFTER)).toEqual({ kind: 'story', j: FLIPBOOK_AFTER })
    expect(leafAt(FLIPBOOK_AFTER + 1)).toEqual({ kind: 'flip', k: 1 })
    expect(leafAt(FLIPBOOK_AFTER + FLIPS)).toEqual({ kind: 'flip', k: FLIPS })
    expect(leafAt(FLIPBOOK_AFTER + FLIPS + 1)).toEqual({ kind: 'story', j: FLIPBOOK_AFTER + 1 })
    expect(leafAt(TOTAL_LEAVES)).toEqual({ kind: 'story', j: SCENES.length - 1 })
  })

  it('maps every story leaf to its physical leaf', () => {
    for (let j = 1; j < SCENES.length; j++) expect(leafAt(physical(j))).toEqual({ kind: 'story', j })
  })

  it('turns every flipbook page on the way to the spread after it', () => {
    expect(turnedCount(0)).toBe(0)
    expect(turnedCount(1)).toBe(1)
    expect(turnedCount(2)).toBe(2 + FLIPS)
    expect(turnedCount(SCENES.length - 1)).toBe(TOTAL_LEAVES)
  })
})

describe('riffling', () => {
  it('turns one leaf at a time without a plan', () => {
    expect(riffle(4, 5).size).toBe(0)
  })

  it('forward through the flipbook: one page after another at a steady pace', () => {
    const plan = riffle(turnedCount(1), turnedCount(2))
    expect(plan.size).toBe(FLIPS + 1)
    const leaves = [...plan.entries()].sort(([a], [b]) => a - b).map(([, v]) => v)
    const gaps = leaves.slice(1).map((l, i) => l.delay - leaves[i].delay)
    for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0])
    expect(new Set(leaves.map((l) => l.stiffness)).size).toBe(1)
    expect(leaves.at(-1)!.delay).toBeLessThan(3) // the whole riffle stays brief
  })

  it('back, or starting over: last page first, the cover after everything', () => {
    const plan = riffle(TOTAL_LEAVES, 0)
    expect(plan.get(TOTAL_LEAVES - 1)!.delay).toBe(0)
    const cover = plan.get(0)!.delay
    for (const [i, { delay }] of plan) if (i !== 0) expect(delay).toBeLessThan(cover)
  })
})
