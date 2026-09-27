const amountFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 85000 → «85 000,00»: как в банковских документах, с копейками. */
export function formatAmount(value: number): string {
  return amountFormatter.format(value)
}

/** Сумма со знаком: «+85 000,00», «−2 350,00». Ноль без знака. */
export function formatSignedAmount(value: number): string {
  if (value > 0) return `+${formatAmount(value)}`
  // U+2212 — настоящий минус: дефис рядом с цифрами короче и тоньше
  if (value < 0) return `−${formatAmount(-value)}`
  return formatAmount(0)
}

/**
 * Сумма из поля ввода: «1 250,5» → 1250.5. Принимает запятую и точку, пробелы
 * между разрядами. null, если это не положительное число с не более чем двумя
 * знаками после запятой. \s в JS ловит и неразрывный пробел, которым
 * банковские приложения разделяют разряды при копировании суммы.
 */
export function parseAmount(input: string): number | null {
  const normalized = input.replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const value = Number(normalized)
  return value > 0 ? value : null
}

/** Дата операции с бэка «2026-09-27T00:00:00» → «27.09». Строка разбирается
 * как есть, без Date: иначе часовой пояс браузера мог бы сдвинуть день. */
export function formatDayMonth(isoDateTime: string): string {
  return `${isoDateTime.slice(8, 10)}.${isoDateTime.slice(5, 7)}`
}

/** 845 → «14:05»: оставшееся время в минутах и секундах. */
export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
