import { describe, expect, it } from 'vitest'

import { addDays, daysInclusive, formatRange, monthRange, parseIsoDate } from './dates'

describe('parseIsoDate', () => {
  it.each(['2026-02-30', '2026-13-01', '2026-9-1', 'вчера', '', null])('%j — не дата', (value) => {
    expect(parseIsoDate(value)).toBeNull()
  })

  it('разбирает високосное 29 февраля', () => {
    expect(parseIsoDate('2028-02-29')).not.toBeNull()
  })
})

it('addDays и daysInclusive переходят через границы месяца и года', () => {
  expect(addDays('2025-12-31', 1)).toBe('2026-01-01')
  expect(daysInclusive('2026-09-01', '2026-09-30')).toBe(30)
  expect(daysInclusive('2025-01-01', '2026-01-01')).toBe(366)
})

it('monthRange даёт последний день месяца, в том числе февраль', () => {
  expect(monthRange({ year: 2026, month: 2 })).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  expect(monthRange({ year: 2026, month: 12 })).toEqual({ from: '2026-12-01', to: '2026-12-31' })
})

describe('formatRange', () => {
  it.each([
    ['2026-09-03', '2026-09-03', '3 сентября 2026'],
    ['2026-09-01', '2026-09-15', '1 — 15 сентября 2026'],
    ['2026-08-28', '2026-09-03', '28 августа — 3 сентября 2026'],
    ['2025-12-20', '2026-01-05', '20 декабря 2025 — 5 января 2026'],
  ])('%s … %s → %s', (from, to, expected) => {
    expect(formatRange(from, to)).toBe(expected)
  })
})
