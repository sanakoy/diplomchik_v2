import { QueryClient } from '@tanstack/react-query'

import type { YearMonth } from '@/lib/month'

// Отдельный модуль: к кешу нужен доступ и вне React — например, чтобы очистить его при выходе
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 401 уже обработан в authFetch (обновление токена и повтор), повторять ещё раз незачем
      retry: false,
    },
  },
})

/** Тип записи в терминах API: категории делятся на доходы и расходы. */
export type OperationKind = 'profit' | 'spending'

// Ключи в одном месте: по префиксам сбрасывается кеш после изменений
export const queryKeys = {
  operations: ['operations'] as const,
  monthOperations: ({ year, month }: YearMonth) => ['operations', year, month] as const,
  categories: ['categories'] as const,
  monthCategories: (kind: OperationKind, { year, month }: YearMonth) =>
    ['categories', kind, year, month] as const,
  // Под префиксом operations: статистика считается по записям и сбрасывается вместе с ними
  periodTotals: (from: string, to: string) => ['operations', 'totals', from, to] as const,
}

/**
 * Сбрасывает записи и категории после любого изменения: суммы категорий
 * считаются по записям, а в записях видно имя категории. Промис возвращается
 * из onSuccess мутации: она завершится, когда данные на экране уже свежие,
 * и кнопки разблокируются вместе с обновлением.
 */
export function refreshLedger(): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.operations }),
    queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  ])
}
