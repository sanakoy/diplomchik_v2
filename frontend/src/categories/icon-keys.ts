/**
 * Ключи иконок категорий: их хранит бэк в category.icon. Здесь только
 * данные, без React, — чтобы подбор иконки проверялся обычными тестами.
 * Сами изображения сопоставлены ключам в icons.tsx.
 */
export const ICON_KEYS = [
  'shopping-cart',
  'utensils',
  'coffee',
  'bus',
  'car',
  'fuel',
  'house',
  'zap',
  'smartphone',
  'wifi',
  'shirt',
  'heart-pulse',
  'pill',
  'dumbbell',
  'gamepad-2',
  'film',
  'tv',
  'gift',
  'graduation-cap',
  'book-open',
  'baby',
  'paw-print',
  'plane',
  'scissors',
  'wrench',
  'receipt',
  'briefcase',
  'laptop',
  'piggy-bank',
  'percent',
  'coins',
  'trending-up',
  'wallet',
  'tag',
] as const

export type IconKey = (typeof ICON_KEYS)[number]

/** Иконка по умолчанию: название ни на что не похоже, и её не выбирали. */
export const DEFAULT_ICON: IconKey = 'tag'

// Начала слов, по которым иконка угадывается из названия. Порядок важен:
// «Проценты по вкладу» должны найти проценты раньше, чем вклад
const KEYWORDS: Array<[IconKey, string[]]> = [
  ['shopping-cart', ['продукт', 'супермаркет', 'магазин', 'еда']],
  ['coffee', ['кофе', 'кофейн']],
  ['utensils', ['кафе', 'ресторан', 'обед', 'доставк', 'столов']],
  ['fuel', ['топлив', 'бензин', 'заправк']],
  ['car', ['машин', 'авто', 'такси', 'парковк']],
  ['bus', ['транспорт', 'проезд', 'метро', 'автобус', 'электричк']],
  ['zap', ['коммунал', 'жкх', 'электри', 'свет']],
  ['house', ['жиль', 'аренд', 'ипотек', 'квартир', 'дом']],
  ['wifi', ['интернет']],
  ['smartphone', ['связь', 'телефон', 'мобил']],
  ['tv', ['подписк', 'стриминг', 'телевид']],
  ['shirt', ['одежд', 'обув']],
  ['pill', ['аптек', 'лекарств']],
  ['heart-pulse', ['здоров', 'медиц', 'врач', 'стомат']],
  ['dumbbell', ['спорт', 'фитнес', 'трениров', 'зал']],
  ['film', ['кино', 'театр']],
  ['gamepad-2', ['развлеч', 'игр', 'хобби']],
  ['gift', ['подар']],
  ['graduation-cap', ['образован', 'учеб', 'курс', 'школ']],
  ['book-open', ['книг']],
  ['baby', ['дет', 'ребен', 'ребён']],
  ['paw-print', ['питом', 'живот', 'кот', 'собак', 'ветерин']],
  ['plane', ['путешеств', 'отпуск', 'отдых', 'билет']],
  ['scissors', ['стрижк', 'красот', 'парикмах', 'салон', 'маникюр']],
  ['wrench', ['ремонт']],
  ['receipt', ['налог', 'штраф', 'комисс']],
  ['percent', ['процент']],
  ['coins', ['кэшбэк', 'кешбэк', 'кэшбек']],
  ['piggy-bank', ['вклад', 'копил', 'сбереж']],
  ['trending-up', ['инвест', 'дивиденд', 'акци']],
  ['laptop', ['фриланс', 'подработ']],
  ['briefcase', ['зарплат', 'аванс', 'работ', 'преми']],
]

export function isIconKey(value: string | null | undefined): value is IconKey {
  return (ICON_KEYS as readonly string[]).includes(value ?? '')
}

/** Иконка по названию: «Продукты» → корзина. null, если не похоже ни на что. */
export function suggestIcon(name: string): IconKey | null {
  const words = name.toLocaleLowerCase('ru').split(/[^a-zа-яё0-9]+/)
  for (const [key, stems] of KEYWORDS) {
    if (words.some((word) => stems.some((stem) => word.startsWith(stem)))) return key
  }
  return null
}

/**
 * Иконка категории: выбранная пользователем, иначе подобранная по названию,
 * иначе по умолчанию. Незнакомый ключ (например, из будущей версии) — тоже
 * подбор, а не пустое место.
 */
export function resolveIcon(category: { icon?: string | null; name: string }): IconKey {
  if (isIconKey(category.icon)) return category.icon
  return suggestIcon(category.name) ?? DEFAULT_ICON
}
