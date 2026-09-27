import { useQuery } from '@tanstack/react-query'

import { api } from '@/api/client'

// Временная страница первого этапа: проверяет, что фронт достучался до бэка
export function HomePage() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const { data, error } = await api.GET('/health')
      if (error) throw error
      return data
    },
  })

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-semibold">Учёт финансов</h1>
      <p className="mt-4 text-muted-foreground">
        API:{' '}
        {health.isPending && 'проверяю…'}
        {health.isError && <span className="text-destructive">недоступно</span>}
        {health.isSuccess && <span className="text-foreground">{health.data.status}</span>}
      </p>
    </main>
  )
}
