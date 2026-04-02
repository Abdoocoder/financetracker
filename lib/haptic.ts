export type HapticStyle = 'light' | 'medium' | 'heavy'

export function haptic(duration = 50) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(duration)
  }
}

export function hapticImpact(style: HapticStyle) {
  const durations = {
    light: 5,
    medium: 10,
    heavy: 15
  }
  haptic(durations[style])
}
