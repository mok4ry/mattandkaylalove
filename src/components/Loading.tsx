import { Sparkle } from '../art'
import { content } from '../content'

/**
 * "Opening the storybook…", for a slow first load. It only fades in if loading
 * is still going on after a moment (counted from when the page started loading),
 * so fast loads never see it flash.
 */
export function Loading({ done = false }: { done?: boolean }) {
  const delay = Math.max(0, 500 - performance.now())
  return (
    <div
      className={`loading${done ? ' is-done' : ''}`}
      role="status"
      aria-live="polite"
      aria-hidden={done}
      style={{ animationDelay: `${delay}ms` }}
      data-testid="loading"
    >
      <div className="loading-stars" aria-hidden>
        <Sparkle />
        <Sparkle />
        <Sparkle />
      </div>
      <p>{content.loading}</p>
    </div>
  )
}
