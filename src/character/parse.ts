import { parse } from 'smol-toml'
import type { Action, Frame, Frameset, FramesetSource, Point, Step, StepRef } from './types'

type Table = Record<string, unknown>

/** A frameset.toml that does not say what it should. */
export class FramesetError extends Error {}

function isTable(value: unknown): value is Table {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Reads one table of a frameset.toml, naming the file and the key in every error. */
class Reader {
  private readonly table: Table
  private readonly file: string
  /** Where the table is, as `actions.yawn`; empty at the top. */
  private readonly path: string

  constructor(table: Table, file: string, path: string) {
    this.table = table
    this.file = file
    this.path = path
  }

  fail(message: string): never {
    throw new FramesetError(`${this.file}: ${message}`)
  }

  at(key: string) {
    return this.path ? `${this.path}.${key}` : key
  }

  /** Fails on a key not in `known`: misspelt, it would quietly fall back to the default. */
  only(...known: string[]) {
    for (const key of Object.keys(this.table)) {
      if (!known.includes(key)) {
        this.fail(`unknown key ${this.at(key)}`)
      }
    }
  }

  keys() {
    return Object.keys(this.table)
  }

  has(key: string) {
    return key in this.table
  }

  child(key: string): Reader {
    const value = this.table[key]
    if (!isTable(value)) {
      this.fail(`${this.at(key)} must be a table`)
    }
    return new Reader(value, this.file, this.at(key))
  }

  list(key: string): Reader[] {
    const value = this.table[key]
    if (!Array.isArray(value) || value.length === 0) {
      this.fail(`${this.at(key)} must be a list that is not empty`)
    }
    return value.map((item, i) => {
      const at = `${this.at(key)}[${i}]`
      if (!isTable(item)) {
        this.fail(`${at} must be a table`)
      }
      return new Reader(item, this.file, at)
    })
  }

  positive(key: string): number {
    const value = this.table[key]
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      this.fail(`${this.at(key)} must be a positive number`)
    }
    return value
  }

  integer(key: string): number {
    const value = this.table[key]
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      this.fail(`${this.at(key)} must be an integer`)
    }
    return value
  }

  string(key: string): string {
    const value = this.table[key]
    if (typeof value !== 'string') {
      this.fail(`${this.at(key)} must be a string`)
    }
    return value
  }

  pixel(key: string): Point {
    const value = this.table[key]
    if (
      !Array.isArray(value) ||
      value.length !== 2 ||
      !value.every((n) => typeof n === 'number' && Number.isInteger(n) && n >= 0)
    ) {
      this.fail(`${this.at(key)} must be [x, y] in whole pixels`)
    }
    return { x: value[0], y: value[1] }
  }
}

/** Reads `frameset.action` or `frameset.action.step`; the step is 0 when left out. */
export function parseRef(text: string): StepRef | null {
  const parts = text.split('.')
  if (parts.length !== 2 && parts.length !== 3) {
    return null
  }
  const [frameset = '', action = '', step = '0'] = parts
  if (!frameset || !action || !/^\d+$/.test(step)) {
    return null
  }
  return { frameset, action, step: Number(step) }
}

export function formatRef(ref: StepRef): string {
  return `${ref.frameset}.${ref.action}.${ref.step}`
}

/** Dots separate the parts of a step's name, so names have none. */
function checkName(reader: Reader, kind: string, name: string) {
  if (!name || name.includes('.')) {
    reader.fail(`${kind} name "${name}" must not be empty or contain a dot`)
  }
}

/**
 * Every PNG is a frame. What a frame leaves out it takes from the
 * frameset; its feet default to its anchor.
 */
function readFrames(root: Reader, pngs: Record<string, string>) {
  const anchor = root.has('anchor') ? root.pixel('anchor') : null
  const betweenFeet = root.has('between_feet') ? root.pixel('between_feet') : null
  const table = root.has('frames') ? root.child('frames') : null
  for (const key of table?.keys() ?? []) {
    if (!(key in pngs)) {
      root.fail(`frames.${key} has no ${key}.png`)
    }
  }
  const frames: Record<string, Frame> = {}
  for (const [name, url] of Object.entries(pngs)) {
    const own = table?.has(name) ? table.child(name) : null
    own?.only('anchor', 'between_feet', 'resolution')
    const frameAnchor = own?.has('anchor') ? own.pixel('anchor') : anchor
    if (!frameAnchor) {
      root.fail(`${name}.png has no anchor, and neither has the frameset`)
    }
    frames[name] = {
      url,
      anchor: frameAnchor,
      betweenFeet: own?.has('between_feet')
        ? own.pixel('between_feet')
        : (betweenFeet ?? frameAnchor),
      resolution: own?.has('resolution') ? own.positive('resolution') : 1,
    }
  }
  return frames
}

function readAction(action: Reader, frames: Record<string, Frame>): Action {
  action.only('steps', 'next', 'duration', 'priority', 'motion')
  // What a step leaves out it takes from its action, then from these.
  const duration = action.has('duration') ? action.positive('duration') : 1
  const priority = action.has('priority') ? action.integer('priority') : 0
  const steps = action.list('steps').map((step): Step => {
    step.only('frame', 'duration', 'priority')
    const frame = step.string('frame')
    if (!(frame in frames)) {
      step.fail(`there is no frame "${frame}"`)
    }
    return {
      frame,
      duration: step.has('duration') ? step.positive('duration') : duration,
      priority: step.has('priority') ? step.integer('priority') : priority,
    }
  })
  let next: StepRef | null = null
  if (action.has('next')) {
    const text = action.string('next')
    next = parseRef(text)
    if (!next) {
      action.fail(`next "${text}" must be frameset.action or frameset.action.step`)
    }
  }
  return { steps, next, motion: action.has('motion') ? action.string('motion') : null }
}

/**
 * Reads one frameset. Whether each `next` leads anywhere is checked by the
 * character, once it has every frameset.
 */
export function parseFrameset(source: FramesetSource): Frameset {
  const file = `${source.name}/frameset.toml`
  let table: Table
  try {
    table = parse(source.toml)
  } catch (error) {
    throw new FramesetError(`${file}: ${error instanceof Error ? error.message : String(error)}`)
  }
  const root = new Reader(table, file, '')
  checkName(root, 'frameset', source.name)
  root.only('scale', 'anchor', 'between_feet', 'frames', 'actions')
  const frames = readFrames(root, source.pngs)
  const actionTable = root.child('actions')
  if (actionTable.keys().length === 0) {
    root.fail('actions must not be empty')
  }
  const actions: Record<string, Action> = {}
  for (const key of actionTable.keys()) {
    checkName(root, 'action', key)
    actions[key] = readAction(actionTable.child(key), frames)
  }
  // Frames need no entry of their own, so this is what finds a stray PNG.
  const used = new Set(Object.values(actions).flatMap((action) => action.steps.map((s) => s.frame)))
  for (const name of Object.keys(frames)) {
    if (!used.has(name)) {
      root.fail(`${name}.png is not used by any step`)
    }
  }
  return { scale: root.positive('scale'), frames, actions }
}
