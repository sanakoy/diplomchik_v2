import { useQuery } from '@tanstack/react-query'

import { api } from '@/api/client'
import type { components } from '@/api/schema'
import { queryKeys } from '@/query-client'

export type MonthlyTotal = components['schemas']['MonthlyTotal']

/** Доходы и расходы за последние months месяцев, от старых к новым. */
export function useMonthlyTotals(months: number) {
  return useQuery({
    queryKey: queryKeys.monthlyTotals(months),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/operations/monthly-totals', {
        params: { query: { months } },
      })
      if (!data) throw new Error('Не удалось загрузить статистику')
      return data.data
    },
  })
}
