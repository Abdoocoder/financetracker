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
