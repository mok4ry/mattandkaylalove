import { describe, expect, it } from 'vitest'
import { isSceneId, nextScene, prevScene, sceneFromSearch, SCENES } from './story'

describe('story order', () => {
  it('starts on the cover and ends on the finale', () => {
    expect(SCENES[0]).toBe('cover')
    expect(SCENES.at(-1)).toBe('finale')
  })

  it('steps forward and back through every scene', () => {
    for (let i = 0; i < SCENES.length - 1; i++) {
      expect(nextScene(SCENES[i])).toBe(SCENES[i + 1])
      expect(prevScene(SCENES[i + 1])).toBe(SCENES[i])
    }
    expect(nextScene('finale')).toBeNull()
    expect(prevScene('cover')).toBeNull()
  })

  it('recognises scene ids', () => {
    expect(isSceneId('reveal')).toBe(true)
    expect(isSceneId('nope')).toBe(false)
    expect(isSceneId(undefined)).toBe(false)
  })
})

describe('url flags', () => {
  it('deep links to a scene', () => {
    expect(sceneFromSearch('?scene=boy')).toBe('boy')
    expect(sceneFromSearch('?scene=bogus')).toBe('cover')
    expect(sceneFromSearch('')).toBe('cover')
  })

})
