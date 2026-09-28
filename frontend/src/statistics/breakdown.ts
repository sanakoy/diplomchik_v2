import { addDays, daysInclusive, formatDayLong } from '@/lib/dates'
import { monthShortName, monthTitle } from '@/lib/month'
import { OTHER_COLOR, PALETTE, rankedColors } from '@/lib/palette'
import type { OperationKind } from '@/query-client'

import type { PeriodTotals } from './queries'

/** Ключ серии «Остальное»: мелкие категории вместе, чтобы цвета различались. */
export const OTHER_KEY = 'other'

export { OTHER_COLOR, PALETTE }

// Дольше двух месяцев по дням не читается: на телефоне столбики тоньше пикселя
export const DAILY_MAX_DAYS = 62

export interface RankedCategory {
  id: number
  name: string
  total: number
  /** Доля в сумме за период, от 0 до 1. */
  share: number
  color: string
}

export interface Series {
  key: string
  name: string
  color: string
}

export interface BreakdownRow {
  label: string
  title: string
  /** Сумма столбика по всем категориям этого типа. */
  total: number
  /** Суммы серий: ключ — Series.key. */
  [seriesKey: string]: string | number
}

export interface Breakdown {
  /** Все категории типа за период, от большей суммы к меньшей. */
  categories: RankedCategory[]
  series: Series[]
  rows: BreakdownRow[]
  total: number
  bucket: 'day' | 'month'
}

const toKopecks = (value: number) => Math.round(value * 100)

interface Bucket {
  key: string
  label: string
  title: string
}

/** Столбики графика: каждый день периода или каждый месяц, пустые тоже. */
function buildBuckets(from: string, to: string): { bucket: 'day' | 'month'; buckets: Bucket[] } {
  if (daysInclusive(from, to) <= DAILY_MAX_DAYS) {
    const buckets: Bucket[] = []
    for (let day = from; day <= to; day = addDays(day, 1)) {
      const [year, month, dayOfMonth] = day.split('-').map(Number)
      // Месяц подписываем у первого столбика и там, где он сменился
      const withMonth = day === from || dayOfMonth === 1
      buckets.push({
        key: day,
        label: withMonth ? `${dayOfMonth} ${monthShortName({ year, month })}` : String(dayOfMonth),
        title: `${formatDayLong(day)} ${year}`,
      })
    }
    return { bucket: 'day', buckets }
  }

  const buckets: Bucket[] = []
  let year = Number(from.slice(0, 4))
  let month = Number(from.slice(5, 7))
  const last = to.slice(0, 7)
  for (;;) {
    const key = `${year}-${String(month).padStart(2, '0')}`
    if (key > last) break
    buckets.push({ key, label: monthShortName({ year, month }), title: monthTitle({ year, month }) })
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return { bucket: 'month', buckets }
}

/**
 * Разбивка периода по категориям одного типа: для накопительного графика
 * и рейтинга под ним. Все суммы складываются в копейках.
 */
export function buildBreakdown(
  totals: PeriodTotals,
  kind: OperationKind,
  from: string,
  to: string,
): Breakdown {
  const isProfit = kind === 'profit'
  const ranked = totals.categories
    .filter((category) => category.is_profit === isProfit)
    .sort((a, b) => b.sum - a.sum || a.name.localeCompare(b.name, 'ru'))

  const colors = rankedColors(ranked.length)
  const ownCount = colors.filter((color) => color !== OTHER_COLOR).length
  const totalKopecks = ranked.reduce((sum, category) => sum + toKopecks(category.sum), 0)
  const share = (kopecks: number) => (totalKopecks > 0 ? kopecks / totalKopecks : 0)

  const seriesKeyOf = new Map<number, string>()
  const categories: RankedCategory[] = ranked.map((category, index) => {
    const own = index < ownCount
    seriesKeyOf.set(category.category_id, own ? `c${category.category_id}` : OTHER_KEY)
    return {
      id: category.category_id,
      name: category.name,
      total: category.sum,
      share: share(toKopecks(category.sum)),
      color: colors[index],
    }
  })

  const series: Series[] = categories
    .slice(0, ownCount)
    .map((category) => ({ key: `c${category.id}`, name: category.name, color: category.color }))
  if (ranked.length > ownCount) {
    series.push({ key: OTHER_KEY, name: 'Остальное', color: OTHER_COLOR })
  }

  const { bucket, buckets } = buildBuckets(from, to)
  const kopecksByBucket = new Map(
    buckets.map((b) => [b.key, Object.fromEntries(series.map((s) => [s.key, 0])) as Record<string, number>]),
  )
  for (const row of totals.days) {
    const key = seriesKeyOf.get(row.category_id)
    // Категория другого типа: в этом графике её нет
    if (key === undefined) continue
    const bucketKey = bucket === 'day' ? row.day : row.day.slice(0, 7)
    const sums = kopecksByBucket.get(bucketKey)
    if (sums) sums[key] += toKopecks(row.sum)
  }

  const rows = buckets.map((b) => {
    const sums = kopecksByBucket.get(b.key)!
    const row: BreakdownRow = {
      label: b.label,
      title: b.title,
      total: Object.values(sums).reduce((sum, value) => sum + value, 0) / 100,
    }
    for (const [key, value] of Object.entries(sums)) row[key] = value / 100
    return row
  })

  return { categories, series, rows, total: totalKopecks / 100, bucket }
}
