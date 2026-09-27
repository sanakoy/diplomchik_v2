import { useSearchParams } from 'react-router'

import { Segmented } from '@/components/segmented'
import { Button } from '@/components/ui/button'
import { monthRange } from '@/lib/dates'
import { MonthSummary } from '@/operations/month-summary'
import { MonthSwitcher } from '@/operations/month-switcher'
import { CategoryBreakdown } from '@/statistics/category-breakdown'
import { DateRangePicker } from '@/statistics/date-range-picker'
import {
  parsePeriod,
  periodDates,
  periodNetLabel,
  periodTitle,
  periodToParams,
  type Period,
} from '@/statistics/period'
import { usePeriodTotals, type PeriodTotals } from '@/statistics/queries'

const MODE_OPTIONS = [
  { value: 'month', label: 'Месяц' },
  { value: 'range', label: 'Период' },
] as const

/** Итоги из ответа API. Итог — в копейках: разность дробных рублей во float неточна. */
function summaryOf(totals: PeriodTotals) {
  const net = (Math.round(totals.income * 100) - Math.round(totals.expense * 100)) / 100
  return { income: totals.income, expense: totals.expense, net }
}

export function StatisticsPage() {
  // Период живёт в адресе, как месяц в книжке: работает «Назад», ссылку можно сохранить
  const [searchParams, setSearchParams] = useSearchParams()
  const period = parsePeriod(searchParams)
  const { from, to } = periodDates(period)
  const totals = usePeriodTotals(from, to)

  function showPeriod(next: Period) {
    setSearchParams(periodToParams(next))
  }

  // Переключение сохраняет контекст: месяц становится периодом с 1-го
  // по последнее число, а период — месяцем, в котором он начинается
  function changeMode(mode: Period['kind']) {
    if (mode === 'range' && period.kind === 'month') {
      showPeriod({ kind: 'range', ...monthRange(period.month) })
    } else if (mode === 'month' && period.kind === 'range') {
      const month = { year: Number(period.from.slice(0, 4)), month: Number(period.from.slice(5, 7)) }
      showPeriod({ kind: 'month', month })
    }
  }

  return (
    <main className="mt-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Статистика</h1>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
        <Segmented
          name="period-mode"
          legend="Период"
          options={MODE_OPTIONS}
          value={period.kind}
          onChange={changeMode}
        />
        {period.kind === 'range' && (
          <DateRangePicker
            from={period.from}
            to={period.to}
            onChange={(nextFrom, nextTo) => showPeriod({ kind: 'range', from: nextFrom, to: nextTo })}
          />
        )}
      </div>

      {period.kind === 'month' && (
        <div className="mt-4">
          <MonthSwitcher
            month={period.month}
            titleAs="h2"
            onChange={(month) => showPeriod({ kind: 'month', month })}
          />
        </div>
      )}

      {totals.isError ? (
        <div className="mt-8 border-t-2 border-ink py-6 text-sm">
          <p className="text-expense">Не удалось загрузить статистику.</p>
          <Button variant="outline" className="mt-3" onClick={() => void totals.refetch()}>
            Повторить
          </Button>
        </div>
      ) : !totals.data ? (
        <p className="mt-8 border-t-2 border-ink py-6 text-sm text-muted-foreground">Загрузка…</p>
      ) : (
        // Пока грузится другой период, прежние цифры видны, но приглушены
        <div className={totals.isPlaceholderData ? 'opacity-50 transition-opacity' : ''}>
          <div className="mt-6">
            {/* Для скринридера: за какой период цифры ниже */}
            <p className="sr-only" aria-live="polite">
              {periodTitle(period)}
            </p>
            <MonthSummary netLabel={periodNetLabel(period)} summary={summaryOf(totals.data)} />
          </div>
          <div className="mt-10">
            <CategoryBreakdown totals={totals.data} from={from} to={to} />
          </div>
        </div>
      )}
    </main>
  )
}
