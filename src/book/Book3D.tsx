import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { curlAt, gutterDip, pagePoint, REST_TILT } from './curl'
import { physical, riffle, TOTAL_LEAVES, turnedCount } from './layout'
import { leafTurnedBy, type View } from './navigation'
import type { BookTextures } from './useBookTextures'

/*
 * Dimensions in metres, matching the book model (public/media/book/book.glb).
 * Here the book lies in the XY plane facing +z (toward the reader); the spine
 * runs up the Y axis at x = 0 and the right-hand page stack extends to +x.
 * (The model itself lies flat, Y-up — see `part()` below.)
 */
export const W = 0.15 // page width
export const H = 0.2 // page height
const OVERHANG = 0.004 // boards stick out past the pages
const BOARD = 0.003 // board thickness
const MODEL_BLOCK = 0.025 // thickness of the model's page block
const GAP = 0.0007 // spacing between the leaves
/** Leaves after the cover: one per spread, plus the flipbook pages (see layout.ts). */
export const LEAVES = TOTAL_LEAVES
/** The unused pages at the front and back of the book: the model's page block, less our leaves, split in two. */
const BLOCK = (MODEL_BLOCK - LEAVES * GAP) / 2
/** Height of the cover's hinge, chosen so it lands flat beside the right-hand stack. */
const HINGE_Z = BLOCK + (LEAVES * GAP) / 2

/** How deep the pages sink into the gutter when the book lies open, and how far from the spine that eases out. */
const DIP = 0.008
const DIP_LENGTH = 0.065
const dip = (x: number, open: number) => gutterDip(x, DIP, DIP_LENGTH) * open

const zRight = (j: number) => BLOCK + (LEAVES - j + 0.5) * GAP
const zLeft = (j: number) => BLOCK + (j - 0.5) * GAP

type Props = {
  /** The loaded book model, with meshes named Cover_Front, Cover_Back, Spine and PageBlock. */
  model: THREE.Object3D
  textures: BookTextures
  /** Leaves turned so far: 0 = closed, 1 = first spread open, … */
  spread: number
  /** On a phone, only one page fits: which page of the spread is in view. */
  view: View
  /** Show one page at a time (phones held upright) rather than the whole spread. */
  single: boolean
  /** Step forward (+1) or back (−1): see navigation.ts for what a step does. */
  onStep: (dir: 1 | -1) => void
  /** A tap on the open right-hand page, at texture coordinates (u, v). Return true if it did something, so the page stays put. */
  onPageTap?: (u: number, v: number) => boolean
  /** Ignore input (e.g. while the video plays over the book). */
  paused?: boolean
}

export function Book3D({ model, textures, spread, view, single, onStep, onPageTap, paused = false }: Props) {
  const { gl, scene, camera, size, invalidate } = useThree()

  // ---- environment light, so the gold tooling has something to reflect
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.35
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])

  // ---- the book's shell, from the model
  const parts = useMemo(() => {
    /**
     * A named part of the model, as plain geometry positioned where it sits in the assembled
     * book (the model's origin is the middle of the spine), turned from lying flat (Y-up) to
     * facing the reader. Works the same whether or not the model file is compressed: compressed
     * files store positions as packed integers plus per-part offsets, which this unpacks.
     */
    const part = (name: string) => {
      const source = model.getObjectByName(name)
      if (!source) throw new Error(`The book model has no part named "${name}"`)
      model.updateMatrixWorld(true)
      const obj = new THREE.Group()
      source.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        const geometry = new THREE.BufferGeometry()
        for (const key of ['position', 'normal', 'uv'] as const) {
          const attr = mesh.geometry.getAttribute(key)
          if (!attr) continue
          const floats = new Float32Array(attr.count * attr.itemSize)
          for (let i = 0; i < attr.count; i++)
            for (let c = 0; c < attr.itemSize; c++) floats[i * attr.itemSize + c] = attr.getComponent(i, c)
          geometry.setAttribute(key, new THREE.BufferAttribute(floats, attr.itemSize))
        }
        if (mesh.geometry.index) geometry.setIndex(mesh.geometry.index.clone())
        geometry.applyMatrix4(mesh.matrixWorld)
        const baked = new THREE.Mesh(geometry, mesh.material)
        baked.castShadow = baked.receiveShadow = true
        obj.add(baked)
      })
      const placed = new THREE.Group()
      placed.rotation.x = Math.PI / 2 // model +Y (up off the table) becomes +z (toward the reader)
      placed.add(obj)
      return { placed, obj }
    }
    /** Meshes whose vertices we move, each with its own copy of the geometry and its resting positions. */
    const bendable = (root: THREE.Object3D) => {
      const meshes: { geometry: THREE.BufferGeometry; rest: Float32Array }[] = []
      root.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.geometry = mesh.geometry.clone()
        meshes.push({ geometry: mesh.geometry, rest: Float32Array.from(mesh.geometry.attributes.position.array) })
      })
      return meshes
    }

    // The model's paper and page-edge materials, on page blocks with enough segments to bend into the gutter.
    const materials = new Map<string, THREE.Material>()
    model.getObjectByName('PageBlock')!.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh) for (const m of [mesh.material].flat()) materials.set(m.name, m)
    })
    const paper = materials.get('Cream_Parchment')!
    const edges = materials.get('Cream_Page_Edges')!
    const block = () => {
      const geometry = new THREE.BoxGeometry(W, H, BLOCK, 32, 1, 1)
      geometry.translate(W / 2, 0, 0)
      // faces: fore-edge, spine side, head, tail, top, bottom
      const mesh = new THREE.Mesh(geometry, [edges, edges, edges, edges, paper, paper])
      mesh.castShadow = mesh.receiveShadow = true
      return mesh
    }

    // Back half: back board, the pages at the back of the book, and the spine. Pivots at the hinge
    // so the open book can settle into a shallow V.
    const back = part('Cover_Back')
    const right = block()
    right.position.z = BLOCK / 2 - HINGE_Z
    const spine = part('Spine')

    // Open, the halves of the book part slightly at the spine. In a real book you'd see the spine's
    // leather down in that gap, so lay a strip of it under the gutter (it only shows through the gap).
    let leather: THREE.Material | undefined
    spine.placed.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh) leather ??= [mesh.material].flat().find((m) => m.name === 'Burgundy_Leather')
    })
    const gutter = new THREE.Mesh(new THREE.BoxGeometry(0.014, H + 2 * OVERHANG, 0.006), leather)
    gutter.position.z = -0.0015
    gutter.receiveShadow = true

    // Front half, relative to the hinge: the front board and the pages at the front of the book.
    const front = part('Cover_Front')
    const frontTop = 2 * BLOCK + LEAVES * GAP + BOARD - HINGE_Z // the cover's outer face, from the hinge
    const left = block()
    left.position.z = 1.5 * BLOCK + LEAVES * GAP - HINGE_Z

    // gold-foil title in the blank centre of the cover
    const titleW = 0.13
    const titleImage = textures.title.image as HTMLCanvasElement
    const title = new THREE.Mesh(
      new THREE.PlaneGeometry(titleW, (titleW * titleImage.height) / titleImage.width),
      new THREE.MeshStandardMaterial({ map: textures.title, alphaTest: 0.4, metalness: 0.85, roughness: 0.38 }),
    )
    title.position.set((W + OVERHANG) / 2, 0, frontTop + 0.0002)

    // the first left page, on the inside of the front pages (faces away while closed)
    const inside = new THREE.Mesh(
      new THREE.PlaneGeometry(W, H, 32, 1),
      new THREE.MeshStandardMaterial({ map: textures.insideCover, roughness: 0.9 }),
    )
    inside.rotation.y = Math.PI
    inside.position.set(W / 2, 0, BLOCK + LEAVES * GAP - HINGE_Z - 0.0002)
    inside.receiveShadow = true

    return {
      back: back.placed,
      right,
      spine: spine.placed,
      gutter,
      front: front.placed,
      left,
      title,
      inside,
      bend: {
        right: bendable(right),
        left: bendable(left),
        inside: bendable(inside),
        spine: bendable(spine.placed),
        last: -1,
      },
    }
  }, [model, textures])

  /**
   * Shape the shell for how open the book is (0..1): the page blocks sink into the
   * gutter, and the spine unrolls so it never cuts through the pages. Closed, it's all square.
   */
  const settle = (open: number) => {
    const bend = parts.bend
    if (Math.abs(bend.last - open) < 1e-5) return
    bend.last = open
    const each = (meshes: typeof bend.right, move: (x: number, y: number, z: number) => [number, number, number]) => {
      for (const { geometry, rest } of meshes) {
        const pos = geometry.attributes.position as THREE.BufferAttribute
        for (let i = 0; i < pos.count; i++) {
          const [x, y, z] = move(rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2])
          pos.setXYZ(i, x, y, z)
        }
        pos.needsUpdate = true
        geometry.computeVertexNormals()
      }
    }
    // Back pages: the top sinks toward the spine; the bottom stays on the board.
    each(bend.right, (x, y, z) => [x, y, z - dip(x, open) * ((z + BLOCK / 2) / BLOCK)])
    // Front pages lie upside down while closed, so their "top" is their underside here.
    each(bend.left, (x, y, z) => [x, y, z + dip(x, open) * ((BLOCK / 2 - z) / BLOCK)])
    // The first page sits on that underside (the plane is turned round: its x and z run backwards).
    each(bend.inside, (x, y, z) => [x, y, z - dip(W / 2 - x, open)])
    // The spine (in the model's frame: x outward from the hinge, y through the book) keeps its back
    // edge fixed and gathers toward it as the front board swings away.
    each(bend.spine, (x, y, z) => {
      const r = Math.hypot(x, y)
      let a = Math.atan2(y, x)
      if (a < 0) a += 2 * Math.PI // 90° (front edge) … 270° (back edge)
      const gathered = (3 * Math.PI) / 2 - ((3 * Math.PI) / 2 - a) * (1 - open)
      return [r * Math.cos(gathered), r * Math.sin(gathered), z]
    })
  }

  // ---- the leaves: bendable planes, printed on both sides
  const leaves = useMemo(
    () =>
      Array.from({ length: LEAVES }, (_, k) => {
        const j = k + 1
        const geometry = new THREE.PlaneGeometry(W, H, 48, 12)
        geometry.translate(W / 2, 0, 0)
        const pos = geometry.attributes.position
        const u = Float32Array.from({ length: pos.count }, (_, i) => pos.getX(i))
        const v = Float32Array.from({ length: pos.count }, (_, i) => pos.getY(i) / H + 0.5)
        const front = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({ map: textures.pages[j].front, roughness: 0.9, side: THREE.FrontSide }),
        )
        const back = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({ map: textures.pages[j].back, roughness: 0.9, side: THREE.BackSide }),
        )
        for (const m of [front, back]) {
          m.castShadow = true
          m.receiveShadow = true
        }
        const group = new THREE.Group()
        group.add(front, back)
        return { j, group, geometry, u, v, last: -1 }
      }),
    [textures],
  )

  /** Bend leaf `j` to turn-progress `p`, in a book that is `open` (0..1) open. */
  const shape = (leaf: (typeof leaves)[number], p: number, open: number) => {
    const key = p + open * 10
    if (Math.abs(leaf.last - key) < 1e-5) return
    leaf.last = key
    const c = curlAt(p, open)
    const base = zRight(leaf.j) + (zLeft(leaf.j) - zRight(leaf.j)) * p
    // a page lying on either side sinks into the gutter; one lifted mid-turn doesn't
    const resting = 1 - Math.sin(Math.PI * p)
    const pos = leaf.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const [x, z] = pagePoint(leaf.u[i], W, leaf.v[i], c)
      pos.setX(i, x)
      pos.setZ(i, base + z - dip(x, open) * resting)
    }
    pos.needsUpdate = true
    leaf.geometry.computeVertexNormals()
    leaf.geometry.computeBoundingSphere()
  }

  // ---- motion: each leaf (index 0 = cover) springs toward turned (1) or not (0)
  const progress = useRef(new Float32Array(LEAVES + 1).map((_, i) => (i < turnedCount(spread) ? 1 : 0)))
  const velocity = useRef(new Float32Array(LEAVES + 1))
  /**
   * When a step turns many leaves at once (the flipbook, or starting over), each waits
   * its turn: the time it's released, and how briskly it then swings.
   */
  const release = useRef(new Float64Array(LEAVES + 1))
  const stiffness = useRef(new Float32Array(LEAVES + 1).map((_, i) => (i === 0 ? 14 : 15)))
  const turnedBefore = useRef(turnedCount(spread))
  // Plan the riffle the moment the spread changes, before any frame can start every leaf at once.
  if (turnedBefore.current !== turnedCount(spread)) {
    const from = turnedBefore.current
    const to = turnedCount(spread)
    turnedBefore.current = to
    const now = performance.now() / 1000
    for (let i = 0; i <= LEAVES; i++) stiffness.current[i] = i === 0 ? 14 : 15
    for (const [i, plan] of riffle(from, to)) {
      release.current[i] = now + plan.delay
      stiffness.current[i] = plan.stiffness
    }
  }
  const spreadRef = useRef(spread)
  spreadRef.current = spread
  /**
   * A pointer press in progress. `dir` is which way it's going (0 = not yet known, on a phone),
   * and `leaf` the page it's turning, or null when it only moves the view (or is a tap).
   */
  const drag = useRef<{ dir: -1 | 0 | 1; leaf: number | null; startX: number; p: number; moved: boolean } | null>(null)
  const latest = useRef({ onPageTap, paused, single, view })
  latest.current = { onPageTap, paused, single, view }

  const cover = useRef<THREE.Group>(null)
  const backHalf = useRef<THREE.Group>(null)

  // camera aim: on the closed book, sliding to the centre of the spread as it opens
  const tilt = 0.4
  const target = useMemo(() => new THREE.Vector3(), [])

  // a new spread, page in view, layout or textures means there's motion to draw
  useEffect(() => invalidate(), [spread, view, single, textures, invalidate])

  // The camera's aim and how much it takes in, eased toward where they should be.
  const framing = useRef({ x: W / 2, width: W + OVERHANG, vx: 0, vw: 0, placed: false })

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const p = progress.current
    const vel = velocity.current
    let moving = drag.current !== null
    const now = performance.now() / 1000
    const turned = turnedCount(spreadRef.current)
    for (let i = 0; i <= LEAVES; i++) {
      const d = drag.current
      if (d && d.leaf === i) {
        p[i] = d.p
        vel[i] = 0
        continue
      }
      if (now < release.current[i]) {
        moving = true // waiting its turn in a riffle
        continue
      }
      const goal = i < turned ? 1 : 0
      const k = stiffness.current[i] // pages settle unhurried; the heavy cover a touch slower still
      vel[i] += (k * (goal - p[i]) - 2 * Math.sqrt(k) * vel[i]) * dt
      p[i] = Math.min(1, Math.max(0, p[i] + vel[i] * dt))
      if (Math.abs(goal - p[i]) < 1e-4 && Math.abs(vel[i]) < 1e-3) {
        p[i] = goal
        vel[i] = 0
      } else moving = true
    }
    if (moving) invalidate()

    // Open, each half of the book tilts up a little from the spine, so it sits in a shallow V.
    const open = p[0]
    cover.current!.rotation.y = -(Math.PI - REST_TILT) * open
    backHalf.current!.rotation.y = -REST_TILT * open
    parts.spine.visible = open < 0.98 // fully open, the spine has gathered to nothing underneath…
    parts.gutter.visible = open > 0.6 // …and this strip of leather fills the gutter instead
    settle(open)
    for (const leaf of leaves) shape(leaf, p[leaf.j], open)

    // Frame the book: just the cover when closed; open, the whole spread, or (on a phone) the page in view.
    const cam = camera as THREE.PerspectiveCamera
    const goalX = single ? (spread === 0 ? W / 2 : view === 'left' ? -W / 2 : W / 2) : (W / 2) * (1 - open)
    // (a single page fills a phone's width; the closed book gets a little margin)
    const goalWidth = single ? (W + OVERHANG) * (spread === 0 ? 1.14 : 1.06) : (W + OVERHANG) * (1 + open) * 1.12
    const f = framing.current
    if (!f.placed) {
      // start already framed (e.g. when a link opens the book at a particular page)
      Object.assign(f, { x: goalX, width: goalWidth, placed: true })
    }
    for (const [key, vel, goal] of [['x', 'vx', goalX], ['width', 'vw', goalWidth]] as const) {
      f[vel] += (50 * (goal - f[key]) - 2 * Math.sqrt(50) * f[vel]) * dt // a quick, smooth glide
      f[key] += f[vel] * dt
      if (Math.abs(goal - f[key]) > 1e-5 || Math.abs(f[vel]) > 1e-4) invalidate()
      else [f[key], f[vel]] = [goal, 0]
    }
    const width = f.width
    // extra headroom: a turning page rises off the book toward the reader
    const height = (H + 2 * OVERHANG) * Math.cos(tilt) * 1.55
    const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)
    const dist = Math.max(height / 2 / tanV, width / 2 / (tanV * (size.width / size.height)))
    // aimed a little below centre, so the book sits slightly high, clear of the hint text
    target.set(f.x, -0.012, HINGE_Z)
    cam.position.set(target.x, target.y - Math.sin(tilt) * dist, target.z + Math.cos(tilt) * dist)
    cam.lookAt(target)
  })

  // ---- input: drag or tap a page; ← → keys
  useEffect(() => {
    const el = gl.domElement
    const screenX = (x: number) => {
      const v = new THREE.Vector3(x, 0, HINGE_Z).project(camera)
      return ((v.x + 1) / 2) * el.clientWidth + el.getBoundingClientRect().left
    }
    const place = () => ({ spread: spreadRef.current, view: latest.current.view })
    /**
     * The physical leaf a finger lifts when turning story leaf j: going forward, j itself;
     * going back, the topmost leaf on the left (the last flipbook page, coming back from
     * the spread after the flipbook).
     */
    const physicalTurned = (j: number, dir: number) => (dir > 0 ? physical(j) : turnedCount(j + 1) - 1)

    const down = (e: PointerEvent) => {
      if (latest.current.paused) return
      const { single } = latest.current
      const s = spreadRef.current
      // Wide screens: which side you press says which way (right page forward, left page back).
      // Phones: the direction of the swipe says, so wait for it.
      const dir: -1 | 0 | 1 = single ? 0 : s === 0 || e.clientX > screenX(0) ? 1 : -1
      const turnedLeaf = dir ? leafTurnedBy(place(), dir, single) : null
      const leaf = turnedLeaf === null ? null : physicalTurned(turnedLeaf, dir)
      if (dir === -1 && leaf === null) return // nothing to go back to
      el.setPointerCapture(e.pointerId)
      drag.current = { dir, leaf, startX: e.clientX, p: dir < 0 ? 1 : 0, moved: false }
      if (leaf !== null) progress.current[leaf] = drag.current.p
      invalidate()
    }
    const move = (e: PointerEvent) => {
      const d = drag.current
      if (!d) return
      const dx = e.clientX - d.startX
      if (Math.abs(dx) > 6) d.moved = true
      if (d.moved && d.dir === 0) {
        // a phone swipe: leftward goes forward, rightward goes back
        d.dir = dx < 0 ? 1 : -1
        const turnedLeaf = leafTurnedBy(place(), d.dir, true)
        d.leaf = turnedLeaf === null ? null : physicalTurned(turnedLeaf, d.dir)
        d.p = d.dir < 0 ? 1 : 0
        if (d.leaf !== null) progress.current[d.leaf] = d.p
      }
      if (d.leaf === null) return
      // How far a finger travels to turn a page all the way: well over a page's width, so the
      // page follows the finger calmly rather than flipping at the slightest movement.
      const span = (latest.current.single ? 1.7 : 2.8) * Math.abs(screenX(W) - screenX(0))
      d.p = d.dir > 0 ? Math.min(1, Math.max(0, -dx / span)) : Math.min(1, Math.max(0, 1 - dx / span))
      invalidate()
    }
    /** Where on the open right-hand page a pointer is, as texture coordinates, if it's over it. */
    const raycaster = new THREE.Raycaster()
    const pageUv = (e: PointerEvent) => {
      const s = spreadRef.current
      const page = leaves[physical(s) - 1]?.group.children[0] // the front of story leaf s is the right-hand page
      if (!page) return null
      const rect = el.getBoundingClientRect()
      const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      return raycaster.intersectObject(page, false)[0]?.uv ?? null
    }
    const up = (e: PointerEvent) => {
      const d = drag.current
      if (!d) return
      drag.current = null
      invalidate()
      if (!d.moved) {
        // A tap on something printed on the page (the video, the registry) does that…
        if (spreadRef.current > 0 && d.dir >= 0) {
          const uv = pageUv(e)
          if (uv && latest.current.onPageTap?.(uv.x, uv.y)) return
        }
        // …otherwise it moves on (on a phone, a tap always goes forward).
        onStep(d.dir === -1 ? -1 : 1)
        return
      }
      if (d.dir === 0) return
      if (d.leaf !== null) {
        // a drag turns the page once it's lifted a little way; otherwise the page falls back
        if (d.dir > 0 ? d.p > 0.1 : d.p < 0.9) onStep(d.dir)
      } else if (Math.abs(e.clientX - d.startX) > 24) onStep(d.dir) // a swipe across to the other page
    }
    const key = (e: KeyboardEvent) => {
      if (latest.current.paused) return
      if (e.key === 'ArrowRight') onStep(1)
      if (e.key === 'ArrowLeft') onStep(-1)
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    window.addEventListener('keydown', key)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      window.removeEventListener('keydown', key)
    }
  }, [gl, camera, onStep, invalidate, leaves])

  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[-0.18, 0.28, 0.55]}
        intensity={1.7}
        color="#fff3dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.0015}
        shadow-camera-left={-0.3}
        shadow-camera-right={0.3}
        shadow-camera-top={0.3}
        shadow-camera-bottom={-0.3}
        shadow-camera-near={0.1}
        shadow-camera-far={1.5}
      />

      {/* back half: board, back pages and spine, pivoting at the hinge */}
      <group ref={backHalf} position={[0, 0, HINGE_Z]}>
        <primitive object={parts.back} />
        <primitive object={parts.right} />
        <primitive object={parts.spine} />
      </group>
      <primitive object={parts.gutter} />

      {/* front half: board (with its title) and front pages, swinging on the hinge */}
      <group ref={cover} position={[0, 0, HINGE_Z]}>
        <primitive object={parts.front} />
        <primitive object={parts.title} />
        <primitive object={parts.left} />
        <primitive object={parts.inside} />
      </group>

      {leaves.map((l) => (
        <primitive key={l.j} object={l.group} />
      ))}
    </>
  )
}
