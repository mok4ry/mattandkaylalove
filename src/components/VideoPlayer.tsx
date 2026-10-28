import { useEffect, type Ref } from 'react'
import { createPortal } from 'react-dom'
import { content } from '../content'

const { reveal } = content

type Props = {
  ref: Ref<HTMLVideoElement>
  /** Shown over the book. While hidden it stays mounted, so a tap can start it immediately. */
  open: boolean
  onClose: () => void
  onEnded: () => void
}

/**
 * The reveal video, large, over the book. It's mounted (hidden) for as long as
 * the reveal spread is open: phones only allow sound when play() comes straight
 * from a tap, so the tap has to find the video already there.
 */
export function VideoPlayer({ ref, open, onClose, onEnded }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return createPortal(
    <div
      className={`player${open ? ' is-open' : ''}`}
      role="dialog"
      aria-label={reveal.label}
      aria-hidden={!open}
      inert={!open}
      data-testid="player"
    >
      <div className="player-frame">
        <video
          ref={ref}
          src={reveal.video}
          poster={reveal.poster}
          aria-label={reveal.label}
          controls
          playsInline
          preload="metadata"
          onEnded={onEnded}
        />
      </div>
      <button type="button" className="player-close" onClick={onClose}>
        {reveal.close} <span aria-hidden>✕</span>
      </button>
    </div>,
    document.body,
  )
}
