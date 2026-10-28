/**
 * The story's page order. This is the single source of truth for the flow:
 * reorder, add, or remove scenes here and everything else (navigation,
 * deep links, the dev scene picker) follows.
 */
export const SCENES = ['cover', 'once', 'expecting', 'reveal', 'boy', 'finale'] as const

export type SceneId = (typeof SCENES)[number]

export function isSceneId(value: unknown): value is SceneId {
  return typeof value === 'string' && (SCENES as readonly string[]).includes(value)
}

export function nextScene(id: SceneId): SceneId | null {
  return SCENES[SCENES.indexOf(id) + 1] ?? null
}

export function prevScene(id: SceneId): SceneId | null {
  const i = SCENES.indexOf(id)
  return i > 0 ? SCENES[i - 1] : null
}

/** `?scene=reveal` starts the story on that page. Unknown values fall back to the cover. */
export function sceneFromSearch(search: string): SceneId {
  const scene = new URLSearchParams(search).get('scene')
  return isSceneId(scene) ? scene : 'cover'
}

