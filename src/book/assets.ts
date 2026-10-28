/**
 * The commissioned book model and its paper. Drop a replacement .glb in
 * public/media/book/ with meshes named Cover_Front, Cover_Back, Spine and
 * PageBlock (lying flat, Y-up, spine along Z at x = 0) and it's used as-is.
 */
const base = `${import.meta.env?.BASE_URL ?? '/'}media/book/`
export const BOOK_MODEL = `${base}book.glb`
export const PAPER = `${base}paper.jpg`
