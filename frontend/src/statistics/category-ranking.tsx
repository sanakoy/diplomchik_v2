import { formatAmount } from '@/lib/format'

import type { Series } from './breakdown'
import { percentFormatter } from './category-chart'

/** Легенда графика и рейтинг сразу: на что больше всего ушло или откуда пришло. */
export function CategoryRanking({ series }: { series: Series[] }) {
  return (
    // ol: порядок здесь и есть смысл — от большей суммы к меньшей.
    // columns, а не grid: рейтинг идёт сверху вниз по первой колонке,
    // потом по второй, а не зигзагом слева направо
    <ol className="gap-x-8 sm:columns-2">
      {series.map((s) => (
        <li key={s.key} className="break-inside-avoid border-b border-rule py-2.5">
          <div className="flex items-baseline gap-2.5">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 translate-y-px rounded-[2px]"
              style={{ backgroundColor: s.color }}
            />
            <span className="min-w-0 break-words">{s.name}</span>
            <span className="amount ml-auto whitespace-nowrap">{formatAmount(s.total)}</span>
            <span className="amount w-10 text-right text-sm text-muted-foreground">
              {percentFormatter.format(s.share)}
            </span>
          </div>
          {s.members && (
            <p className="mt-1 pl-5 text-sm text-muted-foreground">{s.members.join(', ')}</p>
          )}
        </li>
      ))}
    </ol>
  )
}
