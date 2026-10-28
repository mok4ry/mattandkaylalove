# The Mokary Tales

A 3D storybook for sharing our baby news. Open the book, turn its pages, watch the reveal.

```
cover → once → expecting → reveal → boy → finale
```

## Getting started

```sh
npm install
npm run dev          # http://localhost:5173
npm run share        # production build on your Wi-Fi (prints the address to open on a phone)
```

## Reading the book

- **Open the book:** tap it, or press →.
- **Turn pages:** drag a page across, or tap the right page (forward) or the left page (back). The arrow keys work too. Going back from the first spread closes the book, and **Start over** closes it from anywhere.
- **On a phone held upright,** one page shows at a time, at full size. Swipe left (or tap) to move to the right page; swipe again and the page turns while the view glides back to the new left page. Swiping right does the same in reverse, and from the first page it closes the book. The rules live in `src/book/navigation.ts`.
- **The flipbook:** turning past "Once upon a time" riffles through a stack of extra pages. The letters of "We're expecting!" jump about across them and settle onto the real page. The frames are painted by `paintFlipFrame` in `src/book/textures.ts`.
- **The reveal:** tap the video still on the reveal page to watch it large. When it ends, the book turns to "It's a boy!" by itself.
- **The registry:** once `finale.registry.url` is set, tap the registry card to open it.
- **Help text** fades in under the book only if nobody touches anything for 10 seconds. **Start over** appears on the last page.
- **Without a mouse or touch:** Tab reveals buttons for every action, and screen readers get the words of each spread.

## Changing words, pictures and links

Everything readers see comes from **`src/content.ts`**: the words, the registry link, an optional due date, and the paths to these media files:

| What | File |
| --- | --- |
| Photo on the first spread | `public/media/once.jpg` |
| Reveal video (H.264 MP4) and the still shown before it plays | `public/media/reveal.mp4`, `public/media/reveal-poster.jpg` |
| The book model and its paper | `public/media/book/book.glb`, `public/media/book/paper.jpg` |

Files in `public/media` are sized and compressed for fast loading; the full-quality originals are kept in `assets-src/`. After replacing the book model there, run `npm run optimize:book` to compress it (about 1.6 MB down to 450 KB). Keep new photos at roughly 900 px on their long side.

The colours live at the top of `src/styles.css` (the page) and in `src/book/textures.ts` (what's printed on the pages).

## Iterating quickly

- **Jump to any page:** `?scene=reveal` (or `cover`, `once`, `expecting`, `boy`, `finale`).
- **Dev scene picker:** in `npm run dev` there's a small bar in the bottom-left; `[` and `]` step through scenes.
- **Reorder or add spreads:** change `SCENES` in `src/story.ts`, add what's printed on the new pages in `src/book/textures.ts`, and add its words to `src/book/transcript.ts`.

## Where things live

| Path | What |
| --- | --- |
| `src/App.tsx` | The page: the 3D book, the video player, buttons and screen-reader text |
| `src/book/Book3D.tsx` | The book in three.js: model parts, turning leaves, lighting, camera, touch and keys |
| `src/book/curl.ts` | Page-bend math: the curl of a turning page, the V of an open book, the dip into the gutter |
| `src/book/textures.ts` | Paints each page and the cover title onto canvases |
| `src/book/layout.ts` | The physical pages: the flipbook pages bound in after the first spread (`FLIPS` sets how many) and the riffle's pacing |
| `src/book/navigation.ts` | What each step forward or back does: turn a page, or (on phones) move to the other page |
| `src/book/hotspots.ts` | Spots on a page that do something when tapped (the video still, the registry card) |
| `src/art/` | Hand-drawn SVG clip art |

To swap in a different book model, keep its part names (`Cover_Front`, `Cover_Back`, `Spine`, `PageBlock`), lying flat (Y-up) with the spine along the Z axis at x = 0.

## Tests

```sh
npm test             # unit tests: page-bend math, navigation, tap targets, scene order (~1s)
npm run e2e          # Playwright: reading the whole book by tap, drag, swipe, keys and screen-reader controls, on wide screens and phones
npm run typecheck
```

Playwright starts its own dev server on port 5199. On Macs it uses the GPU for WebGL. Where Playwright no longer ships Chromium for older macOS, it uses the newest one in its cache, or `PW_CHROMIUM_PATH`.

## Deploying

`npm run build` writes a static site to `dist/` for Netlify, Vercel, Cloudflare Pages, or GitHub Pages. For GitHub Pages under a sub-path, set `base` in `vite.config.ts`; media paths already respect it.
