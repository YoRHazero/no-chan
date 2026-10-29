import { FramesetError, formatRef, parseFrameset, parseRef } from './parse'
import type { Action, Frame, Frameset, FramesetSource, Step, StepRef } from './types'

export function sameRef(a: StepRef, b: StepRef): boolean {
  return a.frameset === b.frameset && a.action === b.action && a.step === b.step
}

export function sameAction(a: StepRef, b: StepRef): boolean {
  return a.frameset === b.frameset && a.action === b.action
}

export type CharacterOptions = {
  /** The step she is on when made: `frameset.action` or `frameset.action.step`. */
  first: string
  /** Where an action that names no `next` goes after its last step; left out, it holds that step. */
  defaultNext?: string
}

/**
 * Her framesets and the step she is on. It never acts by itself: it does
 * not know the time, and only `switchTo` moves her.
 */
export class Character {
  readonly framesets: Readonly<Record<string, Frameset>>
  private readonly defaultNext: StepRef | null
  private current: StepRef

  /** Takes every frameset at once, so each `next` can be checked; throws if any is wrong. */
  constructor(sources: FramesetSource[], options: CharacterOptions) {
    const framesets: Record<string, Frameset> = {}
    for (const source of sources) {
      framesets[source.name] = parseFrameset(source)
    }
    this.framesets = framesets
    for (const [name, frameset] of Object.entries(framesets)) {
      for (const [key, action] of Object.entries(frameset.actions)) {
        if (action.next && !this.has(action.next)) {
          throw new FramesetError(
            `${name}/frameset.toml: actions.${key}.next leads to ${formatRef(action.next)}, which does not exist`,
          )
        }
      }
    }
    this.defaultNext = options.defaultNext === undefined ? null : this.ref(options.defaultNext)
    this.current = this.ref(options.first)
  }

  get step(): StepRef {
    return this.current
  }

  /** Moves her to `step`. Only the runtime calls it: it keeps the time she has spent on a step. */
  switchTo(step: StepRef) {
    if (!this.has(step)) {
      throw new Error(`no step ${formatRef(step)}`)
    }
    this.current = step
  }

  /** Reads `frameset.action` or `frameset.action.step`, and throws if there is no such step. */
  ref(text: string): StepRef {
    const ref = parseRef(text)
    if (!ref || !this.has(ref)) {
      throw new Error(`no step ${text}`)
    }
    return ref
  }

  has(ref: StepRef): boolean {
    return this.framesets[ref.frameset]?.actions[ref.action]?.steps[ref.step] !== undefined
  }

  framesetOf(ref: StepRef): Frameset {
    const frameset = this.framesets[ref.frameset]
    if (!frameset) {
      throw new Error(`no frameset ${ref.frameset}`)
    }
    return frameset
  }

  actionOf(ref: StepRef): Action {
    const action = this.framesetOf(ref).actions[ref.action]
    if (!action) {
      throw new Error(`no action ${ref.frameset}.${ref.action}`)
    }
    return action
  }

  stepOf(ref: StepRef): Step {
    const step = this.actionOf(ref).steps[ref.step]
    if (!step) {
      throw new Error(`no step ${formatRef(ref)}`)
    }
    return step
  }

  frameOf(ref: StepRef): Frame {
    const frame = this.framesetOf(ref).frames[this.stepOf(ref).frame]
    if (!frame) {
      throw new Error(`no frame for ${formatRef(ref)}`)
    }
    return frame
  }

  /** The step after `step`: the next in its action, else its action's next, else the default, else itself. */
  following(step: StepRef): StepRef {
    const action = this.actionOf(step)
    if (step.step + 1 < action.steps.length) {
      return { ...step, step: step.step + 1 }
    }
    return action.next ?? this.defaultNext ?? step
  }
}
