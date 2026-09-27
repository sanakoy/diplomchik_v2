import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { api } from '@/api/client'
import type { components } from '@/api/schema'
import { queryKeys } from '@/query-client'

export type PeriodTotals = components['schemas']['PeriodTotalsResponse']

/** Доходы, расходы, суммы категорий и суммы по дням за период (даты включительно). */
export function usePeriodTotals(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.periodTotals(from, to),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/operations/totals', {
        params: { query: { date_from: from, date_to: to } },
      })
      if (!data) throw new Error('Не удалось загрузить статистику')
      return data
    },
    // Пока грузится другой период, прежние цифры остаются на экране
    placeholderData: keepPreviousData,
  })
}
