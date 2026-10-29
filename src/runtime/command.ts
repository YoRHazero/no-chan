import type { StepRef } from '../character/types'

/** What a command's rule reads: what happened since the last frame, and how she is now. */
export type Situation = {
  /** Whether she is on a step of `action` (`frameset.action`). */
  inAction(action: string): boolean
  /** Whether she is on `step` (`frameset.action.step`). */
  onStep(step: string): boolean
  /** Milliseconds she has been on this step; it keeps counting while a step holds. */
  elapsed: number
  /** Milliseconds since the mouse or keyboard was last used anywhere in the window. */
  sinceInput: number
  /** Whether `event` happened since the last frame. */
  happened(event: string): boolean
  /** Whether the command named `name` is ready. */
  ready(name: string): boolean
  /** Whether she is pressed on. */
  pressing: boolean
  /** Whether she is pressed on and the pointer has moved far enough to drag her. */
  dragging: boolean
  /** Whether her feet are on the floor. */
  onFloor: boolean
  /** Whether she stands within one body's width of a wall. */
  nearWall: boolean
  hasNotice: boolean
  /** True for this frame with a chance of `perSecond` a second. */
  chance(perSecond: number): boolean
}

export type Rule = (now: Situation) => boolean

export type CommandSpec = {
  name: string
  /** `frameset.action` or `frameset.action.step`; with several, one is picked at random. */
  target: string | string[]
  /** It moves her only off a step of lower priority. */
  priority: number
  /** Once it holds, the command is ready until it is carried out. */
  rule: Rule
}

/** A switch she makes once its rule has held, as soon as it outranks the step she is on. */
export class Command {
  readonly name: string
  readonly targets: readonly StepRef[]
  readonly priority: number
  readonly rule: Rule
  /** When its rule first held, in runtime seconds; null while it is not ready. */
  readySince: number | null = null

  constructor(name: string, targets: StepRef[], priority: number, rule: Rule) {
    this.name = name
    this.targets = targets
    this.priority = priority
    this.rule = rule
  }
}

/** The ready command to try: highest priority, then ready longest, then listed first. */
export function firstReady(commands: readonly Command[]): Command | undefined {
  let best: Command | undefined
  for (const command of commands) {
    if (command.readySince === null) {
      continue
    }
    if (
      !best ||
      best.readySince === null ||
      command.priority > best.priority ||
      (command.priority === best.priority && command.readySince < best.readySince)
    ) {
      best = command
    }
  }
  return best
}
