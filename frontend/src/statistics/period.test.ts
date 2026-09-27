import { describe, expect, it } from 'vitest'

import { parsePeriod, periodDates, periodTitle } from './period'

const NOW = new Date(2026, 8, 27) // 27 сентября 2026
const parse = (query: string) => parsePeriod(new URLSearchParams(query), NOW)

describe('parsePeriod', () => {
  it('по умолчанию — текущий месяц', () => {
    expect(parse('')).toEqual({ kind: 'month', month: { year: 2026, month: 9 } })
  })

  it('месяц из адреса', () => {
    expect(parse('month=2026-02')).toEqual({ kind: 'month', month: { year: 2026, month: 2 } })
  })

  it('даты из адреса', () => {
    expect(parse('from=2026-09-01&to=2026-09-15')).toEqual({
      kind: 'range',
      from: '2026-09-01',
      to: '2026-09-15',
    })
  })

  it.each([
    'from=2026-09-15&to=2026-09-01', // конец раньше начала
    'from=2026-09-01', // нет конца
    'from=2026-02-30&to=2026-03-01', // несуществующая дата
    'from=2025-01-01&to=2026-01-02', // 367 дней — больше, чем разрешает бэк
  ])('кривой период %s даёт текущий месяц', (query) => {
    expect(parse(query)).toEqual({ kind: 'month', month: { year: 2026, month: 9 } })
  })
})

it('periodDates у месяца — с первого по последнее число', () => {
  expect(periodDates({ kind: 'month', month: { year: 2026, month: 2 } })).toEqual({
    from: '2026-02-01',
    to: '2026-02-28',
  })
})

it('periodTitle', () => {
  expect(periodTitle({ kind: 'month', month: { year: 2026, month: 9 } })).toBe('Сентябрь 2026')
  expect(periodTitle({ kind: 'range', from: '2026-09-01', to: '2026-09-15' })).toBe(
    '1 — 15 сентября 2026',
  )
})
