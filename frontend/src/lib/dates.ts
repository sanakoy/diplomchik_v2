import type { YearMonth } from './month'

// Даты — строки «2026-09-27», как в API и в поле даты. Арифметика через UTC:
// в местном времени переход на летнее время сдвигал бы сутки на час

// Родительный падеж для «3 сентября»: Intl с одним числом даёт то же,
// но зависит от версии ICU, как и названия месяцев в month.ts
const MONTH_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** «2026-09-27» → Date в UTC; null, если строка не дата или дата несуществующая. */
export function parseIsoDate(value: string | null | undefined): Date | null {
  const match = value?.match(ISO_DATE)
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  // 2026-02-30 Date молча превратил бы в 2 марта
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1) return null
  return date
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(isoDate: string, days: number): string {
  const date = parseIsoDate(isoDate)!
  date.setUTCDate(date.getUTCDate() + days)
  return toIsoDate(date)
}

/** Сколько дней в периоде, оба конца включительно: 1–30 сентября → 30. */
export function daysInclusive(from: string, to: string): number {
  return Math.round((parseIsoDate(to)!.getTime() - parseIsoDate(from)!.getTime()) / 86_400_000) + 1
}

/** Первый и последний день месяца. */
export function monthRange({ year, month }: YearMonth): { from: string; to: string } {
  return {
    from: toIsoDate(new Date(Date.UTC(year, month - 1, 1))),
    // Нулевой день следующего месяца — последний день этого
    to: toIsoDate(new Date(Date.UTC(year, month, 0))),
  }
}

/** Даты календаря (местная полночь) ↔ строки: календарь работает с Date в местном времени. */
export function localDateToIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function isoToLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** «2026-09-03» → «3 сентября». */
export function formatDayLong(isoDate: string): string {
  const date = parseIsoDate(isoDate)!
  return `${date.getUTCDate()} ${MONTH_GENITIVE[date.getUTCMonth()]}`
}

/**
 * Период словами, без повторов: «3 сентября 2026», «1 — 15 сентября 2026»,
 * «28 августа — 3 сентября 2026», «20 декабря 2025 — 5 января 2026».
 */
export function formatRange(from: string, to: string): string {
  const start = parseIsoDate(from)!
  const end = parseIsoDate(to)!
  const endText = `${formatDayLong(to)} ${end.getUTCFullYear()}`
  if (from === to) return endText
  if (start.getUTCFullYear() !== end.getUTCFullYear()) {
    return `${formatDayLong(from)} ${start.getUTCFullYear()} — ${endText}`
  }
  if (start.getUTCMonth() !== end.getUTCMonth()) return `${formatDayLong(from)} — ${endText}`
  return `${start.getUTCDate()} — ${endText}`
}
