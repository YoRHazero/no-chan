import { describe, expect, it } from 'vitest'
import { harness } from './helpers'

describe('commands', () => {
  it('move her at once when they outrank her step', () => {
    const { runtime, action, run } = harness()
    runtime.notify('error')
    run(1 / 60)
    expect(action()).toBe('troubled.troubled')
  })

  it('stay ready until she reaches a step they outrank', () => {
    const { runtime, action, run, until, drag } = harness()
    drag()
    run(0.2)
    expect(action()).toBe('dragged.held')
    runtime.notify('error')
    run(1)
    expect(action()).toBe('dragged.held')
    runtime.pointer('up', 500, 300)
    expect(until('duck-sit.land')).toBe('duck-sit.land')
    expect(until('troubled.troubled')).toBe('troubled.troubled')
  })

  it('do not restart the action she is already on', () => {
    const { runtime, run, drag } = harness()
    drag()
    const steps = new Set<number>()
    for (let i = 0; i < 60; i++) {
      run(1 / 60)
      steps.add(runtime.step.step)
    }
    // Held, she swings through all four frames instead of being sent back to the first.
    expect([...steps].sort()).toEqual([0, 1, 2, 3])
  })
})

describe('time', () => {
  it("plays each step for its duration, then goes where the action's next leads", () => {
    const { runtime, action, run } = harness()
    runtime.notify('error')
    run(1 / 60)
    // Troubled is 22 time units: 2.2 seconds.
    run(2.1)
    expect(action()).toBe('troubled.troubled')
    run(0.2)
    expect(action()).toBe('standing.standing')
  })
})

describe('switching framesets', () => {
  it('keeps her feet where they were', () => {
    const { runtime, action, drag } = harness()
    const before = runtime.position
    drag()
    // A frame of no time: she is picked up, and her hand has not yet moved towards the cursor.
    runtime.frame(0)
    expect(action()).toBe('dragged.held')
    expect(runtime.position).toEqual(before)
  })
})
