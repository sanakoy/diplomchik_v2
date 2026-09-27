import { useMemo, useState } from 'react'

import { KindToggle } from '@/components/kind-toggle'
import type { OperationKind } from '@/query-client'

import { buildBreakdown } from './breakdown'
import { CategoryChart } from './category-chart'
import { CategoryRanking } from './category-ranking'
import type { MonthlyTotal } from './queries'

const TITLES: Record<OperationKind, string> = {
  spending: 'Расходы по категориям',
  profit: 'Доходы по категориям',
}
const EMPTY: Record<OperationKind, string> = {
  spending: 'Расходов за этот период нет.',
  profit: 'Доходов за этот период нет.',
}

/**
 * Куда уходят деньги и откуда приходят: месяцы стопками по категориям
 * и рейтинг категорий за весь период. Расходы и доходы — переключателем:
 * в одном графике их категории смешались бы.
 */
export function CategoryBreakdown({ totals }: { totals: MonthlyTotal[] }) {
  const [kind, setKind] = useState<OperationKind>('spending')
  const breakdown = useMemo(() => buildBreakdown(totals, kind), [totals, kind])

  return (
    <section aria-labelledby="breakdown-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="breakdown-title" aria-live="polite" className="text-lg font-semibold">
          {TITLES[kind]}
        </h2>
        <KindToggle name="breakdown-kind" value={kind} onChange={setKind} />
      </div>

      {breakdown.series.length === 0 ? (
        <p className="mt-5 border-t-2 border-ink py-6 text-muted-foreground">{EMPTY[kind]}</p>
      ) : (
        <>
          <div className="mt-5">
            <CategoryChart breakdown={breakdown} />
          </div>
          <div className="mt-6">
            <CategoryRanking series={breakdown.series} />
          </div>
        </>
      )}
    </section>
  )
}
