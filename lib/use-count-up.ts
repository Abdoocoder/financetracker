import { useEffect, useState, useRef } from 'react'

export function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(target) // ابدأ بالقيمة الحقيقية مباشرة
  const startTime = useRef<number | null>(null)
  const rafRef = useRef<number | undefined>(undefined)
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      setValue(0) // ابدأ من 0 بعد mount فقط
    }
    if (target === 0) { setValue(0); return }
    startTime.current = null

    function animate(timestamp: number) {
      if (!startTime.current) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(target * eased)
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
      else setValue(target)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return value
}
