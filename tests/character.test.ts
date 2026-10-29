import { describe, expect, it } from 'vitest'
import { Character } from '../src/character/character'
import type { FramesetSource } from '../src/character/types'

const sources: FramesetSource[] = [
  {
    name: 'a',
    pngs: { '0': 'a0.png' },
    toml: `
scale = 1
anchor = [0, 0]

[actions.own]
next = "b.rest"
steps = [{ frame = "0" }, { frame = "0" }]

[actions.plain]
steps = [{ frame = "0" }]
`,
  },
  {
    name: 'b',
    pngs: { '0': 'b0.png' },
    toml: `
scale = 1
anchor = [0, 0]

[actions.rest]
steps = [{ frame = "0" }]
`,
  },
]

describe('the step after the last', () => {
  const character = new Character(sources, { first: 'a.plain', defaultNext: 'b.rest' })
  const ref = (text: string) => character.ref(text)

  it('is the next step while the action has one', () => {
    expect(character.following(ref('a.own.0'))).toEqual(ref('a.own.1'))
  })

  it("is the action's own next", () => {
    expect(character.following(ref('a.own.1'))).toEqual(ref('b.rest.0'))
  })

  it("is the character's default when the action names none", () => {
    expect(character.following(ref('a.plain.0'))).toEqual(ref('b.rest.0'))
  })

  it('holds the last step when there is no default either', () => {
    const plain = new Character(sources, { first: 'a.plain' })
    expect(plain.following(plain.ref('a.plain.0'))).toEqual(plain.ref('a.plain.0'))
  })
})
