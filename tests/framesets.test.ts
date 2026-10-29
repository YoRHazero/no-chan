import { describe, expect, it } from 'vitest'
import { createCharacter } from '../src/no-chan/load'
import { sizes } from './helpers'

describe('her framesets', () => {
  it('all read without errors', () => {
    const character = createCharacter()
    expect(Object.keys(character.framesets).sort()).toEqual([
      'dragged',
      'duck-sit',
      'falling',
      'phone',
      'request',
      'sleep',
      'standing',
      'sway',
      'troubled',
      'yawn',
    ])
  })

  it('have their anchors and feet inside their PNGs', () => {
    const character = createCharacter()
    for (const [name, frameset] of Object.entries(character.framesets)) {
      for (const [file, frame] of Object.entries(frameset.frames)) {
        const size = sizes.get(frame.url)
        expect(size, `${name}/${file}.png`).toBeDefined()
        for (const point of [frame.anchor, frame.betweenFeet]) {
          expect(point.x, `${name}/${file}.png`).toBeLessThanOrEqual(size?.width ?? 0)
          expect(point.y, `${name}/${file}.png`).toBeLessThanOrEqual(size?.height ?? 0)
        }
      }
    }
  })
})
