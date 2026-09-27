import type { Operation } from './queries'

export interface MonthSummary {
  income: number
  expense: number
  /** Доход минус расход: сколько за месяц осталось или ушло в минус. */
  net: number
}

/**
 * Итоги месяца. Складываем в копейках: сумма дробных рублей в float
 * накапливает ошибку (0.1 + 0.2 = 0.30000000000000004).
 */
export function summarize(operations: Operation[]): MonthSummary {
  let incomeKopecks = 0
  let expenseKopecks = 0
  for (const operation of operations) {
    const kopecks = Math.round(operation.sum * 100)
    if (operation.is_profit) incomeKopecks += kopecks
    else expenseKopecks += kopecks
  }
  return {
    income: incomeKopecks / 100,
    expense: expenseKopecks / 100,
    net: (incomeKopecks - expenseKopecks) / 100,
  }
}
