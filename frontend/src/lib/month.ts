export interface YearMonth {
  year: number
  month: number // 1–12, как в API
}

// Названия заданы списком, а не через Intl: Intl с годом даёт «сентябрь 2026 г.»,
// а вывод зависит от версии ICU в браузере и в Node, где идут тесты
const MONTH_NAMES = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
]

export function currentMonth(now = new Date()): YearMonth {
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

/** «2026-09» из адресной строки → месяц. Пустое или кривое значение даёт текущий месяц. */
export function parseMonthParam(value: string | null, now = new Date()): YearMonth {
  const match = value?.match(/^(\d{4})-(\d{2})$/)
  if (!match) return currentMonth(now)
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12 || year < 1900) return currentMonth(now)
  return { year, month }
}

export function formatMonthParam({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

export function isSameMonth(a: YearMonth, b: YearMonth): boolean {
  return a.year === b.year && a.month === b.month
}

/** «сентябрь»: для текста внутри фразы («за сентябрь»). */
export function monthName({ month }: YearMonth): string {
  return MONTH_NAMES[month - 1]
}

/** «Сентябрь 2026»: для заголовка. */
export function monthTitle(value: YearMonth): string {
  const name = monthName(value)
  return `${name[0].toUpperCase()}${name.slice(1)} ${value.year}`
}

/** Сегодняшняя дата по местному времени в формате поля даты: «2026-09-27». */
export function todayIsoDate(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** Месяц, в который попадает дата «2026-09-27». */
export function monthOfIsoDate(isoDate: string): YearMonth {
  return { year: Number(isoDate.slice(0, 4)), month: Number(isoDate.slice(5, 7)) }
}
