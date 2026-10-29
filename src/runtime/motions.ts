import type { Point } from '../character/types'
import { bottom, placeOf, right, xOf, type Box, type Place } from './position'

/** What a motion sees of her and can do to her. Reads are live: after `move`, `box` has moved. */
export type Body = {
  /** Where her feet are: her place on the page. */
  readonly feet: Point
  /** Where her frame is drawn. */
  readonly box: Box
  /** Where her frame's anchor is; for the frames she is held by, her hand. */
  readonly anchor: Point
  /** The area she lives in: its bottom is the floor, its sides the walls. */
  readonly bounds: Box
  readonly pointer: Point
  /** Where she stands on the floor; it outlasts her leaving the page. */
  place: Place
  mirrored: boolean
  move(dx: number, dy: number): void
}

/** How she moves while on an action. One runs at a time, chosen by the action she is on. */
export type Motion = {
  /** She starts moving this way; `from` is the motion before, null when she has just appeared. */
  enter?(body: Body, from: string | null): void
  frame(body: Body, dt: number): void
  leave?(body: Body): void
}

export type MotionConfig = {
  /** About how long, in seconds, her hand takes to catch up with the cursor when picked up. */
  catchUp: number
  /** Speed gained each second while falling, in CSS pixels a second. */
  gravity: number
  /** About how long, in seconds, she takes to shuffle up against the wall. */
  shuffle: number
}

/** Held: her hand follows the cursor, closing the gap it had when she was picked up. */
function follow(config: MotionConfig): Motion {
  let gap: Point = { x: 0, y: 0 }
  return {
    enter(body) {
      gap = { x: body.anchor.x - body.pointer.x, y: body.anchor.y - body.pointer.y }
    },
    frame(body, dt) {
      const ease = Math.exp(-dt / config.catchUp)
      gap = { x: gap.x * ease, y: gap.y * ease }
      body.move(body.pointer.x + gap.x - body.anchor.x, body.pointer.y + gap.y - body.anchor.y)
    },
  }
}

/** Falling from a standstill until her feet reach the floor. */
function fall(config: MotionConfig): Motion {
  let speed = 0
  return {
    enter() {
      speed = 0
    },
    frame(body, dt) {
      speed += config.gravity * dt
      body.move(0, Math.min(speed * dt, bottom(body.bounds) - body.feet.y))
    },
  }
}

/** Against the nearer wall, mirrored against the right one, shuffling up to it on the floor. */
function wall(config: MotionConfig): Motion {
  let side: 'left' | 'right' = 'left'
  return {
    enter(body) {
      const { bounds, feet } = body
      side = feet.x - bounds.left < right(bounds) - feet.x ? 'left' : 'right'
      body.mirrored = side === 'right'
    },
    frame(body, dt) {
      const { bounds, box, feet } = body
      const gap = side === 'left' ? bounds.left - box.left : right(bounds) - right(box)
      body.move(gap * (1 - Math.exp(-dt / config.shuffle)), bottom(bounds) - feet.y)
    },
    leave(body) {
      body.mirrored = false
    },
  }
}

/**
 * On the floor at her place, kept inside the area. Coming back to the floor
 * from another motion, she has a new place.
 */
function floor(): Motion {
  return {
    enter(body, from) {
      if (from !== null) {
        body.place = placeOf(body.feet.x, body.bounds)
      }
    },
    frame(body) {
      const { bounds, box, feet } = body
      let dx = xOf(body.place, bounds) - feet.x
      const left = box.left + dx
      if (left < bounds.left) {
        dx += bounds.left - left
      } else if (left + box.width > right(bounds)) {
        dx -= left + box.width - right(bounds)
      }
      body.move(dx, bottom(bounds) - feet.y)
    },
  }
}

/** The motion an action without one has. */
export const defaultMotion = 'floor'

/** Her motions by the name actions give them; each has its own state, so make one set per runtime. */
export function createMotions(config: MotionConfig): Record<string, Motion> {
  return { follow: follow(config), fall: fall(config), wall: wall(config), floor: floor() }
}
