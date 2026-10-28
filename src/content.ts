/**
 * Every word, link, and media file in the story lives here.
 * Edit this file to change copy without touching any components.
 * Each open spread has a left and a right page.
 */
const media = (file: string) => `${import.meta.env?.BASE_URL ?? "/"}media/${file}`

export const content = {
  restart: 'Start over',
  /** Shown while the book loads, if it takes a moment. */
  loading: 'Opening the storybook…',
  book: {
    turn: 'Next page',
    back: 'Previous page',
    close: 'Close the book',
    /** Shown under the book. */
    hintClosed: 'Tap the book to open it',
    hintOpen: 'Drag a page across, or tap it',
    /** On phones, which show one page at a time. */
    hintSwipe: 'Swipe to turn the page',
  },
  cover: {
    title: 'The Mokary Tales',
    openLabel: 'Open the book',
  },
  once: {
    // left page
    text: 'Once upon a time, the Mokarys kept a big secret…',
    // right page — the photo at public/media/once.jpg (or change the path).
    image: { src: media('once.jpg'), alt: 'Matt and Kayla under an autumn tree' },
  },
  expecting: {
    // left page
    heading: "We're expecting!",
    caption: 'Love, Matt & Kayla',
    // right page: a pair of baby footprints (drawn in src/book/textures.ts)
  },
  reveal: {
    // left page
    heading: 'Prince or princess?',
    body: 'Every fairytale needs a hero, and ours is almost ready to be revealed…',
    // right page — the video (H.264 MP4 plays everywhere) and a still shown before it plays.
    // Tapping the still opens the video large, over the book; when it finishes, the page turns by itself.
    video: media('reveal.mp4'),
    poster: media('reveal-poster.jpg'),
    watch: 'Watch the reveal',
    close: 'Close',
    label: 'Our gender reveal video',
    missing: 'The reveal video is still being edited…',
  },
  boy: {
    // left page
    heading: "It's a boy!",
    // right page
    body: 'Our little prince is on his way.',
    // e.g. 'Arriving spring 2027' — leave empty to hide.
    due: '',
  },
  finale: {
    // left page
    heading: 'To be continued…',
    shower: {
      title: 'Shower invitation to follow',
      body: 'Keep an eye on your mailbox.',
    },
    // right page
    registry: {
      title: 'Preview the registry…',
      // Paste the registry link here — leave empty to show "coming soon".
      url: '',
      comingSoon: 'Link coming soon',
      /** Printed on the card once there's a link. */
      open: 'Tap to take a peek',
    },
  },
} as const

export type Content = typeof content
