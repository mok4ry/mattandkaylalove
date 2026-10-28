import { useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { SCENES } from '../story'
import { leafAt, TOTAL_LEAVES } from './layout'
import { fontsReady, paintCoverTitle, paintFlipFrame, paintPage } from './textures'

export type BookTextures = {
  /** Gold title, moon and stars for the blank centre of the cover (transparent elsewhere). */
  title: THREE.Texture
  /** The first left page, glued inside the front cover. */
  insideCover: THREE.Texture
  /** pages[i] = physical leaf i after the cover (flipbook pages included; see layout.ts): its front (a right page) and back (the next left page). */
  pages: { front: THREE.Texture; back: THREE.Texture }[]
}

type Canvases = {
  title: HTMLCanvasElement
  insideCover: HTMLCanvasElement
  pages: { front: HTMLCanvasElement; back: HTMLCanvasElement }[]
}

const spreadAt = (i: number) => {
  const id = SCENES[i]
  return id && id !== 'cover' ? id : null
}

/** Paint every page, all at once (each waits only on its own pictures). */
async function paintBook(): Promise<Canvases> {
  await fontsReady()
  const leaves = Array.from({ length: TOTAL_LEAVES }, async (_, n) => {
    const leaf = leafAt(n + 1)
    const after = leafAt(n + 2)
    let front: Promise<HTMLCanvasElement>
    let back: Promise<HTMLCanvasElement>
    if (leaf.kind === 'flip') {
      // flipbook page k: frames 2k-1 (front) and 2k (back); the last back is the real page the riffle settles on
      front = paintFlipFrame('right', 2 * leaf.k - 1)
      back = after.kind === 'story' ? paintPage(spreadAt(after.j), 'left', after.j * 2 - 1) : paintFlipFrame('left', 2 * leaf.k)
    } else {
      const { j } = leaf
      const next = spreadAt(j + 1)
      front = paintPage(spreadAt(j), 'right', j * 2)
      // the page before the flipbook: its back is the first frame
      back = after.kind === 'flip' ? paintFlipFrame('left', 0) : paintPage(next, 'left', next ? j * 2 + 1 : 0)
    }
    const [f, b] = await Promise.all([front, back])
    return { front: f, back: b }
  })
  const [title, insideCover, pages] = await Promise.all([
    paintCoverTitle(700, 940),
    paintPage('once', 'left', 1),
    Promise.all(leaves),
  ])
  return { title, insideCover, pages: [{ front: null!, back: null! }, ...pages] }
}

/**
 * Painting starts the moment this code loads, alongside the download of the book
 * model, rather than waiting for the model and the 3D scene to be ready.
 */
let painting: Promise<Canvases> | null = null
export const startPainting = () => (painting ??= paintBook())

/** The painted pages as textures. Null until ready. */
export function useBookTextures(): BookTextures | null {
  const gl = useThree((s) => s.gl)
  const [textures, setTextures] = useState<BookTextures | null>(null)

  useEffect(() => {
    let cancelled = false
    const made: THREE.Texture[] = []
    const tex = (canvas: HTMLCanvasElement, opts: { mirror?: boolean } = {}) => {
      const t = new THREE.CanvasTexture(canvas)
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = gl.capabilities.getMaxAnisotropy()
      if (opts.mirror) {
        // seen from behind, a page's spine edge is on the right
        t.wrapS = THREE.RepeatWrapping
        t.repeat.x = -1
        t.offset.x = 1
      }
      made.push(t)
      return t
    }

    startPainting()
      .then((c) => {
        if (cancelled) return
        setTextures({
          title: tex(c.title),
          insideCover: tex(c.insideCover),
          pages: c.pages.map((p, j) => (j === 0 ? p : { front: tex(p.front), back: tex(p.back, { mirror: true }) })) as BookTextures['pages'],
        })
      })
      .catch((error) => console.error('Painting the book failed', error))

    return () => {
      cancelled = true
      made.forEach((t) => t.dispose())
    }
  }, [gl])

  return textures
}
