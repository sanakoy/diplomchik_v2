import type { MonthSummary } from '@/operations/summary'

import type { MonthlyTotal } from './queries'

/** Итог за весь период. Складываем в копейках, как и итоги месяца. */
export function sumPeriod(totals: MonthlyTotal[]): MonthSummary {
  let incomeKopecks = 0
  let expenseKopecks = 0
  for (const total of totals) {
    incomeKopecks += Math.round(total.income * 100)
    expenseKopecks += Math.round(total.expense * 100)
  }
  return {
    income: incomeKopecks / 100,
    expense: expenseKopecks / 100,
    net: (incomeKopecks - expenseKopecks) / 100,
  }
}

/** Разница дохода и расхода за один месяц, без ошибки float. */
export function monthNet(total: MonthlyTotal): number {
  return (Math.round(total.income * 100) - Math.round(total.expense * 100)) / 100
}
