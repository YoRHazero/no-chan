import { useEffect, useState } from 'react'
import { buttonPeek } from '../no-chan/config'

/** How each NooChanButton on the page starts a peek, for `peekNow`. */
const starters = new Set<() => void>()

/** For the playground: every NooChanButton on the page peeks at once. */
export function peekNow() {
  for (const start of starters) {
    start()
  }
}

/** At least `after`, then at random: the same timing as her idle actions. */
function nextWait() {
  return buttonPeek.after - Math.log(1 - Math.random()) * buttonPeek.mean
}

/**
 * When NooChanButton plays her peek. It is on from a random time until the
 * button calls `end`, as its animation ends. The wait starts over after each
 * peek and each time the pointer leaves, and stops while `pointerOver`: her
 * head is up then anyway.
 */
export function usePeek(pointerOver: boolean): [peeking: boolean, end: () => void] {
  const [peeking, setPeeking] = useState(false)

  useEffect(() => {
    const start = () => setPeeking(true)
    starters.add(start)
    return () => {
      starters.delete(start)
    }
  }, [])

  useEffect(() => {
    if (peeking || pointerOver) {
      return
    }
    let timer = 0
    const wait = () => {
      // A peek in a hidden page would go unseen: it waits for another turn.
      timer = window.setTimeout(() => (document.hidden ? wait() : setPeeking(true)), nextWait())
    }
    wait()
    return () => clearTimeout(timer)
  }, [peeking, pointerOver])

  return [peeking, () => setPeeking(false)]
}
