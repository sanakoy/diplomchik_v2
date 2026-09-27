import { describe, expect, it } from 'vitest'

import { monthTitle, parseMonthParam, shiftMonth, todayIsoDate } from './month'

const NOW = new Date(2026, 8, 27) // 27 сентября 2026, месяцы в Date с нуля

describe('parseMonthParam', () => {
  it('разбирает год и месяц из адреса', () => {
    expect(parseMonthParam('2025-03', NOW)).toEqual({ year: 2025, month: 3 })
  })

  it.each([null, '', '2026-13', '2026-00', '2026-9', 'сентябрь', '0999-01'])(
    'на %j возвращает текущий месяц',
    (value) => {
      expect(parseMonthParam(value, NOW)).toEqual({ year: 2026, month: 9 })
    },
  )
})

describe('shiftMonth', () => {
  it('переходит через границу года в обе стороны', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
  })
})

it('monthTitle пишет месяц с заглавной и без «г.»', () => {
  expect(monthTitle({ year: 2026, month: 9 })).toBe('Сентябрь 2026')
})

it('todayIsoDate дополняет месяц и день нулями', () => {
  expect(todayIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
})
