import { SCENES } from '../story'

/**
 * Where the reader is: which spread is open, and (on phones, where only one page
 * fits) which of its two pages is in view.
 */
export type View = 'left' | 'right'
export type Place = { spread: number; view: View }

const LAST = SCENES.length - 1

export const START: Place = { spread: 0, view: 'left' }

/**
 * One step forward (+1) or back (−1).
 *
 * Wide screens show both pages, so every step turns a page.
 * On a phone (`single`), the view moves across the spread first, then the page turns:
 *   forward: left page → right page → turn (landing on the next left page)
 *   back:    right page → left page → turn back (landing on the previous right page)
 * Going back from the first spread closes the book.
 */
export function step(place: Place, dir: 1 | -1, single: boolean): Place {
  const { spread: s, view } = place
  if (dir > 0) {
    if (s === 0) return { spread: 1, view: 'left' }
    if (single && view === 'left') return { spread: s, view: 'right' }
    return s < LAST ? { spread: s + 1, view: 'left' } : place
  }
  if (single && view === 'right') return { spread: s, view: 'left' }
  if (s === 1) return START // close the book
  return s >= 2 ? { spread: s - 1, view: single ? 'right' : 'left' } : place
}

/** The leaf a gesture in direction `dir` would turn, if it turns one at all (otherwise it just moves the view). */
export function leafTurnedBy(place: Place, dir: 1 | -1, single: boolean): number | null {
  const next = step(place, dir, single)
  return next.spread === place.spread ? null : dir > 0 ? place.spread : place.spread - 1
}
