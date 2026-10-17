/**
 * @jest-environment node
 *
 * Task 2.2 — per-user local-hour helpers used to gate morning greetings.
 */
import {
  getZonedHour,
  getZonedHourFromLocalNow,
  isLocalMorningHour,
} from '@/lib/timezone'

describe('getZonedHour', () => {
  it('returns the hour in the user timezone (Asia/Amman = UTC+3)', () => {
    expect(getZonedHour(new Date('2026-10-17T00:30:00Z'), 'Asia/Amman')).toBe(3)
  })

  it('returns the hour in a far-away timezone (Asia/Tokyo)', () => {
    expect(getZonedHour(new Date('2026-10-17T00:30:00Z'), 'Asia/Tokyo')).toBe(9)
  })

  it('handles UTC exactly', () => {
    expect(getZonedHour(new Date('2026-10-17T00:30:00Z'), 'UTC')).toBe(0)
  })

  it('falls back to the configured server offset for unknown timezones', () => {
    expect(getZonedHour(new Date('2026-10-17T00:30:00Z'), 'Not/AZone')).toBe(3)
    expect(getZonedHour(new Date('2026-10-17T00:30:00Z'), null)).toBe(3)
  })
})

describe('getZonedHourFromLocalNow', () => {
  it('re-projects a getLocalNow() value (instant + server offset) into another timezone', () => {
    // 06:00 server-local (UTC+3) === 03:00Z instant === 12:00 in Tokyo
    const localNow = new Date('2026-09-10T06:00:00Z')
    expect(getZonedHourFromLocalNow(localNow, 'Asia/Tokyo')).toBe(12)
  })

  it('keeps the server-local hour when no timezone is stored', () => {
    const localNow = new Date('2026-09-10T06:00:00Z')
    expect(getZonedHourFromLocalNow(localNow, null)).toBe(6)
    expect(getZonedHourFromLocalNow(localNow, undefined)).toBe(6)
  })
})

describe('isLocalMorningHour', () => {
  it('only accepts 05:00–10:59 user-local time', () => {
    expect(isLocalMorningHour(3)).toBe(false)
    expect(isLocalMorningHour(4)).toBe(false)
    expect(isLocalMorningHour(5)).toBe(true)
    expect(isLocalMorningHour(6)).toBe(true)
    expect(isLocalMorningHour(10)).toBe(true)
    expect(isLocalMorningHour(11)).toBe(false)
    expect(isLocalMorningHour(23)).toBe(false)
  })
})
