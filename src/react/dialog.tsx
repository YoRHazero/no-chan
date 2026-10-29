import { useEffect, useRef, type ReactNode } from 'react'
import { peekImage } from '../no-chan/config'

export type NooChanDialogProps = {
  /** Whether it is open. The app holds it, and opens it from NooChan's `onClick`. */
  open: boolean
  /** The user closed it (the home bar, Esc, or a click outside the phone); always with `false`. */
  onOpenChange: (open: boolean) => void
  /** What her phone's screen shows. It scrolls when it is taller than the screen. */
  children?: ReactNode
}

/** The phone's width at full size; it shrinks, all in proportion, to fit the window. */
const full = 360
const peekWidth = peekImage.width / full
/** How far she stands above the phone, per unit of its width. */
const peekAbove = peekImage.edge / full

// A <style> React hoists into <head> once, so the dialog needs no CSS import.
const css = `
.no-chan-dialog {
  --no-chan-w: min(${full}px, calc((100dvh - 48px) / ${2 + peekAbove}), calc(100vw - 32px));
  --no-chan-line: #1f1a1c;
  --no-chan-body: #fc96b6;
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  background: rgb(0 0 0 / 0.45);
  color: inherit;
}
.no-chan-dialog[open] {
  display: grid;
  place-items: center;
}
.no-chan-dialog::backdrop {
  background: transparent;
}
.no-chan-phone {
  position: relative;
  box-sizing: border-box;
  width: var(--no-chan-w);
  height: calc(var(--no-chan-w) * 2);
  margin-top: calc(var(--no-chan-w) * ${peekAbove});
  padding: 11px;
  border: 3px solid var(--no-chan-line);
  border-radius: calc(var(--no-chan-w) * 0.15);
  background: var(--no-chan-body);
}
.no-chan-phone::before,
.no-chan-phone::after {
  content: '';
  position: absolute;
  z-index: -1;
  width: 7px;
  border: 3px solid var(--no-chan-line);
  background: var(--no-chan-body);
}
.no-chan-phone::before {
  right: -9px;
  top: 22%;
  height: 10%;
  border-radius: 0 4px 4px 0;
}
.no-chan-phone::after {
  left: -9px;
  top: 18%;
  height: 6%;
  border-radius: 4px 0 0 4px;
  box-shadow: 0 calc(var(--no-chan-w) * 0.17) 0 -3px var(--no-chan-body),
    0 calc(var(--no-chan-w) * 0.17) 0 0 var(--no-chan-line);
}
.no-chan-screen {
  position: relative;
  box-sizing: border-box;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 2px solid var(--no-chan-line);
  border-radius: calc(var(--no-chan-w) * 0.15 - 11px);
}
.no-chan-island {
  position: absolute;
  top: calc(var(--no-chan-w) * 0.028);
  left: 50%;
  translate: -50% 0;
  width: calc(var(--no-chan-w) * 0.23);
  height: calc(var(--no-chan-w) * 0.067);
  border-radius: 999px;
  background: #111;
}
.no-chan-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: calc(var(--no-chan-w) * 0.13) 12px 28px;
}
.no-chan-home {
  position: absolute;
  bottom: 0;
  left: 50%;
  translate: -50% 0;
  display: grid;
  place-items: center;
  width: calc(var(--no-chan-w) * 0.4);
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: none;
  color: inherit;
  cursor: pointer;
}
.no-chan-home::before {
  content: '';
  width: 75%;
  height: 5px;
  border-radius: 3px;
  background: currentColor;
  opacity: 0.55;
}
.no-chan-home:hover::before {
  opacity: 0.9;
}
.no-chan-home:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: -2px;
}
.no-chan-peek {
  position: absolute;
  top: calc(var(--no-chan-w) * -${peekAbove} - 3px);
  left: 50%;
  translate: -50% 0;
  width: calc(var(--no-chan-w) * ${peekWidth});
  user-select: none;
}
`

/** The first background colour going up from `element`: the screen takes the page's own. */
function pageBackground(element: Element | null): string {
  for (let at = element; at; at = at.parentElement) {
    const color = getComputedStyle(at).backgroundColor
    if (color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') {
      return color
    }
  }
  return 'Canvas'
}

/**
 * Her phone, in a modal dialog in the middle of the window, with her peeking
 * over its top. The app's content goes on the screen.
 */
export function NooChanDialog({ open, onOpenChange, children }: NooChanDialogProps) {
  return open ? <Phone close={() => onOpenChange(false)}>{children}</Phone> : null
}

function Phone({ close, children }: { close: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const screen = useRef<HTMLDivElement>(null)
  // A click counts as outside only if it also began outside, so a text
  // selection dragged out of the screen does not close it.
  const pressedOutside = useRef(false)

  useEffect(() => {
    const element = dialog.current
    if (!element) {
      return
    }
    if (screen.current) {
      screen.current.style.background = pageBackground(element.parentElement)
    }
    element.showModal()
    return () => element.close()
  }, [])

  return (
    <dialog
      ref={dialog}
      className="no-chan-dialog"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClose={(event) => {
        // The browser closes it anyway on a second Esc in a row.
        if (!event.currentTarget.open) {
          close()
        }
      }}
      onPointerDown={(event) => {
        pressedOutside.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        if (pressedOutside.current && event.target === event.currentTarget) {
          close()
        }
      }}
    >
      <style href="no-chan-dialog" precedence="no-chan">
        {css}
      </style>
      <div className="no-chan-phone">
        <div ref={screen} className="no-chan-screen">
          <div className="no-chan-island" />
          <div className="no-chan-content">{children}</div>
          <button type="button" className="no-chan-home" aria-label="关闭" onClick={close} />
        </div>
        <img className="no-chan-peek" src={peekImage.url} alt="" draggable={false} />
      </div>
    </dialog>
  )
}
