import { Character } from '../character/character'
import type { FramesetSource } from '../character/types'
import { characterOptions } from './config'

const tomls = import.meta.glob<string>('./framesets/*/frameset.toml', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const pngs = import.meta.glob<string>('./framesets/*/*.png', { import: 'default', eager: true })

/** `./framesets/yawn/3.png` → ['yawn', '3'] */
function place(path: string): [string, string] {
  const [, , folder = '', file = ''] = path.split('/')
  return [folder, file.replace(/\.[^.]+$/, '')]
}

/** Her framesets' files: each folder's frameset.toml and PNGs. */
export const framesetSources: FramesetSource[] = Object.entries(tomls).map(([path, toml]) => {
  const [name] = place(path)
  const own: Record<string, string> = {}
  for (const [file, url] of Object.entries(pngs)) {
    const [folder, frame] = place(file)
    if (folder === name) {
      own[frame] = url
    }
  }
  return { name, toml, pngs: own }
})

/** A new character from her framesets; throws if any is not as it should be. */
export function createCharacter(): Character {
  return new Character(framesetSources, characterOptions)
}
