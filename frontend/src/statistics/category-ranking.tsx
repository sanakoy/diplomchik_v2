import { formatAmount } from '@/lib/format'

import { OTHER_COLOR, type RankedCategory } from './breakdown'
import { percentFormatter } from './category-chart'

/**
 * Все категории периода от большей суммы к меньшей: легенда графика и его
 * табличный вид сразу — скринридер и распечатка читают цифры отсюда.
 */
export function CategoryRanking({ categories }: { categories: RankedCategory[] }) {
  const folded = categories.some((category) => category.color === OTHER_COLOR)

  return (
    <>
      {/* ol: порядок здесь и есть смысл. columns, а не grid: рейтинг идёт
          сверху вниз по первой колонке, потом по второй, а не зигзагом */}
      <ol className="gap-x-8 sm:columns-2">
        {categories.map((category) => (
          <li key={category.id} className="break-inside-avoid border-b border-rule py-2.5">
            <div className="flex items-baseline gap-2.5">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 translate-y-px rounded-[2px]"
                style={{ backgroundColor: category.color }}
              />
              <span className="min-w-0 break-words">{category.name}</span>
              <span className="amount ml-auto whitespace-nowrap">{formatAmount(category.total)}</span>
              <span className="amount w-10 text-right text-sm text-muted-foreground">
                {percentFormatter.format(category.share)}
              </span>
            </div>
          </li>
        ))}
      </ol>
      {folded && (
        <p className="mt-3 text-sm text-muted-foreground">
          Серые категории на графике показаны вместе, как «Остальное».
        </p>
      )}
    </>
  )
}
