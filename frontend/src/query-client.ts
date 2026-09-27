import { QueryClient } from '@tanstack/react-query'

// Отдельный модуль: к кешу нужен доступ и вне React — например, чтобы очистить его при выходе
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 401 уже обработан в authFetch (обновление токена и повтор), повторять ещё раз незачем
      retry: false,
    },
  },
})
