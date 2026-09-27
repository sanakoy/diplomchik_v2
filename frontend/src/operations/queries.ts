import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/api/client'
import type { components } from '@/api/schema'
import type { YearMonth } from '@/lib/month'

export type Operation = components['schemas']['OperationView']
export type Category = components['schemas']['CategoryView']
export type NewOperation = components['schemas']['CreateOperationRequest']
/** Тип записи в терминах API: категории делятся на доходы и расходы. */
export type OperationKind = 'profit' | 'spending'

// Ключи в одном месте: по ним же сбрасывается кэш после изменений
export const queryKeys = {
  operations: ['operations'] as const,
  monthOperations: ({ year, month }: YearMonth) => ['operations', year, month] as const,
  categories: ['categories'] as const,
  monthCategories: (kind: OperationKind, { year, month }: YearMonth) =>
    ['categories', kind, year, month] as const,
}

export function useMonthOperations(month: YearMonth) {
  return useQuery({
    queryKey: queryKeys.monthOperations(month),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/operations', {
        params: { query: { year: month.year, month: month.month } },
      })
      if (!data) throw new Error('Не удалось загрузить операции')
      return data.data
    },
    // При переключении месяца старый список остаётся на экране, пока грузится
    // новый: таблица не схлопывается в «Загрузка…» и не прыгает
    placeholderData: keepPreviousData,
  })
}

/** Категории одного типа, у каждой cat_sum — сумма операций за month. */
export function useCategories(kind: OperationKind, month: YearMonth) {
  return useQuery({
    queryKey: queryKeys.monthCategories(kind, month),
    queryFn: async () => {
      const params = { query: { year: month.year, month: month.month } }
      const { data } =
        kind === 'profit'
          ? await api.GET('/api/v1/categories/profit', { params })
          : await api.GET('/api/v1/categories/spending', { params })
      if (!data) throw new Error('Не удалось загрузить категории')
      return data.data.cats
    },
    placeholderData: keepPreviousData,
  })
}

export class CreateOperationError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Операция не создана: ${status}`)
    this.status = status
  }
}

export function useCreateOperation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: NewOperation) => {
      const { response } = await api.POST('/api/v1/operations/create', { body })
      if (!response.ok) throw new CreateOperationError(response.status)
    },
    // Возвращаем промис: мутация считается завершённой, когда список уже
    // перезагружен, и кнопка разблокируется вместе с появлением новой строки.
    // Категории тоже сбрасываем: в них хранятся суммы за месяц
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.operations }),
        queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
      ]),
  })
}
