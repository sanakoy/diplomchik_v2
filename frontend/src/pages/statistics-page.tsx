import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { formatAmount, formatSignedAmount } from '@/lib/format'
import { formatMonthParam, monthName, monthShortName, monthTitle } from '@/lib/month'
import { MonthSummary } from '@/operations/month-summary'
import { CategoryBreakdown } from '@/statistics/category-breakdown'
import { useMonthlyTotals, type MonthlyTotal } from '@/statistics/queries'
import { monthNet, sumPeriod } from '@/statistics/totals'

const PERIOD_MONTHS = 12

function capitalize(text: string): string {
  return text[0].toUpperCase() + text.slice(1)
}

function periodTitle(totals: MonthlyTotal[]): string {
  const first = totals[0]
  const last = totals[totals.length - 1]
  return `${monthTitle(first)} — ${monthName(last)} ${last.year}`
}

function MonthsTable({ totals }: { totals: MonthlyTotal[] }) {
  // Новые месяцы сверху, как записи в книжке
  const rows = [...totals].reverse()

  return (
    <table className="w-full border-collapse text-sm sm:text-[15px]">
      <caption className="sr-only">Доходы и расходы по месяцам, новые сверху</caption>
      <thead>
        <tr className="border-b-2 border-ink text-left text-sm text-muted-foreground">
          <th scope="col" className="pb-2 font-normal">
            Месяц
          </th>
          <th scope="col" className="pb-2 text-right font-normal">
            Доход
          </th>
          <th scope="col" className="pb-2 text-right font-normal">
            Расход
          </th>
          <th scope="col" className="pb-2 text-right font-normal">
            Итог
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((total) => {
          const net = monthNet(total)
          const empty = total.income === 0 && total.expense === 0
          return (
            <tr key={formatMonthParam(total)} className="border-b border-rule">
              <th scope="row" className="py-3 pr-2 text-left font-normal">
                {/* Ссылка ведёт в книжку этого месяца: из статистики — к записям */}
                <Link
                  to={`/?month=${formatMonthParam(total)}`}
                  className="underline decoration-rule underline-offset-4 hover:decoration-ink"
                >
                  {/* На телефоне три суммы и «Сентябрь 2026» не помещаются в строку */}
                  <span className="hidden sm:inline">{monthTitle(total)}</span>
                  <span className="sm:hidden" aria-label={monthTitle(total)}>
                    {capitalize(monthShortName(total))} {total.year}
                  </span>
                </Link>
              </th>
              <td className={`amount py-3 pl-2 text-right ${empty ? 'text-muted-foreground' : 'text-income'}`}>
                {formatAmount(total.income)}
              </td>
              <td className={`amount py-3 pl-2 text-right ${empty ? 'text-muted-foreground' : 'text-expense'}`}>
                {formatAmount(total.expense)}
              </td>
              <td
                className={`amount py-3 pl-2 text-right font-medium ${empty ? 'text-muted-foreground' : net < 0 ? 'text-expense' : ''}`}
              >
                {formatSignedAmount(net)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function StatisticsPage() {
  const totals = useMonthlyTotals(PERIOD_MONTHS)

  return (
    <main className="mt-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Статистика</h1>
      <p className="mt-1 text-muted-foreground">
        {totals.data ? periodTitle(totals.data) : `Последние ${PERIOD_MONTHS} месяцев`}
      </p>

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
        <>
          <div className="mt-6">
            <MonthSummary
              netLabel={`Итог за ${PERIOD_MONTHS} месяцев`}
              summary={sumPeriod(totals.data)}
            />
          </div>
          <div className="mt-10">
            <CategoryBreakdown totals={totals.data} />
          </div>
          <section aria-labelledby="months-title" className="mt-12">
            <h2 id="months-title" className="text-lg font-semibold">
              По месяцам
            </h2>
            <div className="mt-4">
              <MonthsTable totals={totals.data} />
            </div>
          </section>
        </>
      )}
    </main>
  )
}
