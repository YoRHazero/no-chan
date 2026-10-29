import type { CharacterOptions } from '../character/character'
import type { RuntimeConfig } from '../runtime/runtime'
import buttonHandsUrl from './button-hands.png'
import buttonHeadUrl from './button-head.png'
import paperBallUrl from './paper-ball.png'
import peekUrl from './peek.png'

const standing = 'standing.standing'

export const characterOptions: CharacterOptions = {
  first: standing,
  defaultNext: standing,
}

export const runtimeConfig: RuntimeConfig = {
  first: standing,
  firstPlace: { edge: 'right', distance: 80 },
  clickable: ['phone.out'],
  dragSlop: 4,
  inputDistance: 30,
  motions: { catchUp: 0.08, gravity: 2600, shuffle: 0.4 },
  paperBall: {
    command: 'getHit',
    pickUp: 'request.request.3',
    hitAt: { x: 0, y: -96 },
    restAt: { x: -16, y: -4 },
    flight: 4.5,
    bounce: 4.5,
    spin: 54,
    arc: 120,
  },
}

/** The paper ball's picture and its size on the page, in CSS pixels. */
export const paperBallImage = { url: paperBallUrl, size: 10 }

/**
 * Her peeking over the top of NooChanDialog's phone, which is 360 CSS pixels
 * wide at full size. `width` is hers on that phone; `edge` is how far down
 * the picture the phone's top edge runs, where her body is cut off. The PNG
 * is drawn at twice that size.
 */
export const peekImage = { url: peekUrl, width: 220, edge: 183.5 }

/**
 * Her in NooChanButton, behind its bottom edge: `head` is her head and body,
 * `hands` her hands on the edge in front of them. Both pictures are one
 * frame, `width` × `height` CSS pixels, whose bottom is the edge, where her
 * body is cut off; the PNGs are drawn at twice that size. `rest`, `raised`
 * and `pressed` are how far below that her head sits: at rest only her ears
 * and the top of her head show behind her hands; raised, her face does.
 */
export const buttonImage = {
  head: buttonHeadUrl,
  hands: buttonHandsUrl,
  width: 37,
  height: 34,
  rest: 22,
  raised: 2.5,
  pressed: 6,
}

/**
 * How long NooChanButton waits before she peeks out of it, in milliseconds:
 * at least `after`, then `mean` more on average, as with her idle actions.
 */
export const buttonPeek = { after: 20_000, mean: 20_000 }
