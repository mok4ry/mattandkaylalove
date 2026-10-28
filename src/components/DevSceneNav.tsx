import { useEffect } from 'react'
import { nextScene, prevScene, SCENES, type SceneId } from '../story'

type Props = { scene: SceneId; goTo: (id: SceneId) => void }

/**
 * Dev-only scene jumper (never shipped in production builds).
 * Click a scene, or press [ and ] to step backward and forward.
 */
export function DevSceneNav({ scene, goTo }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ']') goTo(nextScene(scene) ?? scene)
      if (e.key === '[') goTo(prevScene(scene) ?? scene)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [scene, goTo])

  return (
    <nav className="dev-nav" aria-label="Dev scene picker">
      {SCENES.map((id) => (
        <button key={id} type="button" aria-current={id === scene} onClick={() => goTo(id)}>
          {id}
        </button>
      ))}
    </nav>
  )
}
