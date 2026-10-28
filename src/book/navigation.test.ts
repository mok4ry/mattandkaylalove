import { describe, expect, it } from 'vitest'
import { SCENES } from '../story'
import { leafTurnedBy, START, step, type Place } from './navigation'

const LAST = SCENES.length - 1
const walk = (from: Place, dir: 1 | -1, times: number, single: boolean) => {
  const seen = [from]
  for (let i = 0; i < times; i++) seen.push(step(seen.at(-1)!, dir, single))
  return seen.map((p) => `${p.spread}${p.view[0]}`)
}

describe('on wide screens, every step turns a page', () => {
  it('forward from the cover to the end, and no further', () => {
    expect(walk(START, 1, LAST + 1, false)).toEqual([...Array.from({ length: LAST + 1 }, (_, i) => `${i}l`), `${LAST}l`])
  })

  it('back from the first spread closes the book, and stays closed', () => {
    expect(walk({ spread: 3, view: 'left' }, -1, 4, false)).toEqual(['3l', '2l', '1l', '0l', '0l'])
  })
})

describe('on a phone, the view crosses the spread before the page turns', () => {
  it('forward: open to the left page, then right page, then turn to the next left page', () => {
    expect(walk(START, 1, 5, true)).toEqual(['0l', '1l', '1r', '2l', '2r', '3l'])
  })

  it('back: right page to left page, then turn back to the previous right page', () => {
    expect(walk({ spread: 3, view: 'right' }, -1, 6, true)).toEqual(['3r', '3l', '2r', '2l', '1r', '1l', '0l'])
  })

  it('stops on the last right page', () => {
    expect(step({ spread: LAST, view: 'right' }, 1, true)).toEqual({ spread: LAST, view: 'right' })
  })
})

describe('which leaf a gesture turns', () => {
  it('turns a leaf only when the step changes spread', () => {
    expect(leafTurnedBy(START, 1, true)).toBe(0) // the cover
    expect(leafTurnedBy({ spread: 2, view: 'left' }, 1, true)).toBeNull() // just moves to the right page
    expect(leafTurnedBy({ spread: 2, view: 'right' }, 1, true)).toBe(2)
    expect(leafTurnedBy({ spread: 2, view: 'left' }, -1, true)).toBe(1)
    expect(leafTurnedBy({ spread: 2, view: 'right' }, -1, true)).toBeNull()
    expect(leafTurnedBy({ spread: 1, view: 'left' }, -1, false)).toBe(0) // closing: the cover swings back
    expect(leafTurnedBy({ spread: 1, view: 'right' }, -1, true)).toBeNull() // first, over to the left page
    expect(leafTurnedBy(START, -1, false)).toBeNull()
    expect(leafTurnedBy({ spread: LAST, view: 'left' }, 1, false)).toBeNull()
  })
})
