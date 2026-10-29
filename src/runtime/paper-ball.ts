import type { Point } from '../character/types'

export type PaperBallConfig = {
  /** Where it hits her and where it comes to rest, from her feet, in CSS pixels. */
  hitAt: Point
  restAt: Point
  /** Time units in the air on the way to her, then bouncing off her head to the floor. */
  flight: number
  bounce: number
  /** Degrees it turns each time unit while it moves. */
  spin: number
  /** How far, in CSS pixels, it rises above the higher end of its flight. */
  arc: number
}

/** What the ball needs of her each frame. */
export type Target = {
  feet: Point
  /** Whether a hit would start her reaction now. */
  canBeHit: boolean
  /** Whether she is on the action a hit starts. */
  reacting: boolean
  /** Whether she has reached the step of that action where she picks the ball up. */
  pickedUp: boolean
  /** Milliseconds per time unit. */
  unit: number
}

type State =
  { kind: 'gone' } | { kind: 'flying'; from: Point; ms: number } | { kind: 'struck'; ms: number }

/** The point `t` (0 to 1) along a quadratic curve. */
function curve(from: Point, through: Point, to: Point, t: number): Point {
  const along = (a: number, b: number, c: number) =>
    (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c
  return { x: along(from.x, through.x, to.x), y: along(from.y, through.y, to.y) }
}

/**
 * The paper ball a request throws at her. It waits until she can be hit,
 * flies to her head and, if she still can be, hits her and bounces to lie
 * by her feet until she picks it up. If she cannot, it is gone.
 */
export class PaperBall {
  private readonly config: PaperBallConfig
  /** Where the next ball is thrown from; a newer request takes its place. */
  private waiting: Point | null = null
  private state: State = { kind: 'gone' }
  /** Where to draw it and how far it has turned, in degrees; null while there is none. */
  drawn: { x: number; y: number; spin: number } | null = null

  constructor(config: PaperBallConfig) {
    this.config = config
  }

  request(from: Point) {
    this.waiting = from
  }

  clear() {
    this.waiting = null
    this.state = { kind: 'gone' }
    this.drawn = null
  }

  /** Moves it on by `ms`; true when it hits her. */
  frame(ms: number, target: Target): boolean {
    const { config } = this
    if (this.state.kind === 'gone' && this.waiting && target.canBeHit) {
      this.state = { kind: 'flying', from: this.waiting, ms: 0 }
      this.waiting = null
    }
    const head = { x: target.feet.x + config.hitAt.x, y: target.feet.y + config.hitAt.y }
    const flight = config.flight * target.unit
    const bounce = config.bounce * target.unit
    const spin = (moved: number) => (moved / target.unit) * config.spin
    const state = this.state
    if (state.kind === 'flying') {
      state.ms += ms
      if (state.ms < flight) {
        const over = {
          x: (state.from.x + head.x) / 2,
          y: Math.min(state.from.y, head.y) - config.arc,
        }
        const point = curve(state.from, over, head, state.ms / flight)
        this.drawn = { ...point, spin: spin(state.ms) }
        return false
      }
      if (!target.canBeHit) {
        this.clearBall()
        return false
      }
      this.state = { kind: 'struck', ms: 0 }
      this.drawn = { ...head, spin: spin(flight) }
      return true
    }
    if (state.kind === 'struck') {
      state.ms += ms
      if (target.pickedUp || (state.ms >= bounce && !target.reacting)) {
        this.clearBall()
        return false
      }
      const rest = { x: target.feet.x + config.restAt.x, y: target.feet.y + config.restAt.y }
      const over = { x: (head.x + rest.x) / 2 - 10, y: head.y - 40 }
      const point = curve(head, over, rest, Math.min(1, state.ms / bounce))
      this.drawn = { ...point, spin: spin(flight + Math.min(state.ms, bounce)) }
    }
    return false
  }

  private clearBall() {
    this.state = { kind: 'gone' }
    this.drawn = null
  }
}
