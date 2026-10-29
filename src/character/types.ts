/** A point in image pixels, or in CSS pixels where a type says so. */
export type Point = { x: number; y: number }

/** A step, named by its frameset, its action in that frameset, and its place in the action. */
export type StepRef = { frameset: string; action: string; step: number }

/** One PNG. Both points are in image pixels from the top left of the PNG. */
export type Frame = {
  url: string
  /** Lines up with the last frame's anchor when she moves on within a frameset. */
  anchor: Point
  /** Where she stands in this picture; lines up with the last frame's when she moves to another frameset. */
  betweenFeet: Point
  /** How many times the frameset's resolution this frame is drawn at. */
  resolution: number
}

export type Step = {
  /** The name of a frame in the same frameset. */
  frame: string
  /** In time units; the caller sets how many milliseconds a unit is. */
  duration: number
  /** Only a command of higher priority moves her off this step. */
  priority: number
}

export type Action = {
  steps: Step[]
  /** Where she goes after the last step; null leaves it to the character's default. */
  next: StepRef | null
  /** How she moves on the page during the action; null for the default. The runtime gives it meaning. */
  motion: string | null
}

/** A folder of PNGs and the frameset.toml that says how to play them. */
export type Frameset = {
  /** CSS pixels per image pixel. */
  scale: number
  frames: Record<string, Frame>
  actions: Record<string, Action>
}

/** One frameset's files, as the loader hands them to the character. */
export type FramesetSource = {
  name: string
  toml: string
  /** PNG file names without .png, to their URLs. */
  pngs: Record<string, string>
}
