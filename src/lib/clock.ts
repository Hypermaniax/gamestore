// Clock module — ref: docs/PLAN.md §8.1 "Langkah 0" (injectable time for tests).
// All time-dependent domain logic and jobs must use Clock, never new Date() directly.

export interface Clock {
  now(): Date
}

export const realClock: Clock = {
  now: () => new Date(),
}

/** Fake clock for tests: set initial time, advance it, or set a specific time. */

export function createFakeClock(startAt: Date | string = '2026-01-01T00:00:00.000Z'): Clock & {
  advanceBy(millis: number): void
  setTo(time: Date | string): void
} {
  let now = new Date(startAt)
  return {
    now: () => new Date(now),
    advanceBy(millis: number) {
      now = new Date(now.getTime() + millis)
    },
    setTo(time: Date | string) {
      now = new Date(time)
    },
  }
}
