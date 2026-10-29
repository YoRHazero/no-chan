import { use, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { commands } from '../no-chan/commands'
import { paperBallImage, runtimeConfig } from '../no-chan/config'
import { createCharacter, framesetSources } from '../no-chan/load'
import type { Box, Size } from '../runtime/position'
import { Runtime, type Host, type PointerType } from '../runtime/runtime'
import { runtimeOf } from './controller'
import type { NooChanProps } from './no-chan'

let sizes: Promise<Map<string, Size>> | undefined
/** Decoded images are held on to, so the browser keeps them decoded. */
const kept: HTMLImageElement[] = []

/**
 * Loads and decodes every PNG once, so a frame never shows blank the first
 * time she switches to it, and measures them.
 */
function loadSizes(): Promise<Map<string, Size>> {
  sizes ??= Promise.all(
    framesetSources
      .flatMap((source) => Object.values(source.pngs))
      .map(async (url) => {
        const image = new Image()
        image.src = url
        await image.decode()
        kept.push(image)
        return [url, { width: image.naturalWidth, height: image.naturalHeight }] as const
      }),
  ).then((entries) => new Map(entries))
  return sizes
}

function measure(element: HTMLElement | null | undefined): Box {
  if (!element) {
    return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
  }
  const rect = element.getBoundingClientRect()
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
}

/** Rounds to whole device pixels: moved by a fraction of a pixel, an image is resampled and blurs. */
function snap(value: number, ratio: number) {
  return Math.round(value * ratio) / ratio
}

const pointerTypes: Record<string, PointerType> = {
  pointerdown: 'down',
  pointermove: 'move',
  pointerup: 'up',
  pointercancel: 'cancel',
}

/** Keeps the page's text from being selected while she is dragged across it. */
function lockSelection(locked: boolean) {
  if (locked) {
    window.getSelection()?.removeAllRanges()
  }
  const style = document.documentElement.style
  style.userSelect = locked ? 'none' : ''
  style.webkitUserSelect = locked ? 'none' : ''
}

/**
 * NooChan once her frames have loaded: attaches her runtime, drives it from
 * animation frames and pointer and keyboard events, and draws it by moving
 * two fixed elements.
 */
export default function Stage(props: NooChanProps) {
  const loaded = use(loadSizes())
  const runtime = runtimeOf(
    props.controller,
    () =>
      new Runtime({ character: createCharacter(), sizes: loaded, commands, config: runtimeConfig }),
  )
  const latest = useRef(props)
  const holder = useRef<HTMLDivElement>(null)
  const image = useRef<HTMLImageElement>(null)
  const ball = useRef<HTMLDivElement>(null)

  useEffect(() => {
    latest.current = props
  })

  useEffect(() => {
    const host: Host = {
      bounds: () => measure(latest.current.bounds?.current),
      timeUnit: () => latest.current.timeUnit ?? 100,
      hasNotice: () => latest.current.hasNotice ?? false,
      click: () => latest.current.onClick?.(),
    }
    runtime.attach(host)

    let shown = ''
    const draw = () => {
      const view = runtime.view()
      const ratio = window.devicePixelRatio || 1
      const element = holder.current
      const img = image.current
      if (element && img) {
        if (view.url !== shown) {
          img.src = view.url
          shown = view.url
        }
        img.style.width = `${view.box.width}px`
        img.style.height = `${view.box.height}px`
        const flip = view.mirrored ? ' scaleX(-1)' : ''
        element.style.transform = `translate(${snap(view.box.left, ratio)}px, ${snap(view.box.top, ratio)}px)${flip}`
        element.style.visibility = 'visible'
      }
      const paper = ball.current
      if (paper) {
        if (view.ball) {
          const half = paperBallImage.size / 2
          paper.style.transform = `translate(${snap(view.ball.x - half, ratio)}px, ${snap(view.ball.y - half, ratio)}px) rotate(${view.ball.spin}deg)`
          paper.style.visibility = 'visible'
        } else {
          paper.style.visibility = 'hidden'
        }
      }
    }

    let last = performance.now()
    let request = 0
    const tick = (now: number) => {
      // A long gap (a hidden tab) plays on as one short frame, so she does not leap.
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
      last = now
      runtime.frame(dt)
      draw()
      request = requestAnimationFrame(tick)
    }
    draw()
    request = requestAnimationFrame(tick)

    const onMove = (event: PointerEvent) =>
      runtime.input(Math.hypot(event.movementX, event.movementY))
    const onKey = () => runtime.key()
    window.addEventListener('pointermove', onMove)
    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', onKey)
    return () => {
      cancelAnimationFrame(request)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('wheel', onKey)
      runtime.detach()
      lockSelection(false)
    }
  }, [runtime])

  const onPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const type = pointerTypes[event.type]
    if (!type) {
      return
    }
    if (type === 'down') {
      if (event.button !== 0) {
        return
      }
      try {
        event.currentTarget.setPointerCapture(event.pointerId)
      } catch {
        // Without capture she still follows the pointer while it stays over her.
      }
      event.currentTarget.style.cursor = 'grabbing'
      lockSelection(true)
    } else if (type !== 'move') {
      event.currentTarget.style.cursor = 'grab'
      lockSelection(false)
    }
    runtime.pointer(type, event.clientX, event.clientY)
  }

  return (
    <>
      <div
        ref={holder}
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 60,
          visibility: 'hidden',
          cursor: 'grab',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onPointerDown={onPointer}
        onPointerMove={onPointer}
        onPointerUp={onPointer}
        onPointerCancel={onPointer}
      >
        <img
          ref={image}
          alt=""
          draggable={false}
          style={{ display: 'block', pointerEvents: 'none' }}
        />
      </div>
      <div
        ref={ball}
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 61,
          visibility: 'hidden',
          pointerEvents: 'none',
          width: paperBallImage.size,
          height: paperBallImage.size,
          backgroundImage: `url(${paperBallImage.url})`,
          backgroundSize: 'contain',
        }}
      />
    </>
  )
}
