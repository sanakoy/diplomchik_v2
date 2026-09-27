import { formatAmount, formatSignedAmount } from '@/lib/format'
import { monthName, type YearMonth } from '@/lib/month'

import type { MonthSummary as Summary } from './summary'

export function MonthSummary({ month, summary }: { month: YearMonth; summary: Summary }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y-[3px] border-double border-ink py-5 sm:grid-cols-[auto_auto_1fr]">
      <div>
        <dt className="text-sm text-muted-foreground">Доход</dt>
        <dd className="amount mt-1 text-lg font-medium text-income">
          {formatAmount(summary.income)}
        </dd>
      </div>
      <div>
        <dt className="text-sm text-muted-foreground">Расход</dt>
        <dd className="amount mt-1 text-lg font-medium text-expense">
          {formatAmount(summary.expense)}
        </dd>
      </div>
      {/* Итог — главная цифра страницы, как остаток в книжке */}
      <div className="col-span-2 sm:col-span-1 sm:text-right">
        <dt className="text-sm text-muted-foreground">Итог за {monthName(month)}</dt>
        <dd
          className={`amount mt-1 text-4xl font-semibold tracking-tight ${summary.net < 0 ? 'text-expense' : ''}`}
        >
          {formatSignedAmount(summary.net)}
        </dd>
      </div>
    </dl>
  )
}
