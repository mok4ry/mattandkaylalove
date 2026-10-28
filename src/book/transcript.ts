import { content } from '../content'
import type { SceneId } from '../story'

/** The words printed on each spread, for screen readers (the 3D pages themselves are just pictures). */
export function transcript(scene: SceneId): string[] {
  const c = content
  switch (scene) {
    case 'cover':
      return [c.cover.title]
    case 'once':
      return [c.once.text]
    case 'expecting':
      return [c.expecting.heading.replace('\n', ' '), c.expecting.caption]
    case 'reveal':
      return [c.reveal.heading, c.reveal.body]
    case 'boy':
      return [c.boy.heading, c.boy.body, c.boy.due].filter(Boolean)
    case 'finale':
      return [c.finale.heading, `${c.finale.shower.title}. ${c.finale.shower.body}`, c.finale.registry.title]
  }
}
