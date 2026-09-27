import { describe, expect, it } from 'vitest'

import { buildBreakdown, OTHER_COLOR, OTHER_KEY, PALETTE } from './breakdown'
import type { PeriodTotals } from './queries'

type CategoryInput = [id: number, name: string, sum: number, isProfit?: boolean]
type DayInput = [day: string, categoryId: number, sum: number]

function totals(categories: CategoryInput[], days: DayInput[] = []): PeriodTotals {
  return {
    income: 0,
    expense: 0,
    categories: categories.map(([id, name, sum, isProfit = false]) => ({
      category_id: id,
      name,
      sum,
      is_profit: isProfit,
    })),
    days: days.map(([day, categoryId, sum]) => ({ day, category_id: categoryId, sum })),
  }
}

describe('buildBreakdown', () => {
  it('раскладывает дни периода по категориям нужного типа', () => {
    const data = totals(
      [
        [1, 'Продукты', 300],
        [2, 'Кафе', 700],
        [9, 'Зарплата', 5000, true],
      ],
      [
        ['2026-09-01', 1, 300],
        ['2026-09-01', 2, 100],
        ['2026-09-01', 9, 5000],
        ['2026-09-03', 2, 600],
      ],
    )

    const breakdown = buildBreakdown(data, 'spending', '2026-09-01', '2026-09-03')

    // Рейтинг от большей суммы к меньшей, цвета — в фиксированном порядке палитры
    expect(breakdown.categories.map((c) => [c.name, c.total, c.share, c.color])).toEqual([
      ['Кафе', 700, 0.7, PALETTE[0]],
      ['Продукты', 300, 0.3, PALETTE[1]],
    ])
    expect(breakdown.total).toBe(1000)
    expect(breakdown.bucket).toBe('day')
    // Каждый день периода — столбик, день без записей тоже: иначе шкала времени соврёт
    expect(breakdown.rows.map((row) => [row.label, row.total, row.c1, row.c2])).toEqual([
      ['1 сен', 400, 300, 100],
      ['2', 0, 0, 0],
      ['3', 600, 0, 600],
    ])
    expect(breakdown.rows[0].title).toBe('1 сентября 2026')
  })

  it('подписывает месяц там, где он сменился', () => {
    const breakdown = buildBreakdown(totals([]), 'spending', '2026-08-30', '2026-09-02')

    expect(breakdown.rows.map((row) => row.label)).toEqual(['30 авг', '31', '1 сен', '2'])
  })

  it('длинный период группирует по месяцам', () => {
    const data = totals(
      [[1, 'Кафе', 30]],
      [
        ['2025-12-31', 1, 10],
        ['2026-01-01', 1, 5],
        ['2026-01-20', 1, 15],
      ],
    )

    const breakdown = buildBreakdown(data, 'spending', '2025-12-01', '2026-02-10')

    expect(breakdown.bucket).toBe('month')
    expect(breakdown.rows.map((row) => [row.label, row.title, row.total])).toEqual([
      ['дек', 'Декабрь 2025', 10],
      ['янв', 'Январь 2026', 20],
      ['фев', 'Февраль 2026', 0],
    ])
  })

  it('когда цветов не хватает, мелкие категории уходят в «Остальное»', () => {
    const categories: CategoryInput[] = [7, 6, 5, 4, 3, 2, 1].map((n) => [n, `К${n}`, n * 10])
    const data = totals(categories, [
      ['2026-09-01', 2, 20],
      ['2026-09-01', 1, 10],
    ])

    const breakdown = buildBreakdown(data, 'spending', '2026-09-01', '2026-09-01')

    // Семь категорий на шесть цветов: пять своих и «Остальное»
    expect(breakdown.series.map((s) => s.name)).toEqual(['К7', 'К6', 'К5', 'К4', 'К3', 'Остальное'])
    expect(breakdown.categories.slice(5).map((c) => c.color)).toEqual([OTHER_COLOR, OTHER_COLOR])
    expect(breakdown.rows[0][OTHER_KEY]).toBe(30)
  })

  it('шесть категорий помещаются без «Остального»', () => {
    const categories: CategoryInput[] = [6, 5, 4, 3, 2, 1].map((n) => [n, `К${n}`, n])

    const breakdown = buildBreakdown(totals(categories), 'spending', '2026-09-01', '2026-09-01')

    expect(breakdown.series).toHaveLength(6)
    expect(breakdown.series.some((s) => s.key === OTHER_KEY)).toBe(false)
  })

  it('складывает в копейках', () => {
    const data = totals([
      [1, 'А', 0.1],
      [2, 'Б', 0.2],
    ])

    expect(buildBreakdown(data, 'spending', '2026-09-01', '2026-09-01').total).toBe(0.3)
  })
})
