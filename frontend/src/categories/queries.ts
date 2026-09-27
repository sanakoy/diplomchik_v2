import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'

import { api } from '@/api/client'
import { ensureOk } from '@/api/errors'
import type { components } from '@/api/schema'
import type { YearMonth } from '@/lib/month'
import { queryKeys, refreshLedger, type OperationKind } from '@/query-client'

export type { OperationKind }
export type Category = components['schemas']['CategoryView']

// Столько вмещает колонка category.name, бэк проверяет то же самое
export const CATEGORY_NAME_MAX_LENGTH = 80

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

export function useCreateCategory() {
  return useMutation({
    mutationFn: async ({ name, kind }: { name: string; kind: OperationKind }) => {
      const { response } = await api.POST('/api/v1/categories/create', {
        body: { name, operation: kind },
      })
      ensureOk(response)
    },
    onSuccess: refreshLedger,
  })
}

export function useRenameCategory() {
  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const { response } = await api.PATCH('/api/v1/categories/update/{category_id}', {
        params: { path: { category_id: id } },
        body: { name },
      })
      ensureOk(response)
    },
    onSuccess: refreshLedger,
  })
}

export function useDeleteCategory() {
  return useMutation({
    mutationFn: async (id: number) => {
      const { response } = await api.DELETE('/api/v1/categories/delete/{category_id}', {
        params: { path: { category_id: id } },
      })
      ensureOk(response)
    },
    onSuccess: refreshLedger,
  })
}

/** Есть ли у пользователя категория с таким именем (без учёта регистра и пробелов по краям). */
export function hasCategoryNamed(categories: Category[], name: string, exceptId?: number) {
  const normalized = name.trim().toLocaleLowerCase('ru')
  return categories.some(
    (category) =>
      category.id !== exceptId && category.name.trim().toLocaleLowerCase('ru') === normalized,
  )
}
