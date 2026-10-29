import { Component, lazy, Suspense, type ReactNode, type RefObject } from 'react'
import type { NooChanController } from './controller'

export type NooChanProps = {
  controller: NooChanController
  /** The element she lives in: its bottom is the floor, its sides the walls. The window if left out. */
  bounds?: RefObject<HTMLElement | null>
  /** Milliseconds per time unit of her frames' durations; 100 if left out. */
  timeUnit?: number
  /** Whether the app has notices for the user (noobenkyo: the inbox has something). She reads her phone while it has. */
  hasNotice?: boolean
  /** She was clicked, without being dragged, while reading her phone. */
  onClick?: () => void
}

// Her frames, runtime and drawing load in a chunk of their own, the first time she is shown.
const Stage = lazy(() => import('./stage'))

/** She is decoration: if she fails to load, she is left out rather than taking the page down. */
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** Her, standing at the bottom of the page. Nothing is drawn until her frames have loaded. */
export function NooChan(props: NooChanProps) {
  return (
    <Boundary>
      <Suspense fallback={null}>
        <Stage {...props} />
      </Suspense>
    </Boundary>
  )
}
