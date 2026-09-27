import { describe, expect, it } from 'vitest'

import { formatDayMonth, formatSignedAmount, parseAmount } from './format'

describe('parseAmount', () => {
  it.each([
    ['1250', 1250],
    ['1250,5', 1250.5],
    ['1250.50', 1250.5],
    ['1 250,50', 1250.5],
    ['1 250,50', 1250.5], // неразрывный пробел из банковского приложения
    [' 99 ', 99],
  ])('%j → %d', (input, expected) => {
    expect(parseAmount(input)).toBe(expected)
  })

  it.each(['', '0', '0,00', '-5', '1,234', '12,5,0', 'abc', '1e3'])('%j отклоняется', (input) => {
    expect(parseAmount(input)).toBeNull()
  })
})

it('formatSignedAmount ставит настоящий минус, а ноль оставляет без знака', () => {
  // Intl разделяет разряды неразрывным пробелом
  expect(formatSignedAmount(85000)).toBe('+85 000,00')
  expect(formatSignedAmount(-2350)).toBe('−2 350,00')
  expect(formatSignedAmount(0)).toBe('0,00')
})

it('formatDayMonth берёт день из строки, без сдвига часового пояса', () => {
  expect(formatDayMonth('2026-09-01T00:00:00')).toBe('01.09')
})
