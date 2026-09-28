import { formatAmount, formatPercent } from '@/lib/format'
import { monthName, type YearMonth } from '@/lib/month'
import { OTHER_COLOR, rankedColors } from '@/lib/palette'

import { useCategories, type OperationKind } from './queries'

const TITLES: Record<OperationKind, string> = {
  spending: 'Структура расходов',
  profit: 'Структура доходов',
}
const EMPTY: Record<OperationKind, string> = {
  spending: 'расходов',
  profit: 'доходов',
}

interface CategorySharesProps {
  kind: OperationKind
  month: YearMonth
}

/**
 * Доли категорий в расходах (или доходах) месяца: одна полоса из частей
 * и легенда с процентами. Полоса, а не круговая диаграмма: длины частей
 * сравниваются точнее углов секторов, а длинные названия не мешают.
 */
export function CategoryShares({ kind, month }: CategorySharesProps) {
  const categories = useCategories(kind, month)
  const titleId = `shares-${kind}`

  // Только категории этого типа и с записями в месяце, от большей суммы к меньшей
  const ranked = (categories.data ?? [])
    .filter((category) => category.is_profit === (kind === 'profit') && (category.cat_sum ?? 0) > 0)
    .sort((a, b) => (b.cat_sum ?? 0) - (a.cat_sum ?? 0) || a.name.localeCompare(b.name, 'ru'))
  const colors = rankedColors(ranked.length)
  // Доли — от итога в копейках: сумма дробных рублей во float неточна
  const totalKopecks = ranked.reduce((sum, category) => sum + Math.round((category.cat_sum ?? 0) * 100), 0)
  const items = ranked.map((category, index) => ({
    id: category.id,
    name: category.name,
    sum: category.cat_sum ?? 0,
    share: Math.round((category.cat_sum ?? 0) * 100) / totalKopecks,
    color: colors[index],
  }))

  // Серые (свёрнутые) категории в полосе — одна часть «Остальное»
  const own = items.filter((item) => item.color !== OTHER_COLOR)
  const folded = items.filter((item) => item.color === OTHER_COLOR)
  const segments = [
    ...own,
    ...(folded.length > 0
      ? [
          {
            id: -1,
            name: 'Остальное',
            sum: folded.reduce((sum, item) => sum + item.sum, 0),
            share: folded.reduce((sum, item) => sum + item.share, 0),
            color: OTHER_COLOR,
          },
        ]
      : []),
  ]

  let body
  if (categories.isError) {
    body = <p className="mt-4 text-sm text-expense">Не удалось загрузить категории.</p>
  } else if (!categories.data) {
    body = <p className="mt-4 text-sm text-muted-foreground">Загрузка…</p>
  } else if (items.length === 0) {
    body = (
      <p className="mt-4 text-muted-foreground">
        За {monthName(month)} {EMPTY[kind]} пока нет.
      </p>
    )
  } else {
    body = (
      <div className={categories.isPlaceholderData ? 'opacity-50 transition-opacity' : ''}>
        {/* Полоса — для глаза; те же цифры в легенде ниже, её и читает скринридер.
            Зазор 2px между частями: без него соседние цвета сливаются */}
        <div aria-hidden="true" className="mt-4 flex h-5 gap-[2px] overflow-hidden rounded-[4px]">
          {segments.map((segment) => (
            <div
              key={segment.id}
              title={`${segment.name}: ${formatAmount(segment.sum)} (${formatPercent(segment.share)})`}
              // min-w: крошечная доля всё равно видна полоской
              className="h-full min-w-[3px]"
              style={{ width: `${segment.share * 100}%`, backgroundColor: segment.color }}
            />
          ))}
        </div>

        {/* columns, а не grid: рейтинг идёт сверху вниз по первой колонке */}
        <ol className="mt-4 gap-x-8 sm:columns-2">
          {items.map((item) => (
            <li key={item.id} className="break-inside-avoid border-b border-rule py-2">
              <div className="flex items-baseline gap-2.5">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 translate-y-px rounded-[2px]"
                  style={{ backgroundColor: item.color }}
                />
                <span className="min-w-0 break-words">{item.name}</span>
                <span className="amount ml-auto text-sm whitespace-nowrap text-muted-foreground">
                  {formatAmount(item.sum)}
                </span>
                <span className="amount w-10 text-right font-medium">{formatPercent(item.share)}</span>
              </div>
            </li>
          ))}
        </ol>
        {folded.length > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Серые категории на полосе показаны вместе, как «Остальное».
          </p>
        )}
      </div>
    )
  }

  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId} className="text-lg font-semibold">
        {TITLES[kind]} за {monthName(month)}
      </h2>
      {body}
    </section>
  )
}
