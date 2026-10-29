import type { Runtime } from '../runtime/runtime'

/** A point in the viewport, in CSS pixels. */
export type ViewportPoint = { x: number; y: number }

/**
 * How the rest of the app reaches her: it tells her what happened. While
 * she is not on the page, what it tells her is dropped.
 */
export type NooChanController = {
  /** Something the user did failed: she looks troubled. */
  notifyError(): void
  /** The user sent a request from `from`, such as the button they pressed: a paper ball hits her. */
  notifyRequest(from: DOMRect | ViewportPoint): void
}

/** Holds her runtime from the first time she appears, so she keeps her place between pages. */
type Hub = { runtime: Runtime | null }

const hubs = new WeakMap<NooChanController, Hub>()

/** Makes a controller; make one for the app, in a module, and give it to NooChan. */
export function createNooChan(): NooChanController {
  const hub: Hub = { runtime: null }
  const controller: NooChanController = {
    notifyError: () => hub.runtime?.notify('error'),
    notifyRequest: (from) =>
      hub.runtime?.request(
        'width' in from ? { x: from.left + from.width / 2, y: from.top + from.height / 2 } : from,
      ),
  }
  hubs.set(controller, hub)
  return controller
}

/** For NooChan: the controller's runtime, made by `create` the first time. */
export function runtimeOf(controller: NooChanController, create: () => Runtime): Runtime {
  const hub = hubs.get(controller)
  if (!hub) {
    throw new Error('NooChan needs a controller made by createNooChan()')
  }
  hub.runtime ??= create()
  return hub.runtime
}
