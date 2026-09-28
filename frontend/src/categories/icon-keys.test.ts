import { describe, expect, it } from 'vitest'

import { resolveIcon, suggestIcon } from './icon-keys'

describe('suggestIcon', () => {
  it.each([
    ['Продукты', 'shopping-cart'],
    ['Кафе', 'utensils'],
    ['Кофе с собой', 'coffee'],
    ['Коммуналка', 'zap'],
    ['Транспорт', 'bus'],
    ['Такси', 'car'],
    ['Связь', 'smartphone'],
    ['Здоровье', 'heart-pulse'],
    ['Зарплата', 'briefcase'],
    ['Фриланс', 'laptop'],
    // Порядок правил: проценты раньше вклада
    ['Проценты по вкладу', 'percent'],
    ['Кэшбэк', 'coins'],
    ['ПОДАРКИ', 'gift'],
  ])('%s → %s', (name, icon) => {
    expect(suggestIcon(name)).toBe(icon)
  })

  it('сравнивает начала слов, а не куски внутри: «Скотч» — не «кот»', () => {
    expect(suggestIcon('Скотч')).toBeNull()
  })

  it('незнакомое название — null', () => {
    expect(suggestIcon('Разное')).toBeNull()
  })
})

describe('resolveIcon', () => {
  it('выбранная иконка важнее подбора по названию', () => {
    expect(resolveIcon({ name: 'Продукты', icon: 'gift' })).toBe('gift')
  })

  it('без иконки — подбор по названию, иначе иконка по умолчанию', () => {
    expect(resolveIcon({ name: 'Продукты', icon: null })).toBe('shopping-cart')
    expect(resolveIcon({ name: 'Разное', icon: null })).toBe('tag')
  })

  it('незнакомый ключ не ломает показ', () => {
    expect(resolveIcon({ name: 'Кафе', icon: 'rocket-from-future' })).toBe('utensils')
  })
})
