import { sameAction, sameRef, type Character } from '../character/character'
import { formatRef } from '../character/parse'
import type { Point, StepRef } from '../character/types'
import { Command, firstReady, type CommandSpec, type Situation } from './command'
import { createMotions, defaultMotion, type Body, type Motion, type MotionConfig } from './motions'
import { PaperBall, type PaperBallConfig } from './paper-ball'
import {
  anchorAt,
  bottom,
  boxAt,
  feetFor,
  right,
  xOf,
  type Box,
  type Drawn,
  type Place,
  type Size,
} from './position'

/** What NooChan on the page gives the runtime while attached. */
export type Host = {
  /** The area she lives in; read once a frame. */
  bounds(): Box
  /** Milliseconds per time unit. */
  timeUnit(): number
  hasNotice(): boolean
  /** She was clicked on a clickable action. */
  click(): void
}

export type RuntimeConfig = {
  /** The step she appears on: `frameset.action` or `frameset.action.step`. */
  first: string
  /** Where she stands before she has ever been moved. */
  firstPlace: Place
  /** Actions (`frameset.action`) on which a click goes to the app. */
  clickable: string[]
  /** How far, in CSS pixels, a press moves before it is a drag. */
  dragSlop: number
  /** How far, in CSS pixels, the mouse moves for one `input` event; a key is one at once. */
  inputDistance: number
  motions: MotionConfig
  paperBall: PaperBallConfig & {
    /** The command a hit makes ready; its priority says when she can be hit. */
    command: string
    /** The step of that command's action where she picks the ball up: `frameset.action.step`. */
    pickUp: string
  }
}

export type RuntimeOptions = {
  character: Character
  /** The size of each frame's PNG, by URL. */
  sizes: ReadonlyMap<string, Size>
  commands: CommandSpec[]
  config: RuntimeConfig
  /** For tests; Math.random by default. */
  random?: () => number
}

/** What to draw. */
export type View = {
  url: string
  box: Box
  mirrored: boolean
  /** The middle of the paper ball and how far it has turned, in degrees; null when there is none. */
  ball: { x: number; y: number; spin: number } | null
}

export type PointerType = 'down' | 'move' | 'up' | 'cancel'

/** Events the runtime itself records for commands to read, besides those the app sends. */
export const events = {
  /** The mouse moved far enough, or a key was pressed. */
  input: 'input',
  /** The paper ball hit her. */
  hit: 'hit',
} as const

/**
 * Her in the world, without React or the DOM: the clock, commands, motion,
 * her place on the page and the paper ball. It is the only thing that moves
 * the character. NooChan attaches it while she is on the page.
 */
export class Runtime {
  private readonly character: Character
  private readonly sizes: ReadonlyMap<string, Size>
  private readonly config: RuntimeConfig
  private readonly commands: Command[]
  private readonly motions: Record<string, Motion>
  private readonly first: StepRef
  private readonly ball: PaperBall
  private readonly hitBy: Command
  private readonly pickUp: StepRef
  private readonly random: () => number
  private readonly body: Body
  private host: Host | null = null
  /** Seconds she has been attached, all told. */
  private time = 0
  private dt = 0
  /** Milliseconds on the current step. */
  private elapsed = 0
  private area: Box = { left: 0, top: 0, width: 0, height: 0 }
  private feet: Point = { x: 0, y: 0 }
  private mirrored = false
  private place: Place
  private motion = defaultMotion
  /** What happened since the last frame, for the commands to read. */
  private happened = new Set<string>()
  private pointerAt: Point = { x: 0, y: 0 }
  private press: Point | null = null
  private dragging = false
  private lastInput = 0
  private moved = 0

  constructor(options: RuntimeOptions) {
    const { character, config } = options
    this.character = character
    this.sizes = options.sizes
    this.config = config
    this.random = options.random ?? Math.random
    this.first = character.ref(config.first)
    this.place = config.firstPlace
    this.commands = options.commands.map((spec) => {
      const targets = typeof spec.target === 'string' ? [spec.target] : spec.target
      return new Command(
        spec.name,
        targets.map((target) => character.ref(target)),
        spec.priority,
        spec.rule,
      )
    })
    this.motions = createMotions(config.motions)
    for (const [name, frameset] of Object.entries(character.framesets)) {
      for (const [key, action] of Object.entries(frameset.actions)) {
        if (action.motion !== null && !(action.motion in this.motions)) {
          throw new Error(`${name}.${key} has motion "${action.motion}", which there is none of`)
        }
      }
    }
    const hitBy = this.commands.find((command) => command.name === config.paperBall.command)
    if (!hitBy) {
      throw new Error(`the paper ball needs a command named ${config.paperBall.command}`)
    }
    this.hitBy = hitBy
    this.pickUp = character.ref(config.paperBall.pickUp)
    this.ball = new PaperBall(config.paperBall)
    this.body = this.makeBody()
  }

  get attached() {
    return this.host !== null
  }

  get step(): StepRef {
    return this.character.step
  }

  /** Where her feet are on the page: her position. */
  get position(): Point {
    return this.feet
  }

  /** She appears: everything starts over but where she stands. */
  attach(host: Host) {
    this.host = host
    this.area = host.bounds()
    this.character.switchTo(this.first)
    this.elapsed = 0
    this.happened.clear()
    for (const command of this.commands) {
      command.readySince = null
    }
    this.ball.clear()
    this.press = null
    this.dragging = false
    this.moved = 0
    this.lastInput = this.time
    this.mirrored = false
    this.feet = { x: xOf(this.place, this.area), y: bottom(this.area) }
    this.motion = this.motionOf(this.first)
    this.current.enter?.(this.body, null)
    this.current.frame(this.body, 0)
  }

  /** She leaves the page; time stops until she is attached again. */
  detach() {
    this.host = null
  }

  /** An animation frame, `dt` seconds after the last. She switches at most once a frame. */
  frame(dt: number) {
    const host = this.host
    if (!host) {
      return
    }
    this.time += dt
    this.dt = dt
    this.area = host.bounds()
    this.elapsed += dt * 1000
    const switched = this.runCommands()
    this.happened.clear()
    if (!switched) {
      this.playOn(host.timeUnit())
    }
    this.current.frame(this.body, dt)
    if (this.ball.frame(dt * 1000, this.ballTarget(host.timeUnit()))) {
      this.happened.add(events.hit)
    }
  }

  /** The pointer, pressed on her and followed until let go. */
  pointer(type: PointerType, x: number, y: number) {
    const host = this.host
    if (!host) {
      return
    }
    this.pointerAt = { x, y }
    if (type === 'down') {
      this.press = { x, y }
      this.dragging = false
      return
    }
    const press = this.press
    if (!press) {
      return
    }
    if (type === 'move') {
      if (Math.hypot(x - press.x, y - press.y) > this.config.dragSlop) {
        this.dragging = true
      }
      return
    }
    if (type === 'up' && !this.dragging && this.config.clickable.some((a) => this.inAction(a))) {
      host.click()
    }
    this.press = null
    this.dragging = false
  }

  /** The mouse moved `distance` CSS pixels anywhere in the window. */
  input(distance: number) {
    if (!this.host) {
      return
    }
    this.lastInput = this.time
    this.moved += distance
    if (this.moved >= this.config.inputDistance) {
      this.moved = 0
      this.happened.add(events.input)
    }
  }

  /** A key was pressed, or the wheel turned. */
  key() {
    if (!this.host) {
      return
    }
    this.lastInput = this.time
    this.moved = 0
    this.happened.add(events.input)
  }

  /** Something happened in the app; dropped while she is not on the page. */
  notify(event: string) {
    if (this.host) {
      this.happened.add(event)
    }
  }

  /** A paper ball thrown from `from`; dropped while she is not on the page. */
  request(from: Point) {
    if (this.host) {
      this.ball.request(from)
    }
  }

  view(): View {
    return {
      url: this.character.frameOf(this.step).url,
      box: this.box,
      mirrored: this.mirrored,
      ball: this.ball.drawn,
    }
  }

  private get current(): Motion {
    const motion = this.motions[this.motion]
    if (!motion) {
      throw new Error(`no motion ${this.motion}`)
    }
    return motion
  }

  private get box(): Box {
    return boxAt(this.drawn(this.step), this.feet)
  }

  private drawn(ref: StepRef): Drawn {
    const frame = this.character.frameOf(ref)
    const size = this.sizes.get(frame.url) ?? { width: 0, height: 0 }
    return { frame, size, scale: this.character.framesetOf(ref).scale, mirrored: this.mirrored }
  }

  private motionOf(ref: StepRef) {
    return this.character.actionOf(ref).motion ?? defaultMotion
  }

  private inAction(action: string) {
    return `${this.step.frameset}.${this.step.action}` === action
  }

  /** Readies every command whose rule holds, and carries out the first if it outranks her step. */
  private runCommands(): boolean {
    const now = this.situation()
    for (const command of this.commands) {
      if (command.readySince === null && command.rule(now)) {
        command.readySince = this.time
      }
    }
    const chosen = firstReady(this.commands)
    if (!chosen || chosen.priority <= this.character.stepOf(this.step).priority) {
      return false
    }
    chosen.readySince = null
    const target = chosen.targets[Math.floor(this.random() * chosen.targets.length)]
    if (!target || sameAction(target, this.step)) {
      return false
    }
    this.go(target, 0)
    return true
  }

  /** Moves on to the next step once this one's time is up. */
  private playOn(unit: number) {
    const length = this.character.stepOf(this.step).duration * unit
    if (this.elapsed < length) {
      return
    }
    const next = this.character.following(this.step)
    if (!sameRef(next, this.step)) {
      this.go(next, this.elapsed - length)
    }
  }

  /**
   * Switches her to `target`, `carry` milliseconds into it. Within a frameset
   * the anchors line up; between framesets her feet stay where they are.
   */
  private go(target: StepRef, carry: number) {
    const from = this.step
    if (from.frameset === target.frameset) {
      this.feet = feetFor(this.drawn(target), anchorAt(this.drawn(from), this.feet))
    }
    this.character.switchTo(target)
    this.elapsed = carry
    const motion = this.motionOf(target)
    if (motion !== this.motion) {
      this.current.leave?.(this.body)
      const before = this.motion
      this.motion = motion
      this.current.enter?.(this.body, before)
    }
  }

  private situation(): Situation {
    const step = this.step
    const box = this.box
    const bounds = this.area
    return {
      inAction: (action) => this.inAction(action),
      onStep: (name) => formatRef(step) === name,
      elapsed: this.elapsed,
      sinceInput: (this.time - this.lastInput) * 1000,
      happened: (event) => this.happened.has(event),
      ready: (name) => this.commands.some((c) => c.name === name && c.readySince !== null),
      pressing: this.press !== null,
      dragging: this.dragging,
      onFloor: this.feet.y >= bottom(bounds) - 0.5,
      nearWall: box.left - bounds.left <= box.width || right(bounds) - right(box) <= box.width,
      hasNotice: this.host?.hasNotice() ?? false,
      chance: (perSecond) => this.random() < 1 - Math.exp(-perSecond * this.dt),
    }
  }

  private ballTarget(unit: number) {
    const step = this.step
    const reacting = sameAction(step, this.pickUp)
    return {
      feet: this.feet,
      canBeHit: this.hitBy.priority > this.character.stepOf(step).priority,
      reacting,
      pickedUp: reacting && step.step >= this.pickUp.step,
      unit,
    }
  }

  private makeBody(): Body {
    // The getters below have the object literal as `this`, not the runtime.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const runtime = this
    return {
      get feet() {
        return runtime.feet
      },
      get box() {
        return runtime.box
      },
      get anchor() {
        return anchorAt(runtime.drawn(runtime.step), runtime.feet)
      },
      get bounds() {
        return runtime.area
      },
      get pointer() {
        return runtime.pointerAt
      },
      get place() {
        return runtime.place
      },
      set place(place) {
        runtime.place = place
      },
      get mirrored() {
        return runtime.mirrored
      },
      set mirrored(mirrored) {
        runtime.mirrored = mirrored
      },
      move(dx, dy) {
        runtime.feet = { x: runtime.feet.x + dx, y: runtime.feet.y + dy }
      },
    }
  }
}
