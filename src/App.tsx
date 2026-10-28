import { Canvas, useLoader } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import * as THREE from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { BOOK_MODEL } from './book/assets'
import { Book3D } from './book/Book3D'
import { actionAt } from './book/hotspots'
import { START, step, type Place } from './book/navigation'
import { transcript } from './book/transcript'
import { startPainting, useBookTextures } from './book/useBookTextures'
import { DevSceneNav } from './components/DevSceneNav'
import { FallingStars } from './components/FallingStars'
import { Loading } from './components/Loading'
import { VideoPlayer } from './components/VideoPlayer'
import { content } from './content'
import { SCENES, type SceneId } from './story'

// Start painting the pages now, while the book model is still downloading.
startPainting()

/** The help text under the book appears only after this long without anyone touching anything. */
const HINT_AFTER_MS = 10_000

type Props = {
  initialScene?: SceneId
  /** Show the dev scene picker. */
  devTools?: boolean
}

/** Phones held upright show one page at a time: two side by side would be too small to read. */
const ONE_PAGE = '(max-aspect-ratio: 1/1)'
function useOnePage() {
  return useSyncExternalStore(
    (onChange) => {
      const query = matchMedia(ONE_PAGE)
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => matchMedia(ONE_PAGE).matches,
  )
}

/** The storybook: a 3D book whose pages you turn, plus the few things that sit over it. */
export function App({ initialScene = 'cover', devTools = false }: Props) {
  const single = useOnePage()
  const [place, setPlace] = useState<Place>({ spread: SCENES.indexOf(initialScene), view: 'left' })
  const { spread, view } = place
  const [ready, setReady] = useState(false)
  const [watching, setWatching] = useState(false)
  const video = useRef<HTMLVideoElement>(null)
  const scene = SCENES[spread]
  const { registry } = content.finale

  const go = useCallback((dir: 1 | -1) => setPlace((p) => step(p, dir, single)), [single])
  const next = () => go(1)
  const prev = () => go(-1)
  const restart = () => setPlace(START)
  const atEnd = step(place, 1, single) === place
  const atStart = step(place, -1, single) === place

  // Start playback inside the tap itself, so phones allow sound.
  const watch = () => {
    video.current?.play()?.catch(() => {})
    setWatching(true)
  }
  const closeVideo = useCallback(() => {
    video.current?.pause()
    setWatching(false)
  }, [])
  useEffect(() => setWatching(false), [scene])

  // Help text: hidden until the reader has left the book alone for a while, then it fades in.
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    if (!ready) return // count from when the book appears, not while it loads
    let timer = 0
    const restartTimer = () => {
      setIdle(false)
      clearTimeout(timer)
      timer = window.setTimeout(() => setIdle(true), HINT_AFTER_MS)
    }
    restartTimer()
    const events = ['pointerdown', 'keydown', 'wheel'] as const
    events.forEach((e) => window.addEventListener(e, restartTimer, { passive: true }))
    return () => {
      clearTimeout(timer)
      events.forEach((e) => window.removeEventListener(e, restartTimer))
    }
  }, [place, ready])

  /** A tap on the open right-hand page: true if it hit something (so the page shouldn't turn). */
  const onPageTap = (u: number, v: number) => {
    const action = actionAt(scene, u, v)
    if (action === 'watch') {
      watch()
      return true
    }
    if (action === 'registry' && registry.url) {
      window.open(registry.url, '_blank', 'noopener')
      return true
    }
    return false
  }

  return (
    <main
      className="stage"
      data-testid="book"
      data-scene={scene}
      data-spread={spread}
      data-view={single ? view : 'both'}
      data-ready={ready || undefined}
    >
      <Canvas
        className="book-canvas"
        shadows
        // Only draw when something moves: a still book costs nothing (and saves phone battery).
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ fov: 30, near: 0.01, far: 10, position: [0, -0.2, 0.6] }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.05 }}
        aria-hidden
      >
        <Suspense fallback={null}>
          <Scene
            spread={spread}
            view={view}
            single={single}
            onStep={go}
            onPageTap={onPageTap}
            paused={watching}
            onReady={setReady}
          />
        </Suspense>
      </Canvas>

      {scene === 'boy' && <FallingStars />}

      {scene === 'finale' && (
        <button type="button" className="restart" onClick={restart}>
          <span aria-hidden>↺</span> {content.restart}
        </button>
      )}

      <p className={`hint${idle && ready && !watching ? ' is-visible' : ''}`} aria-hidden data-testid="hint">
        {spread === 0 ? content.book.hintClosed : single ? content.book.hintSwipe : `${content.book.hintOpen} · ← →`}
      </p>

      {/* The words on the open pages, and every action as a real button, for screen readers and keyboards. */}
      <section className="sr-only" aria-live="polite" data-testid="transcript">
        {transcript(scene).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>
      <nav className="book-controls" aria-label="Book">
        <button type="button" className="sr-focusable" onClick={next} disabled={atEnd}>
          {spread === 0 ? content.cover.openLabel : content.book.turn}
        </button>
        {!atStart && (
          <button type="button" className="sr-focusable" onClick={prev}>
            {step(place, -1, single).spread === 0 ? content.book.close : content.book.back}
          </button>
        )}
        {scene === 'reveal' && (
          <button type="button" className="sr-focusable" onClick={watch}>
            {content.reveal.watch}
          </button>
        )}
        {scene === 'finale' && registry.url && (
          <a className="sr-focusable" href={registry.url} target="_blank" rel="noopener noreferrer">
            {registry.title}
          </a>
        )}
      </nav>

      {scene === 'reveal' && (
        <VideoPlayer
          ref={video}
          open={watching}
          onClose={closeVideo}
          onEnded={() => {
            setWatching(false)
            // on to the next spread, whichever page was in view
            setPlace({ spread: spread + 1, view: 'left' })
          }}
        />
      )}

      <Loading done={ready} />

      {devTools && <DevSceneNav scene={scene} goTo={(id) => setPlace({ spread: SCENES.indexOf(id), view: 'left' })} />}
    </main>
  )
}

type SceneProps = {
  spread: number
  view: Place['view']
  single: boolean
  onStep: (dir: 1 | -1) => void
  onPageTap: (u: number, v: number) => boolean
  paused: boolean
  onReady: (ready: boolean) => void
}

function Scene({ onReady, ...props }: SceneProps) {
  const { scene: model } = useLoader(GLTFLoader, BOOK_MODEL, (loader) => loader.setMeshoptDecoder(MeshoptDecoder))
  const textures = useBookTextures()
  useEffect(() => {
    if (!textures) return
    onReady(true)
  }, [textures, onReady])
  if (!textures) return null
  return <Book3D model={model} textures={textures} {...props} />
}
