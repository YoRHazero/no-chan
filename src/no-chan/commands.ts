import type { CommandSpec } from '../runtime/command'
import { events } from '../runtime/runtime'

const standing = 'standing.standing'

/**
 * Everything that makes her switch, besides her actions playing on. A step
 * gives way only to a command of higher priority (README.md). Listed order
 * settles ties between commands of a priority that become ready together.
 */
export const commands: CommandSpec[] = [
  { name: 'hang', target: 'dragged.held', priority: 3, rule: (now) => now.dragging },
  {
    name: 'fall',
    target: 'falling.fall',
    priority: 3,
    rule: (now) => now.inAction('dragged.held') && !now.pressing,
  },
  {
    name: 'land',
    target: 'duck-sit.land',
    priority: 3,
    rule: (now) => now.inAction('falling.fall') && now.onFloor,
  },
  {
    name: 'wake',
    target: 'sleep.wake',
    priority: 2,
    // Only a reaction waiting wakes her: a command left ready from before
    // she sat down would wake her as soon as she did.
    rule: (now) =>
      (now.onStep('sleep.sleep.4') && now.happened(events.input)) ||
      (now.inAction('sleep.sleep') && now.ready('getTroubled')),
  },
  {
    name: 'getTroubled',
    target: 'troubled.troubled',
    priority: 1,
    rule: (now) => now.happened('error'),
  },
  {
    name: 'getHit',
    target: 'request.request',
    priority: 1,
    rule: (now) => now.happened(events.hit),
  },
  {
    name: 'takeOutPhone',
    target: 'phone.out',
    priority: 1,
    rule: (now) => now.hasNotice && now.inAction(standing),
  },
  {
    name: 'putAwayPhone',
    target: 'phone.away',
    priority: 1,
    rule: (now) => !now.hasNotice && now.inAction('phone.out'),
  },
  {
    name: 'idle',
    target: ['yawn.yawn', 'sway.sway'],
    priority: 1,
    // At least 20 seconds, then about 20 more on average.
    rule: (now) => now.inAction(standing) && now.elapsed >= 20_000 && now.chance(1 / 20),
  },
  {
    name: 'sleep',
    target: 'sleep.sleep',
    priority: 1,
    rule: (now) => now.inAction(standing) && now.sinceInput >= 180_000 && now.nearWall,
  },
]
