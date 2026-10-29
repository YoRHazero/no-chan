import type { CharacterOptions } from '../character/character'
import type { RuntimeConfig } from '../runtime/runtime'
import paperBallUrl from './paper-ball.png'

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
