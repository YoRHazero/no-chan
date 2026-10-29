import { useState } from 'react'
import { buttonImage } from '../no-chan/config'
import { usePeek } from './peek'

export type NooChanButtonProps = {
  /** The button's name: screen readers read it, and the browser shows it on hover. */
  label: string
  /** The button was clicked. The app opens what it stands for, such as NooChanDialog. */
  onClick: () => void
}

const { width, height, rest, raised, pressed } = buttonImage
/** Up a little past where it is going, then back: her head pops up. */
const pop = 'cubic-bezier(0.34, 1.56, 0.64, 1)'

// A <style> React hoists into <head> once, so the button needs no CSS import.
// The button is a window she is behind: its bottom edge is the one she hangs
// on, and nothing below it shows. It is 36px tall, as tall as the buttons
// beside it in noobenkyo, so she still fits inside a 1px border.
const css = `
.no-chan-button {
  position: relative;
  flex: none;
  box-sizing: border-box;
  width: ${width + 6}px;
  height: ${height + 2}px;
  padding: 0;
  border: var(--no-chan-button-border, none);
  border-radius: var(--no-chan-button-radius, 8px);
  overflow: hidden;
  vertical-align: middle;
  background: none;
  color: inherit;
  cursor: pointer;
}
.no-chan-button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
.no-chan-button img {
  position: absolute;
  left: calc(50% - ${width / 2}px);
  bottom: 0;
  width: ${width}px;
  height: ${height}px;
  pointer-events: none;
  user-select: none;
}
.no-chan-button-head {
  translate: 0 ${raised}px;
}
@media (prefers-reduced-motion: no-preference) {
  .no-chan-button-head {
    translate: 0 ${rest}px;
    transition: translate 0.3s ease-in-out;
  }
  .no-chan-peeking .no-chan-button-head {
    animation: no-chan-peek 2.2s;
  }
  .no-chan-button:hover:not(.no-chan-peeking) .no-chan-button-head {
    translate: 0 ${raised}px;
    transition: translate 0.35s ${pop};
  }
  .no-chan-button:active:not(.no-chan-peeking) .no-chan-button-head {
    translate: 0 ${pressed}px;
    transition: translate 0.08s ease-out;
  }
}
@keyframes no-chan-peek {
  0% {
    translate: 0 ${rest}px;
    animation-timing-function: ${pop};
  }
  20% {
    translate: 0 ${raised}px;
  }
  75% {
    translate: 0 ${raised}px;
    animation-timing-function: ease-in;
  }
  100% {
    translate: 0 ${rest}px;
  }
}
`

/**
 * A button she hangs on: her hands on its bottom edge, her head behind them.
 * Now and then her head comes up to look at the user and goes back down; it
 * comes up while the pointer is on the button and dips as it is pressed.
 * With reduced motion it stays up. The app draws its frame, if any, through
 * CSS variables it can set anywhere above it: `--no-chan-button-border` (a
 * `border` value, none if unset) and `--no-chan-button-radius` (8px).
 * The tip on hover is the browser's own
 * `title`, not one that opens on focus: NooChanDialog gives focus back to the
 * button as it closes, and such a tip would stay open.
 */
export function NooChanButton({ label, onClick }: NooChanButtonProps) {
  const [pointerOver, setPointerOver] = useState(false)
  const [peeking, endPeek] = usePeek(pointerOver)

  return (
    <>
      <style href="no-chan-button" precedence="no-chan">
        {css}
      </style>
      <button
        type="button"
        className={peeking ? 'no-chan-button no-chan-peeking' : 'no-chan-button'}
        aria-label={label}
        title={label}
        onClick={onClick}
        onPointerEnter={() => setPointerOver(true)}
        onPointerLeave={() => setPointerOver(false)}
      >
        <img
          className="no-chan-button-head"
          src={buttonImage.head}
          alt=""
          draggable={false}
          onAnimationEnd={(event) => {
            if (event.animationName === 'no-chan-peek') {
              endPeek()
            }
          }}
        />
        <img src={buttonImage.hands} alt="" draggable={false} />
      </button>
    </>
  )
}
