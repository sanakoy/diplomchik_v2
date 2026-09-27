import { expect, it } from 'vitest'

import { monthNet, sumPeriod } from './totals'

const month = (income: number, expense: number) => ({
  year: 2026,
  month: 9,
  income,
  expense,
  categories: [],
})

it('sumPeriod складывает месяцы в копейках', () => {
  expect(sumPeriod([month(0.1, 0.2), month(0.2, 0.1), month(100, 0)])).toEqual({
    income: 100.3,
    expense: 0.3,
    net: 100,
  })
})

it('monthNet без ошибки float', () => {
  // 0.3 - 0.1 во float даёт 0.19999999999999998
  expect(monthNet(month(0.3, 0.1))).toBe(0.2)
  expect(monthNet(month(0, 2350.4))).toBe(-2350.4)
})
