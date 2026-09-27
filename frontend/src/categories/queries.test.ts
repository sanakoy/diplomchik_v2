import { expect, it } from 'vitest'

import { hasCategoryNamed, type Category } from './queries'

function category(id: number, name: string): Category {
  return { id, name, is_profit: false, user_id: 1 }
}

const CATEGORIES = [category(1, 'Кафе'), category(2, 'Продукты')]

it('находит повтор без учёта регистра и пробелов по краям', () => {
  expect(hasCategoryNamed(CATEGORIES, '  кафе ')).toBe(true)
  expect(hasCategoryNamed(CATEGORIES, 'Кафешка')).toBe(false)
})

it('при переименовании не считает повтором саму категорию', () => {
  // «Кафе» → «КАФЕ»: меняется только регистр, это не конфликт с самой собой
  expect(hasCategoryNamed(CATEGORIES, 'КАФЕ', 1)).toBe(false)
  expect(hasCategoryNamed(CATEGORIES, 'Продукты', 1)).toBe(true)
})
