import { describe, expect, it } from 'vitest'

import { buildBreakdown, OTHER_KEY } from './breakdown'
import type { MonthlyTotal } from './queries'

function month(
  monthNumber: number,
  categories: Array<[id: number, name: string, sum: number, isProfit?: boolean]>,
): MonthlyTotal {
  return {
    year: 2026,
    month: monthNumber,
    income: 0,
    expense: 0,
    categories: categories.map(([id, name, sum, isProfit = false]) => ({
      category_id: id,
      name,
      sum,
      is_profit: isProfit,
    })),
  }
}

describe('buildBreakdown', () => {
  it('раскладывает месяцы по категориям нужного типа', () => {
    const totals = [
      month(8, [
        [1, 'Продукты', 300],
        [2, 'Кафе', 100],
        [9, 'Зарплата', 5000, true],
      ]),
      month(9, [[2, 'Кафе', 600]]),
    ]

    const { series, rows, total } = buildBreakdown(totals, 'spending')

    // Порядок серий — по сумме за период: Кафе 700 больше Продуктов 300
    expect(series.map((s) => [s.name, s.total, s.share])).toEqual([
      ['Кафе', 700, 0.7],
      ['Продукты', 300, 0.3],
    ])
    expect(total).toBe(1000)
    expect(rows[0]).toMatchObject({ label: 'авг', total: 400, c1: 300, c2: 100 })
    // Категория без операций в месяце — ноль, а не пропуск: иначе стопка съедет
    expect(rows[1]).toMatchObject({ label: 'сен', total: 600, c1: 0, c2: 600 })
  })

  it('мелкие категории сверх лимита собирает в «Остальное»', () => {
    const totals = [
      month(9, [
        [1, 'А', 50],
        [2, 'Б', 40],
        [3, 'В', 3],
        [4, 'Г', 2],
      ]),
    ]

    const { series, rows } = buildBreakdown(totals, 'spending', 2)

    expect(series.map((s) => s.name)).toEqual(['А', 'Б', 'Остальное'])
    expect(series[2].members).toEqual(['В', 'Г'])
    expect(rows[0][OTHER_KEY]).toBe(5)
  })

  it('одну лишнюю категорию в «Остальное» не прячет', () => {
    const totals = [
      month(9, [
        [1, 'А', 50],
        [2, 'Б', 40],
        [3, 'В', 3],
      ]),
    ]

    const { series } = buildBreakdown(totals, 'spending', 2)

    expect(series.map((s) => s.name)).toEqual(['А', 'Б', 'В'])
  })

  it('складывает в копейках', () => {
    const totals = [month(8, [[1, 'Кафе', 0.1]]), month(9, [[1, 'Кафе', 0.2]])]

    expect(buildBreakdown(totals, 'spending').total).toBe(0.3)
  })

  it('пустой период: ни серий, ни долей', () => {
    const { series, total, rows } = buildBreakdown([month(9, [])], 'profit')

    expect(series).toEqual([])
    expect(total).toBe(0)
    expect(rows[0].total).toBe(0)
  })
})
