export function haptic(duration = 50) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(duration)
  }
}
