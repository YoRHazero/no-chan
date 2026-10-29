import type { Frame, Point } from '../character/types'

/** A rectangle in CSS pixels, in the viewport. */
export type Box = { left: number; top: number; width: number; height: number }

/** The size of a PNG in image pixels. */
export type Size = { width: number; height: number }

/** The side of the area she stands by, and how far her feet are from it, in CSS pixels. */
export type Place = { edge: 'left' | 'right'; distance: number }

/** A frame as it is drawn: its PNG's size, its frameset's scale, and whether it is mirrored. */
export type Drawn = { frame: Frame; size: Size; scale: number; mirrored: boolean }

export function right(box: Box) {
  return box.left + box.width
}

export function bottom(box: Box) {
  return box.top + box.height
}

/** `point` of the frame in CSS pixels from the top left of where it is drawn. */
function inBox(drawn: Drawn, point: Point): Point {
  const ratio = drawn.scale / drawn.frame.resolution
  return {
    x: (drawn.mirrored ? drawn.size.width - point.x : point.x) * ratio,
    y: point.y * ratio,
  }
}

/** Where the frame is drawn with her feet at `feet`; mirrored, it flips around them. */
export function boxAt(drawn: Drawn, feet: Point): Box {
  const ratio = drawn.scale / drawn.frame.resolution
  const at = inBox(drawn, drawn.frame.betweenFeet)
  return {
    left: feet.x - at.x,
    top: feet.y - at.y,
    width: drawn.size.width * ratio,
    height: drawn.size.height * ratio,
  }
}

/** Where the frame's anchor is on the page with her feet at `feet`. */
export function anchorAt(drawn: Drawn, feet: Point): Point {
  const box = boxAt(drawn, feet)
  const at = inBox(drawn, drawn.frame.anchor)
  return { x: box.left + at.x, y: box.top + at.y }
}

/** Where her feet are when the frame's anchor is at `anchor`. */
export function feetFor(drawn: Drawn, anchor: Point): Point {
  const at = inBox(drawn, drawn.frame.anchor)
  const feet = inBox(drawn, drawn.frame.betweenFeet)
  return { x: anchor.x - at.x + feet.x, y: anchor.y - at.y + feet.y }
}

/** The place for feet at `x` in `bounds`, measured from the nearer side. */
export function placeOf(x: number, bounds: Box): Place {
  return x - bounds.left < bounds.width / 2
    ? { edge: 'left', distance: x - bounds.left }
    : { edge: 'right', distance: right(bounds) - x }
}

/** Where her feet are, across, for `place` in `bounds`. */
export function xOf(place: Place, bounds: Box): number {
  return place.edge === 'left' ? bounds.left + place.distance : right(bounds) - place.distance
}
