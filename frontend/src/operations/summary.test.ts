import { expect, it } from 'vitest'

import type { Operation } from './queries'
import { summarize } from './summary'

function operation(sum: number, isProfit: boolean): Operation {
  return { id: 1, sum, category_id: 1, cat_name: 'Тест', is_profit: isProfit }
}

it('считает приход, расход и итог', () => {
  const summary = summarize([operation(85000, true), operation(2350, false), operation(640, false)])
  expect(summary).toEqual({ income: 85000, expense: 2990, net: 82010 })
})

it('складывает копейки без ошибки float', () => {
  // В float 0.1 + 0.2 = 0.30000000000000004
  const summary = summarize([operation(0.1, false), operation(0.2, false)])
  expect(summary.expense).toBe(0.3)
  expect(summary.net).toBe(-0.3)
})

it('пустой месяц даёт нули', () => {
  expect(summarize([])).toEqual({ income: 0, expense: 0, net: 0 })
})
