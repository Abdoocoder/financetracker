/**
 * Returns the timezone offset in milliseconds from the TIMEZONE_OFFSET_HOURS env var.
 * Defaults to UTC+3 (GCC/Jordan) if not set.
 */
export function getTimezoneOffsetMs(): number {
  const hours = Number(process.env.TIMEZONE_OFFSET_HOURS) || 3
  return hours * 60 * 60 * 1000
}

/**
 * Returns the current time adjusted to the configured timezone.
 * Uses .getTime() + offset so UTC methods (getUTCHours, getUTCDate, etc.)
 * return local-equivalent values.
 */
export function getLocalNow(): Date {
  return new Date(Date.now() + getTimezoneOffsetMs())
}

export function getZonedHour(instant: Date | null | undefined, timeZone?: string | null): number {
  if (!instant) return 3
  const tz = timeZone || undefined

  try {
    // Use Intl when possible
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      hour: '2-digit',
      timeZoneName: undefined,
    })
    const parts = formatter.formatToParts(instant)
    const hourPart = parts.find((p) => p.type === 'hour')
    if (hourPart && hourPart.value) {
      const h = Number.parseInt(hourPart.value, 10)
      if (!Number.isNaN(h)) return h % 24
    }
  } catch (e) {
    // fall through to offset-based
  }

  if (!tz) return (instant.getUTCHours() + 3) % 24 // default to UTC+3
  return 3 // unknown timezone - fallback
}

export function getZonedHourFromLocalNow(
  localNow: Date | null | undefined,
  timeZone?: string | null
): number {
  if (!localNow) return 6
  // re-project server-local (instant + offset) to the user's timezone
  const serverOffset = getTimezoneOffsetMs()
  const instant = new Date(localNow.getTime() - serverOffset)
  return getZonedHour(instant, timeZone)
}

export function isLocalMorningHour(hour: number): boolean {
  return hour >= 5 && hour < 11
}
