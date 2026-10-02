import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { Segmented } from '@/components/segmented'
import { Button } from '@/components/ui/button'
import { monthRange } from '@/lib/dates'
import { LedgerTable } from '@/operations/ledger-table'
import { MonthSummary } from '@/operations/month-summary'
import { MonthSwitcher } from '@/operations/month-switcher'
import { OperationEditDialog } from '@/operations/operation-edit-dialog'
import { usePeriodOperations, type Operation } from '@/operations/queries'
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
  // Период живёт в адресе, как месяц на главной: работает «Назад», ссылку можно сохранить
  const [searchParams, setSearchParams] = useSearchParams()
  const period = parsePeriod(searchParams)
  const { from, to } = periodDates(period)
  const totals = usePeriodTotals(from, to)
  const operations = usePeriodOperations(from, to)
  // Запись, открытая в диалоге изменения; null — диалог закрыт
  const [editing, setEditing] = useState<Operation | null>(null)

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

      <section aria-labelledby="operations-title" className="mt-12">
        <h2 id="operations-title" className="text-lg font-semibold">
          Записи
        </h2>
        <div className="mt-4">
          {operations.isError ? (
            <div className="border-t-2 border-ink py-6 text-sm">
              <p className="text-expense">Не удалось загрузить записи.</p>
              <Button variant="outline" className="mt-3" onClick={() => void operations.refetch()}>
                Повторить
              </Button>
            </div>
          ) : operations.data === undefined ? (
            <p className="border-t-2 border-ink py-6 text-sm text-muted-foreground">Загрузка…</p>
          ) : operations.data.length === 0 ? (
            <p className="border-t-2 border-ink py-6 text-muted-foreground">За этот период записей нет.</p>
          ) : (
            // Пока грузится другой период, старые строки видны, но приглушены
            <div className={operations.isPlaceholderData ? 'opacity-50 transition-opacity' : ''}>
              <LedgerTable operations={operations.data} onEdit={setEditing} />
            </div>
          )}
        </div>
      </section>

      <OperationEditDialog
        operation={editing}
        onClose={() => setEditing(null)}
        // Период выбран здесь явно: переносить его вслед за записью незачем,
        // список сам обновится после сохранения
        onSaved={() => {}}
      />
    </main>
  )
}
