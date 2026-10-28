/**
 * Paints every page (and the cover) onto canvases, which become textures on
 * the 3D book. Copy comes from content.ts and the clip art from src/art,
 * so the 3D book tells exactly the same story as the 2D one.
 */
import { createElement, type ComponentType, type SVGProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Castle, Cloud, Crown, Envelope, Flourish, Gift, Moon, Sparkle, Star } from '../art'
import { content } from '../content'
import { PAPER } from './assets'
import { FLIPS } from './layout'
import { REGISTRY_CARD, VIDEO_STILL } from './hotspots'
import type { SceneId } from '../story'

/** Page canvases are 3:4, like the pages. */
export const PAGE_PX = { w: 768, h: 1024 }

const C = {
  parchment: '#f7eedb',
  parchmentDeep: '#ecdcb8',
  ink: '#3b2f2a',
  inkSoft: '#8a7560',
  gold: '#c9a24a',
  goldSoft: '#ead08a',
  goldDeep: '#a37f2c',
  leather: '#9a4553',
  leatherDeep: '#561d28',
  night: '#4b5a9e',
  night3: '#9aa6dc',
  boy: '#6f9fd8',
  boyDeep: '#34609e',
}
const DISPLAY = '"IM Fell English", Georgia, serif'
const BODY = '"Cormorant Garamond", Georgia, serif'
const SCRIPT = '"Pinyon Script", "Snell Roundhand", cursive'

type Ctx = CanvasRenderingContext2D
type Side = 'left' | 'right'

function canvas(w = PAGE_PX.w, h = PAGE_PX.h) {
  const el = document.createElement('canvas')
  el.width = w
  el.height = h
  return { el, ctx: el.getContext('2d')! }
}

/** Deterministic noise so pages look identical on every load. */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

/** Render one of our SVG clip-art components to an image the canvas can draw. */
type Art = ComponentType<SVGProps<SVGSVGElement> & { jewel?: string }>
const artCache = new Map<Art, Map<string, Promise<HTMLImageElement>>>()
function art(Component: Art, props: Record<string, string> = {}): Promise<HTMLImageElement> {
  if (!artCache.has(Component)) artCache.set(Component, new Map())
  const cache = artCache.get(Component)!
  const key = JSON.stringify(props)
  if (!cache.has(key)) {
    const markup = renderToStaticMarkup(createElement(Component, { xmlns: 'http://www.w3.org/2000/svg', ...props }))
    const img = new Image()
    const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img)
      img.onerror = reject
    })
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`
    cache.set(key, loaded)
  }
  return cache.get(key)!
}

/** Load a photo if it exists; resolves to null if it doesn't. */
function photo(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function draw(ctx: Ctx, Component: Art, x: number, y: number, w: number, h: number, props: Record<string, string> = {}) {
  ctx.drawImage(await art(Component, props), x, y, w, h)
}

let paperImage: Promise<HTMLImageElement | null> | null = null

/** The model's own paper texture, so printed pages match its page block. */
async function paper(ctx: Ctx, side: Side, seed: number) {
  const { w, h } = PAGE_PX
  paperImage ??= photo(PAPER)
  const img = await paperImage
  if (img) {
    // offset per page so neighbouring pages don't share the same mottling
    const r = rng(seed)
    const size = Math.max(w, h)
    ctx.drawImage(img, -r() * 200, -r() * 200, size + 200, size + 200)
  } else {
    ctx.fillStyle = C.parchment
    ctx.fillRect(0, 0, w, h)
  }
  // a gentle vignette toward the edges
  const vignette = ctx.createRadialGradient(w * 0.45, h * 0.4, w * 0.3, w * 0.5, h * 0.5, w * 0.95)
  vignette.addColorStop(0, 'rgba(236, 220, 184, 0)')
  vignette.addColorStop(1, 'rgba(214, 192, 150, 0.35)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)
  // shadow where the page curves into the spine
  const spineX = side === 'right' ? 0 : w
  const gutter = ctx.createLinearGradient(spineX, 0, side === 'right' ? 90 : w - 90, 0)
  gutter.addColorStop(0, 'rgba(90, 60, 30, 0.32)')
  gutter.addColorStop(1, 'rgba(90, 60, 30, 0)')
  ctx.fillStyle = gutter
  ctx.fillRect(0, 0, w, h)
}

/** Word-wrap `text` into lines no wider than `width(lineIndex)`. A "\n" in the text always starts a new line. */
function wrap(ctx: Ctx, text: string, width: (line: number) => number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(' ')) {
      const attempt = line ? `${line} ${word}` : word
      if (line && ctx.measureText(attempt).width > width(lines.length)) {
        lines.push(line)
        line = word
      } else line = attempt
    }
    lines.push(line)
  }
  return lines
}

type TextOpts = { font: string; color: string; y: number; lineHeight: number; maxWidth?: number }
/** Centred, wrapped text. Returns the y just below the last line. */
function text(ctx: Ctx, str: string, { font, color, y, lineHeight, maxWidth = PAGE_PX.w - 180 }: TextOpts) {
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const lines = wrap(ctx, str, () => maxWidth)
  lines.forEach((l, i) => ctx.fillText(l, PAGE_PX.w / 2, y + i * lineHeight))
  return y + (lines.length - 1) * lineHeight
}

function pageNumber(ctx: Ctx, n: number) {
  ctx.font = `34px ${DISPLAY}`
  ctx.fillStyle = C.inkSoft
  ctx.textAlign = 'center'
  ctx.fillText(`~ ${n} ~`, PAGE_PX.w / 2, PAGE_PX.h - 46)
}

function card(ctx: Ctx, x: number, y: number, w: number, h: number, tilt: number) {
  ctx.save()
  ctx.translate(x + w / 2, y + h / 2)
  ctx.rotate(tilt)
  ctx.shadowColor = 'rgba(59, 47, 42, 0.22)'
  ctx.shadowBlur = 24
  ctx.shadowOffsetY = 10
  ctx.fillStyle = '#fffaf0'
  ctx.beginPath()
  ctx.roundRect(-w / 2, -h / 2, w, h, 22)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.strokeStyle = 'rgba(163, 127, 44, 0.4)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()
}

/**
 * One baby footprint, centred at (x, y) and pointing up the page: a little sole with a
 * round heel, a narrow arch and a wide ball, and five toes, the big toe on the inner side.
 * Stamped in soft ink, with paper showing through like a real print.
 */
function footprint(ctx: Ctx, x: number, y: number, angle: number, right: boolean, seed: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.scale(right ? 1.25 : -1.25, 1.25) // a left foot is a right foot, mirrored
  const sole = new Path2D()
  sole.moveTo(2, 118)
  sole.bezierCurveTo(-34, 120, -38, 72, -28, 34) // heel up the inner side…
  sole.bezierCurveTo(-20, 4, -50, -22, -46, -56) // …in at the arch, out to the ball
  sole.bezierCurveTo(-42, -80, 36, -84, 46, -58) // across the ball
  sole.bezierCurveTo(54, -24, 44, 22, 38, 62) // down the outer edge
  sole.bezierCurveTo(34, 106, 28, 118, 2, 118)
  const toes: [number, number, number][] = [
    [-29, -106, 14.5], // big toe
    [-4, -117, 10],
    [16, -114, 9],
    [34, -104, 7.5],
    [48, -88, 6.5],
  ]
  const shape = new Path2D(sole)
  for (const [tx, ty, r] of toes) {
    shape.moveTo(tx + r, ty) // each toe its own shape, not joined to the last
    shape.ellipse(tx, ty, r, r * 1.15, 0, 0, Math.PI * 2)
  }
  ctx.fillStyle = 'rgba(154, 69, 83, 0.82)'
  ctx.fill(shape)
  // paper showing through the ink
  ctx.clip(shape)
  const r = rng(seed)
  ctx.fillStyle = 'rgba(247, 238, 219, 0.35)'
  for (let i = 0; i < 260; i++) {
    ctx.beginPath()
    ctx.arc(-60 + r() * 120, -130 + r() * 255, 0.6 + r() * 1.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

type Painter = (ctx: Ctx) => Promise<void> | void
type Spread = { left: Painter; right: Painter }

/** What's printed on each page. Coordinates are on a 768 × 1024 page. */
const spreads: Record<Exclude<SceneId, 'cover'>, Spread> = {
  once: {
    left: (ctx) => {
      const { once } = content
      const x = 92
      const top = 330
      // illuminated drop cap
      ctx.fillStyle = '#f6e9c8'
      ctx.fillRect(x, top - 96, 150, 150)
      ctx.strokeStyle = C.gold
      ctx.lineWidth = 4
      ctx.strokeRect(x, top - 96, 150, 150)
      ctx.lineWidth = 2
      ctx.strokeRect(x + 9, top - 87, 132, 132)
      ctx.font = `150px ${DISPLAY}`
      ctx.fillStyle = C.leather
      ctx.textAlign = 'center'
      ctx.fillText(once.text[0], x + 75, top + 34)
      // the rest flows around it
      ctx.font = `58px ${DISPLAY}`
      ctx.fillStyle = C.ink
      ctx.textAlign = 'left'
      const full = PAGE_PX.w - x * 2
      const lines = wrap(ctx, once.text.slice(1), (i) => (i < 2 ? full - 172 : full))
      lines.forEach((l, i) => ctx.fillText(l, i < 2 ? x + 172 : x, top + i * 78))
    },
    right: async (ctx) => {
      // the photo, mounted like a picture in an old storybook: gold frame, slight tilt
      const img = await photo(content.once.image.src)
      if (img) {
        const box = { w: 560, h: 800 }
        const scale = Math.min(box.w / img.width, box.h / img.height)
        const [w, h] = [img.width * scale, img.height * scale]
        ctx.save()
        ctx.translate(PAGE_PX.w / 2, 470)
        ctx.rotate(0.012)
        ctx.shadowColor = 'rgba(59, 47, 42, 0.32)'
        ctx.shadowBlur = 26
        ctx.shadowOffsetY = 10
        const frame = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2)
        frame.addColorStop(0, C.goldSoft)
        frame.addColorStop(1, C.goldDeep)
        ctx.fillStyle = frame
        ctx.fillRect(-w / 2 - 14, -h / 2 - 14, w + 28, h + 28)
        ctx.shadowColor = 'transparent'
        ctx.drawImage(img, -w / 2, -h / 2, w, h)
        ctx.strokeStyle = 'rgba(255, 246, 221, 0.7)'
        ctx.lineWidth = 2
        ctx.strokeRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12)
        ctx.restore()
        return
      }
      await draw(ctx, Moon, 440, 150, 180, 180)
      await draw(ctx, Star, 200, 210, 54, 54, { color: C.gold })
      await draw(ctx, Star, 330, 330, 34, 34, { color: C.gold })
      await draw(ctx, Castle, 110, 470, 548, 330)
    },
  },
  expecting: {
    left: async (ctx) => {
      const { expecting } = content
      await draw(ctx, Cloud, 70, 80, 190, 90, { color: '#dfe8f4' })
      await draw(ctx, Star, 600, 120, 50, 50, { color: C.gold })
      const end = text(ctx, expecting.heading, { font: `86px ${DISPLAY}`, color: C.leather, y: 380, lineHeight: 100, maxWidth: 640 })
      ctx.save()
      ctx.translate(PAGE_PX.w / 2, end + 90)
      ctx.rotate(Math.PI / 4)
      ctx.drawImage(await art(Flourish, { color: C.gold }), -55, -55, 110, 110)
      ctx.restore()
      text(ctx, expecting.caption, { font: `italic 60px ${DISPLAY}`, color: C.inkSoft, y: end + 240, lineHeight: 70 })
    },
    right: async (ctx) => {
      // a pair of tiny footprints, stamped on the page as if in ink, walking up the page
      footprint(ctx, 300, 600, -0.2, false, 11)
      footprint(ctx, 468, 400, 0.14, true, 23)
      await draw(ctx, Sparkle, 560, 150, 40, 40, { color: C.gold })
      await draw(ctx, Star, 190, 300, 30, 30, { color: C.gold })
      await draw(ctx, Star, 590, 760, 26, 26, { color: C.goldSoft })
    },
  },
  reveal: {
    left: async (ctx) => {
      const crown = async (x: number, angle: number, jewel: string) => {
        ctx.save()
        ctx.translate(x, 250)
        ctx.rotate(angle)
        ctx.drawImage(await art(Crown, { jewel }), -90, -68, 180, 135)
        ctx.restore()
      }
      await crown(250, -0.17, C.boy)
      await crown(518, 0.17, '#d9a3a8')
      await draw(ctx, Sparkle, 359, 180, 50, 50, { color: C.gold })
      const end = text(ctx, content.reveal.heading, { font: `96px ${DISPLAY}`, color: C.leather, y: 450, lineHeight: 104, maxWidth: 560 })
      text(ctx, content.reveal.body, { font: `italic 54px ${BODY}`, color: C.ink, y: end + 115, lineHeight: 66, maxWidth: 540 })
    },
    right: async (ctx) => {
      // A still from the video; tapping it plays the video large, over the book.
      const { x, y, w, h } = VIDEO_STILL
      const frame = ctx.createLinearGradient(x, y, x + w, y + h)
      frame.addColorStop(0, C.goldSoft)
      frame.addColorStop(1, C.goldDeep)
      ctx.save()
      ctx.shadowColor = 'rgba(59, 47, 42, 0.3)'
      ctx.shadowBlur = 24
      ctx.shadowOffsetY = 10
      ctx.fillStyle = frame
      ctx.beginPath()
      ctx.roundRect(x - 14, y - 14, w + 28, h + 28, 18)
      ctx.fill()
      ctx.restore()
      ctx.save()
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, 8)
      ctx.clip()
      const still = await photo(content.reveal.poster)
      if (still) ctx.drawImage(still, x, y, w, h)
      else {
        ctx.fillStyle = C.night
        ctx.fillRect(x, y, w, h)
      }
      ctx.restore()
      // play button
      const [cx, cy] = [x + w / 2, y + h / 2]
      ctx.fillStyle = 'rgba(28, 35, 71, 0.72)'
      ctx.beginPath()
      ctx.arc(cx, cy, 62, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = C.goldSoft
      ctx.lineWidth = 5
      ctx.stroke()
      ctx.fillStyle = '#f7eedb'
      ctx.beginPath()
      ctx.moveTo(cx - 20, cy - 32)
      ctx.lineTo(cx + 34, cy)
      ctx.lineTo(cx - 20, cy + 32)
      ctx.closePath()
      ctx.fill()
      text(ctx, content.reveal.watch, { font: `64px ${DISPLAY}`, color: C.leather, y: y + h + 120, lineHeight: 70 })
    },
  },
  boy: {
    left: async (ctx) => {
      await draw(ctx, Crown, 244, 200, 280, 210, { jewel: C.boy })
      text(ctx, content.boy.heading, { font: `128px ${DISPLAY}`, color: C.boyDeep, y: 610, lineHeight: 130, maxWidth: 600 })
    },
    right: async (ctx) => {
      await draw(ctx, Moon, 264, 200, 240, 240)
      const end = text(ctx, content.boy.body, { font: `italic 60px ${BODY}`, color: C.ink, y: 590, lineHeight: 76, maxWidth: 540 })
      if (content.boy.due) text(ctx, content.boy.due, { font: `56px ${DISPLAY}`, color: C.boyDeep, y: end + 110, lineHeight: 64 })
    },
  },
  finale: {
    left: async (ctx) => {
      const { finale } = content
      const end = text(ctx, finale.heading, { font: `96px ${DISPLAY}`, color: C.leather, y: 200, lineHeight: 104, maxWidth: 520 })
      card(ctx, 84, end + 80, 600, 470, -0.035)
      await draw(ctx, Envelope, 319, end + 130, 130, 98)
      const t = text(ctx, finale.shower.title, { font: `62px ${DISPLAY}`, color: C.leather, y: end + 320, lineHeight: 70, maxWidth: 500 })
      text(ctx, finale.shower.body, { font: `italic 50px ${BODY}`, color: C.inkSoft, y: t + 80, lineHeight: 58, maxWidth: 500 })
    },
    right: async (ctx) => {
      const { finale } = content
      const { x, y, w, h } = REGISTRY_CARD
      card(ctx, x, y, w, h, 0.026)
      await draw(ctx, Gift, 319, 290, 130, 130)
      const t = text(ctx, finale.registry.title, { font: `62px ${DISPLAY}`, color: C.leather, y: 520, lineHeight: 70, maxWidth: 500 })
      text(ctx, finale.registry.url ? finale.registry.open : finale.registry.comingSoon, {
        font: `italic 50px ${BODY}`,
        color: C.inkSoft,
        y: t + 80,
        lineHeight: 58,
      })
    },
  },
}

/** Draw one page: paper, then its printing, then the page number (0 = no number). */
export async function paintPage(spread: Exclude<SceneId, 'cover'> | null, side: Side, number: number) {
  const { el, ctx } = canvas()
  await paper(ctx, side, number * 7 + (side === 'left' ? 1 : 2))
  if (spread) await spreads[spread][side](ctx)
  if (number) pageNumber(ctx, number)
  return el
}

/**
 * The title for the blank centre of the model's cover: gold on transparent,
 * laid over the leather like foil stamping.
 */
export async function paintCoverTitle(w: number, h: number) {
  const { el, ctx } = canvas(w, h)
  await draw(ctx, Moon, w / 2 - 70, h * 0.1, 140, 140)
  ctx.textAlign = 'center'
  ctx.fillStyle = C.gold
  // "The" small, then the name large, in a flowing script
  const [first, ...rest] = content.cover.title.split(' ')
  // fine script strokes are thickened with an outline of the same gold, like raised foil
  ctx.strokeStyle = C.gold
  ctx.lineJoin = 'round'
  const write = (str: string, x: number, y: number, weight: number) => {
    ctx.lineWidth = weight
    ctx.strokeText(str, x, y)
    ctx.fillText(str, x, y)
  }
  ctx.font = `110px ${SCRIPT}`
  write(first, w / 2, h * 0.36, 2.5)
  ctx.font = `176px ${SCRIPT}`
  const lines = wrap(ctx, rest.join(' '), () => w - 40)
  lines.forEach((l, i) => write(l, w / 2, h * 0.36 + 175 + i * 170, 4))
  const bottom = h * 0.36 + 175 + (lines.length - 1) * 170
  // a gold flourish under the name
  ctx.save()
  ctx.translate(w / 2, bottom + 70)
  ctx.rotate(Math.PI / 4)
  ctx.drawImage(await art(Flourish, { color: C.gold }), -60, -60, 120, 120)
  ctx.restore()
  await draw(ctx, Star, w / 2 - 110, bottom + 50, 36, 36, { color: C.gold })
  await draw(ctx, Star, w / 2 + 74, bottom + 50, 36, 36, { color: C.gold })
  return el
}

/**
 * The flipbook pages bound between the first spread and "Baby Mokary is on the way!".
 * The left-hand side of each flipbook page is one frame of an animation: the heading's
 * letters jumping about, settling a little more each frame, until they land on the
 * real left page. The right-hand sides carry only a few drifting stars. Painted
 * smaller than real pages: they flash past.
 */
const FLIP_SCALE = 0.6

/** Animation frames before the real page: the back of the page before the flipbook, then the back of each flipbook page but the last. */
export const FLIP_FRAMES = FLIPS

/** How unsettled frame `f` is: 1 = wildly scattered, 0 = at rest. */
const chaos = (f: number) => Math.max(0, (FLIP_FRAMES - f) / FLIP_FRAMES)

/** Paint flipbook page side `f`: on the left, animation frame f (0 … FLIP_FRAMES-1); on the right, just stars. */
export async function paintFlipFrame(side: Side, f: number) {
  const { el, ctx } = canvas(Math.round(PAGE_PX.w * FLIP_SCALE), Math.round(PAGE_PX.h * FLIP_SCALE))
  ctx.scale(FLIP_SCALE, FLIP_SCALE)
  await paper(ctx, side, 500 + f * 2 + (side === 'left' ? 1 : 0))
  const r = rng(1000 + f * 31 + (side === 'left' ? 0 : 17))
  const jitter = (amount: number) => (r() - 0.5) * 2 * amount
  const a = side === 'left' ? chaos(f) : 1

  // a few stars twinkling about (gathering in, on the left, as the letters settle)
  for (let i = 0; i < 6; i++) {
    const size = 26 + r() * 26
    await draw(ctx, i % 2 ? Star : Sparkle, 384 + jitter(330 * a + 60) - size / 2, 470 + jitter(420 * a + 120) - size / 2, size, size, {
      color: i % 2 ? C.gold : C.goldSoft,
    })
  }
  if (side === 'right') return el

  // the heading laid out exactly as on the real page, each letter knocked out of place
  // (same size and spacing as the real page, so the letters settle exactly where it prints them)
  ctx.font = `86px ${DISPLAY}`
  ctx.fillStyle = C.leather
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const lines = wrap(ctx, content.expecting.heading, () => 640)
  lines.forEach((line, li) => {
    let x = PAGE_PX.w / 2 - ctx.measureText(line).width / 2
    const y = 380 + li * 100
    for (const ch of line) {
      const cw = ctx.measureText(ch).width
      ctx.save()
      ctx.translate(x + cw / 2 + jitter(250 * a), y - 34 + jitter(330 * a))
      ctx.rotate(jitter(1.5 * a))
      const scale = 1 + jitter(0.7 * a)
      ctx.scale(scale, scale)
      ctx.fillText(ch, -cw / 2, 34)
      ctx.restore()
      x += cw
    }
  })
  return el
}

/** Wait for the storybook fonts, so text isn't painted in a fallback face. */
export async function fontsReady() {
  await Promise.all([
    document.fonts.load(`64px ${DISPLAY}`),
    document.fonts.load(`64px ${SCRIPT}`),
    document.fonts.load(`italic 64px ${DISPLAY}`),
    document.fonts.load(`italic 56px ${BODY}`),
  ]).catch(() => {})
}
