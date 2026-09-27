import { useEffect, useState } from 'react'

/** Сколько секунд осталось до момента deadline (в мс). Обновляется раз в секунду. */
export function useCountdown(deadline: number | null): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (deadline === null) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [deadline])

  if (deadline === null) return 0
  return Math.max(0, Math.ceil((deadline - now) / 1000))
}
