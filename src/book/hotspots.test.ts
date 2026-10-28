import { describe, expect, it } from 'vitest'
import { actionAt, REGISTRY_CARD, VIDEO_STILL } from './hotspots'

const centre = (r: { x: number; y: number; w: number; h: number }) => [(r.x + r.w / 2) / 768, 1 - (r.y + r.h / 2) / 1024] as const

describe('tapping a page', () => {
  it('on the video still watches the reveal', () => {
    expect(actionAt('reveal', ...centre(VIDEO_STILL))).toBe('watch')
  })

  it('on the registry card opens the registry', () => {
    expect(actionAt('finale', ...centre(REGISTRY_CARD))).toBe('registry')
  })

  it('anywhere else does nothing special (so it turns the page)', () => {
    expect(actionAt('reveal', 0.5, 0.05)).toBeNull()
    expect(actionAt('expecting', 0.5, 0.5)).toBeNull()
    expect(actionAt('reveal', ...centre(REGISTRY_CARD)) === 'registry').toBe(false)
  })
})
