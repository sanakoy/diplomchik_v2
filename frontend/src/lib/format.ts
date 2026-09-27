const amountFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 85000 → «85 000,00»: как в банковских документах, с копейками. */
export function formatAmount(value: number): string {
  return amountFormatter.format(value)
}

/** 845 → «14:05»: оставшееся время в минутах и секундах. */
export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
