import { daysInclusive, formatRange, monthRange, parseIsoDate } from '@/lib/dates'
import {
  currentMonth,
  formatMonthParam,
  monthName,
  monthTitle,
  parseMonthParam,
  type YearMonth,
} from '@/lib/month'

// Столько же разрешает бэк (PERIOD_MAX_DAYS)
export const PERIOD_MAX_DAYS = 366

/** Период статистики: календарный месяц или произвольные даты. */
export type Period =
  | { kind: 'month'; month: YearMonth }
  | { kind: 'range'; from: string; to: string }

/**
 * Период из адреса: ?from=2026-09-01&to=2026-09-15 — даты, ?month=2026-09 —
 * месяц, иначе текущий месяц. Кривые даты тоже дают текущий месяц: ссылку
 * могли поправить руками.
 */
export function parsePeriod(params: URLSearchParams, now = new Date()): Period {
  const from = params.get('from')
  const to = params.get('to')
  if (from !== null || to !== null) {
    const valid =
      parseIsoDate(from) !== null &&
      parseIsoDate(to) !== null &&
      from! <= to! &&
      daysInclusive(from!, to!) <= PERIOD_MAX_DAYS
    if (valid) return { kind: 'range', from: from!, to: to! }
    return { kind: 'month', month: currentMonth(now) }
  }
  return { kind: 'month', month: parseMonthParam(params.get('month'), now) }
}

export function periodToParams(period: Period): Record<string, string> {
  return period.kind === 'month'
    ? { month: formatMonthParam(period.month) }
    : { from: period.from, to: period.to }
}

/** Даты периода включительно — то, что уходит в API. */
export function periodDates(period: Period): { from: string; to: string } {
  return period.kind === 'month' ? monthRange(period.month) : { from: period.from, to: period.to }
}

export function periodTitle(period: Period): string {
  return period.kind === 'month' ? monthTitle(period.month) : formatRange(period.from, period.to)
}

/** Подпись итога: «Итог за сентябрь», «Итог за период». */
export function periodNetLabel(period: Period): string {
  return period.kind === 'month' ? `Итог за ${monthName(period.month)}` : 'Итог за период'
}
