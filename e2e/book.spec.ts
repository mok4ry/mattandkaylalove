import { expect, test, type Page } from '@playwright/test'
import { content } from '../src/content'
import { SCENES } from '../src/story'

// The storybook is a 3D book. These tests drive it by tapping, dragging and
// swiping the book itself, and through the keyboard/screen-reader controls that
// mirror every action. Wide screens show both pages; phones held upright show
// one page at a time.

const WIDE = { width: 1280, height: 720 }
const PHONE = { width: 390, height: 844 }

async function openBook(page: Page, path = '/') {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(path)
  await expect(page.locator('[data-ready]')).toBeAttached({ timeout: 60_000 })
  return { book: page.getByTestId('book'), errors }
}

const control = (page: Page, name: string | RegExp) => page.getByRole('navigation', { name: 'Book' }).getByRole('button', { name })

/** Use one of the keyboard controls the way a keyboard user would: focus it, press Enter. */
async function press(page: Page, name: string) {
  await control(page, name).focus()
  await page.keyboard.press('Enter')
}

/** Tap a point on the screen, as fractions of its width and height. */
const tap = (page: Page, x: number, y = 0.45) => {
  const { width, height } = page.viewportSize()!
  return page.mouse.click(width * x, height * y)
}

/** Drag horizontally from one point to another (fractions of the screen width). */
async function swipe(page: Page, fromX: number, toX: number) {
  const { width, height } = page.viewportSize()!
  await page.mouse.move(width * fromX, height * 0.5)
  await page.mouse.down()
  await page.mouse.move(width * toX, height * 0.5, { steps: 12 })
  await page.mouse.up()
}

/** Where the reader is, as "spread + page in view", e.g. "2 right" (or "2 both" on wide screens). */
const at = async (page: Page) => {
  const book = page.getByTestId('book')
  return `${await book.getAttribute('data-spread')} ${await book.getAttribute('data-view')}`
}

test('loads without errors and fits the screen', async ({ page }) => {
  const { errors } = await openBook(page)
  await expect(page.locator('.book-canvas canvas')).toBeVisible()
  expect(errors).toEqual([])
  const overflow = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('the help text stays hidden until the book is left alone for 10 seconds, then fades in', async ({ page }) => {
  test.slow()
  await openBook(page)
  const hint = page.getByTestId('hint')
  await page.waitForTimeout(8_000)
  await expect(hint).not.toHaveClass(/is-visible/)
  await expect(hint).toHaveClass(/is-visible/, { timeout: 5_000 })
  // any interaction hides it again and restarts the wait
  await page.keyboard.press('ArrowRight')
  await expect(hint).not.toHaveClass(/is-visible/)
})

test('the loading message clears once the book is ready', async ({ page }) => {
  await openBook(page)
  await expect(page.getByTestId('loading')).toHaveClass(/is-done/)
})

test('turning past the first spread riffles through the flipbook pages, then settles', async ({ page }) => {
  const { book } = await openBook(page, '/?scene=once')
  // (on a phone, the first press moves over to the right page, the second turns it)
  await page.keyboard.press('ArrowRight')
  if ((await book.getAttribute('data-view')) === 'right') await page.keyboard.press('ArrowRight')
  await expect(book).toHaveAttribute('data-scene', 'expecting')
  // the riffle takes a couple of seconds; the book carries on working throughout
  await page.waitForTimeout(3_000)
  await expect(page.getByTestId('transcript')).toContainText(content.expecting.heading)
})

test.describe('every scene can be opened directly, for quick checking', () => {
  for (const scene of SCENES) {
    test(scene, async ({ page }) => {
      const { book, errors } = await openBook(page, `/?scene=${scene}`)
      await expect(book).toHaveAttribute('data-scene', scene)
      expect(errors).toEqual([])
    })
  }
})

test.describe('on a wide screen, both pages show', () => {
  test.use({ viewport: WIDE })

  test('reads cover to finale, with the words of each spread for screen readers', async ({ page }) => {
    const { book } = await openBook(page)
    const transcript = page.getByTestId('transcript')
    await expect(transcript).toContainText(content.cover.title)
    await press(page, content.cover.openLabel)
    await expect(book).toHaveAttribute('data-scene', 'once')
    await expect(transcript).toContainText(content.once.text)
    for (const [scene, words] of [
      ['expecting', content.expecting.heading],
      ['reveal', content.reveal.heading],
      ['boy', content.boy.heading],
      ['finale', content.finale.heading],
    ] as const) {
      await press(page, content.book.turn)
      await expect(book).toHaveAttribute('data-scene', scene)
      await expect(transcript).toContainText(words)
    }
    await expect(control(page, content.book.turn)).toBeDisabled()
  })

  test('tap to open, tap the right page to turn, the left page to turn back', async ({ page }) => {
    const { book } = await openBook(page)
    await tap(page, 0.5)
    await expect(book).toHaveAttribute('data-spread', '1')
    await tap(page, 0.75)
    await expect(book).toHaveAttribute('data-spread', '2')
    await tap(page, 0.75)
    await expect(book).toHaveAttribute('data-spread', '3')
    await tap(page, 0.25)
    await expect(book).toHaveAttribute('data-spread', '2')
  })

  test('dragging a page across turns it; a short drag lets it fall back', async ({ page }) => {
    const { book } = await openBook(page, '/?scene=once')
    await swipe(page, 0.8, 0.76)
    await expect(book).toHaveAttribute('data-spread', '1')
    await swipe(page, 0.8, 0.2)
    await expect(book).toHaveAttribute('data-spread', '2')
  })

  test('arrow keys turn pages to the end, and back until the book closes', async ({ page }) => {
    const { book } = await openBook(page)
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight')
    await expect(book).toHaveAttribute('data-scene', 'finale')
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft')
    await expect(book).toHaveAttribute('data-scene', 'cover')
  })

  test('tapping the left page of the first spread closes the book', async ({ page }) => {
    const { book } = await openBook(page, '/?scene=once')
    await tap(page, 0.25)
    await expect(book).toHaveAttribute('data-scene', 'cover')
  })

  test('start over appears only on the last page, and closes the book', async ({ page }) => {
    const restart = page.getByRole('button', { name: new RegExp(content.restart) })
    await openBook(page, '/?scene=boy')
    await expect(restart).toHaveCount(0)
    const { book } = await openBook(page, '/?scene=finale')
    await restart.click()
    await expect(book).toHaveAttribute('data-scene', 'cover')
    await expect(restart).toHaveCount(0)
  })

  test('tapping the video still opens the reveal large, over the book', async ({ page }) => {
    const { book } = await openBook(page, '/?scene=reveal')
    const player = page.getByRole('dialog', { name: content.reveal.label })
    await expect(player).toBeHidden()
    await tap(page, 0.75, 0.42) // the still sits in the upper middle of the right-hand page
    await expect(player).toBeVisible()
    await expect(book).toHaveAttribute('data-scene', 'reveal') // the tap didn't turn the page
    const box = (await player.locator('video').boundingBox())!
    expect(box.width / WIDE.width).toBeGreaterThan(0.6)
    await page.keyboard.press('ArrowRight') // pages don't turn underneath the video
    await expect(book).toHaveAttribute('data-scene', 'reveal')
    await page.keyboard.press('Escape')
    await expect(player).toBeHidden()
  })
})

test.describe('on a phone held upright, one page shows at a time', () => {
  test.use({ viewport: PHONE })

  test('opening the book shows its left page', async ({ page }) => {
    await openBook(page)
    await tap(page, 0.5)
    await expect.poll(() => at(page)).toBe('1 left')
  })

  test('swiping left moves to the right page, then turns the page onto the next left page', async ({ page }) => {
    await openBook(page, '/?scene=once')
    expect(await at(page)).toBe('1 left')
    await swipe(page, 0.8, 0.2)
    await expect.poll(() => at(page)).toBe('1 right')
    await swipe(page, 0.8, 0.2)
    await expect.poll(() => at(page)).toBe('2 left')
    await swipe(page, 0.8, 0.2)
    await expect.poll(() => at(page)).toBe('2 right')
  })

  test('swiping right goes back the same way: left page, then the page turns back onto the right page', async ({ page }) => {
    await openBook(page, '/?scene=reveal')
    await swipe(page, 0.2, 0.8)
    await expect.poll(() => at(page)).toBe('2 right')
    await swipe(page, 0.2, 0.8)
    await expect.poll(() => at(page)).toBe('2 left')
    await swipe(page, 0.2, 0.8)
    await expect.poll(() => at(page)).toBe('1 right')
    await swipe(page, 0.2, 0.8)
    await expect.poll(() => at(page)).toBe('1 left')
    await swipe(page, 0.2, 0.8) // and back from the first page closes the book
    await expect.poll(() => at(page)).toBe('0 left')
  })

  test('a quarter-screen swipe turns the page; a nudge lets it fall back', async ({ page }) => {
    await openBook(page, '/?scene=reveal')
    await press(page, content.book.turn) // over to the right page
    await expect.poll(() => at(page)).toBe('3 right')
    await swipe(page, 0.7, 0.62)
    await page.waitForTimeout(500)
    expect(await at(page)).toBe('3 right')
    await swipe(page, 0.65, 0.4)
    await expect.poll(() => at(page)).toBe('4 left')
  })

  test('a short swipe changes nothing', async ({ page }) => {
    await openBook(page, '/?scene=reveal')
    await swipe(page, 0.8, 0.77)
    await expect.poll(() => at(page)).toBe('3 left')
  })

  test('the controls and arrow keys step page by page too', async ({ page }) => {
    await openBook(page, '/?scene=once')
    await press(page, content.book.turn)
    await expect.poll(() => at(page)).toBe('1 right')
    await page.keyboard.press('ArrowRight')
    await expect.poll(() => at(page)).toBe('2 left')
    await page.keyboard.press('ArrowLeft')
    await expect.poll(() => at(page)).toBe('1 right')
  })

  test('on the reveal, move to the right page and tap the still to watch', async ({ page }) => {
    const { book } = await openBook(page, '/?scene=reveal')
    const player = page.getByRole('dialog', { name: content.reveal.label })
    await swipe(page, 0.8, 0.2)
    await expect.poll(() => at(page)).toBe('3 right')
    await page.waitForTimeout(1200) // let the view settle on the page
    await tap(page, 0.5, 0.42)
    await expect(player).toBeVisible()
    await expect(book).toHaveAttribute('data-scene', 'reveal')
  })
})

test.describe('the reveal video', () => {
  test('when it ends, the book turns to the next page', async ({ page }) => {
    const { book } = await openBook(page, '/?scene=reveal')
    await press(page, content.reveal.watch)
    await page.getByRole('dialog', { name: content.reveal.label }).locator('video').dispatchEvent('ended')
    await expect(book).toHaveAttribute('data-scene', 'boy')
    await expect(page.getByTestId('falling-stars')).toBeAttached()
  })

  test('the video and its still are served', async ({ request }) => {
    for (const file of [content.reveal.video, content.reveal.poster, content.once.image.src]) {
      expect((await request.head(file)).ok(), file).toBe(true)
    }
  })
})
