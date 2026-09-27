import { expect, it } from 'vitest'

import { amountToInput, dateToInput, validateOperationFields } from './validation'

it('validateOperationFields возвращает сумму или ошибки полей', () => {
  expect(validateOperationFields('1 250,5', '2026-09-27')).toEqual({
    sum: 1250.5,
    errors: { amount: undefined, date: undefined },
  })

  const { sum, errors } = validateOperationFields('0', '')
  expect(sum).toBeNull()
  expect(errors.amount).toBeDefined()
  expect(errors.date).toBeDefined()
})

it('amountToInput пишет дробную часть через запятую', () => {
  expect(amountToInput(1500.5)).toBe('1500,5')
  expect(amountToInput(85000)).toBe('85000')
})

it('dateToInput берёт день из даты со временем', () => {
  expect(dateToInput('2026-09-17T15:30:00')).toBe('2026-09-17')
  expect(dateToInput(null)).toBe('')
})
