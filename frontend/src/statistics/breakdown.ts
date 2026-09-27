import { monthShortName, monthTitle } from '@/lib/month'
import type { OperationKind } from '@/query-client'

import type { MonthlyTotal } from './queries'

/** Ключ серии «Остальное»: мелкие категории вместе, чтобы цвета различались. */
export const OTHER_KEY = 'other'

// Своих цветов у графика семь: больше на глаз уже не различить.
// Без красного и зелёного: в книжке это цвета расхода и дохода, а тут
// категория расходов, покрашенная зелёным, читалась бы как доход
const PALETTE = ['#2F5D9E', '#D0892E', '#2A8C8C', '#6B4C9A', '#C0587E', '#7D8A2E', '#8C6A4F']
const OTHER_COLOR = '#B8C4BC'

export interface Series {
  key: string
  name: string
  color: string
  /** Сумма за весь период. */
  total: number
  /** Доля в сумме за период, от 0 до 1. */
  share: number
  /** Для «Остального»: какие категории в него вошли. */
  members?: string[]
}

export interface BreakdownRow {
  label: string
  title: string
  /** Сумма месяца по всем категориям этого типа. */
  total: number
  /** Суммы серий: ключ — Series.key. */
  [seriesKey: string]: string | number
}

export interface Breakdown {
  series: Series[]
  rows: BreakdownRow[]
  total: number
}

const toKopecks = (value: number) => Math.round(value * 100)

/**
 * Разбивка месяцев периода по категориям одного типа: для накопительного
 * графика и рейтинга под ним. Все суммы складываются в копейках.
 */
export function buildBreakdown(
  totals: MonthlyTotal[],
  kind: OperationKind,
  maxSeries = PALETTE.length,
): Breakdown {
  const isProfit = kind === 'profit'

  // Суммы категорий за весь период: по ним выбираются крупнейшие
  const periodKopecks = new Map<number, { name: string; kopecks: number }>()
  for (const month of totals) {
    for (const category of month.categories) {
      if (category.is_profit !== isProfit) continue
      const entry = periodKopecks.get(category.category_id) ?? { name: category.name, kopecks: 0 }
      entry.kopecks += toKopecks(category.sum)
      periodKopecks.set(category.category_id, entry)
    }
  }

  const ranked = [...periodKopecks.entries()].sort(
    ([, a], [, b]) => b.kopecks - a.kopecks || a.name.localeCompare(b.name, 'ru'),
  )
  // Одну лишнюю категорию в «Остальное» не прячем: серия из одной категории
  // ничего не упрощает, а название теряется
  const ownCount = ranked.length > maxSeries + 1 ? maxSeries : ranked.length
  const own = ranked.slice(0, ownCount)
  const seriesKeyOf = new Map(own.map(([id]) => [id, `c${id}`]))

  const totalKopecks = ranked.reduce((sum, [, entry]) => sum + entry.kopecks, 0)
  const otherKopecks = ranked.slice(ownCount).reduce((sum, [, entry]) => sum + entry.kopecks, 0)
  const share = (kopecks: number) => (totalKopecks > 0 ? kopecks / totalKopecks : 0)

  const series: Series[] = own.map(([id, entry], index) => ({
    key: `c${id}`,
    name: entry.name,
    color: PALETTE[index],
    total: entry.kopecks / 100,
    share: share(entry.kopecks),
  }))
  if (otherKopecks > 0) {
    series.push({
      key: OTHER_KEY,
      name: 'Остальное',
      color: OTHER_COLOR,
      total: otherKopecks / 100,
      share: share(otherKopecks),
      members: ranked.slice(ownCount).map(([, entry]) => entry.name),
    })
  }

  const rows = totals.map((month) => {
    const kopecks: Record<string, number> = Object.fromEntries(series.map((s) => [s.key, 0]))
    let monthKopecks = 0
    for (const category of month.categories) {
      if (category.is_profit !== isProfit) continue
      const key = seriesKeyOf.get(category.category_id) ?? OTHER_KEY
      kopecks[key] += toKopecks(category.sum)
      monthKopecks += toKopecks(category.sum)
    }
    const row: BreakdownRow = {
      label: monthShortName(month),
      title: monthTitle(month),
      total: monthKopecks / 100,
    }
    for (const [key, value] of Object.entries(kopecks)) row[key] = value / 100
    return row
  })

  return { series, rows, total: totalKopecks / 100 }
}
