import type { SceneId } from '../story'

/**
 * Places on a printed page that do something when tapped, in page pixels
 * (pages are painted at 768 × 1024). The painter draws these exact rectangles,
 * and taps are matched against them, so the two can't drift apart.
 */
export type Action = 'watch' | 'registry'
export type Rect = { x: number; y: number; w: number; h: number }

export const VIDEO_STILL: Rect = { x: 84, y: 250, w: 600, h: 338 } // 16:9, like the video
export const REGISTRY_CARD: Rect = { x: 84, y: 240, w: 600, h: 470 }

const hotspots: Partial<Record<SceneId, { right?: [Rect, Action][] }>> = {
  reveal: { right: [[VIDEO_STILL, 'watch']] },
  finale: { right: [[REGISTRY_CARD, 'registry']] },
}

/**
 * What tapping a right-hand page at texture coordinates (u, v) does, if anything.
 * u runs from the spine (0) to the outer edge (1); v from the bottom (0) to the top (1).
 */
export function actionAt(scene: SceneId, u: number, v: number): Action | null {
  const x = u * 768
  const y = (1 - v) * 1024
  for (const [r, action] of hotspots[scene]?.right ?? []) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return action
  }
  return null
}
