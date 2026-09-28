import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'

import { api } from '@/api/client'
import { ensureOk } from '@/api/errors'
import type { components } from '@/api/schema'
import type { YearMonth } from '@/lib/month'
import { queryKeys, refreshLedger } from '@/query-client'

export type Operation = components['schemas']['OperationView']
export type NewOperation = components['schemas']['CreateOperationRequest']
export type OperationChanges = components['schemas']['UpdateOperationRequest']

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

/** Записи за период, даты включительно: список в статистике. */
export function usePeriodOperations(from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.periodOperations(from, to),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/operations', {
        params: { query: { date_from: from, date_to: to } },
      })
      if (!data) throw new Error('Не удалось загрузить операции')
      return data.data
    },
    placeholderData: keepPreviousData,
  })
}

export function useCreateOperation() {
  return useMutation({
    mutationFn: async (body: NewOperation) => {
      const { response } = await api.POST('/api/v1/operations/create', { body })
      ensureOk(response)
    },
    onSuccess: refreshLedger,
  })
}

export function useUpdateOperation() {
  return useMutation({
    mutationFn: async ({ id, changes }: { id: number; changes: OperationChanges }) => {
      const { response } = await api.PATCH('/api/v1/operations/update/{operation_id}', {
        params: { path: { operation_id: id } },
        body: changes,
      })
      ensureOk(response)
    },
    onSuccess: refreshLedger,
  })
}

export function useDeleteOperation() {
  return useMutation({
    mutationFn: async (id: number) => {
      const { response } = await api.DELETE('/api/v1/operations/delete/{operation_id}', {
        params: { path: { operation_id: id } },
      })
      ensureOk(response)
    },
    onSuccess: refreshLedger,
  })
}
