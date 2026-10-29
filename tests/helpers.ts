import { commands } from '../src/no-chan/commands'
import { runtimeConfig } from '../src/no-chan/config'
import { createCharacter, framesetSources } from '../src/no-chan/load'
import type { Box, Size } from '../src/runtime/position'
import { Runtime } from '../src/runtime/runtime'

// The PNGs inlined, to read their sizes without a browser.
const inlined = import.meta.glob<string>('../src/no-chan/framesets/*/*.png', {
  query: '?inline',
  import: 'default',
  eager: true,
})

/** Width and height from the header of a PNG given as a data URL. */
function pngSize(dataUrl: string): Size {
  const bytes = atob(dataUrl.slice(dataUrl.indexOf(',') + 1))
  const word = (at: number) =>
    [0, 1, 2, 3].reduce((value, i) => value * 256 + bytes.charCodeAt(at + i), 0)
  return { width: word(16), height: word(20) }
}

/** Every frame's PNG size by its URL, as NooChan has them once the PNGs have decoded. */
export const sizes = new Map<string, Size>()
for (const source of framesetSources) {
  for (const [name, url] of Object.entries(source.pngs)) {
    const dataUrl = inlined[`../src/no-chan/framesets/${source.name}/${name}.png`]
    if (dataUrl) {
      sizes.set(url, pngSize(dataUrl))
    }
  }
}

/** Her runtime, attached to a 1000 × 600 window, played at 60 frames a second. */
export function harness() {
  const bounds: Box = { left: 0, top: 0, width: 1000, height: 600 }
  // Never below the chance of a random idle in a frame, so she does not yawn.
  const runtime = new Runtime({
    character: createCharacter(),
    sizes,
    commands,
    config: runtimeConfig,
    random: () => 0.5,
  })
  runtime.attach({
    bounds: () => bounds,
    timeUnit: () => 100,
    hasNotice: () => false,
    click: () => {},
  })
  const action = () => `${runtime.step.frameset}.${runtime.step.action}`
  const run = (seconds: number) => {
    for (let frames = Math.round(seconds * 60); frames > 0; frames--) {
      runtime.frame(1 / 60)
    }
  }
  /** Plays on until she is on `name`, for at most `seconds`. */
  const until = (name: string, seconds = 10) => {
    for (let frames = seconds * 60; frames > 0 && action() !== name; frames--) {
      runtime.frame(1 / 60)
    }
    return action()
  }
  /** Presses on her and drags far enough to pick her up. */
  const drag = () => {
    const { x, y } = runtime.position
    runtime.pointer('down', x, y - 50)
    runtime.pointer('move', x, y - 60)
  }
  return { runtime, action, run, until, drag }
}
