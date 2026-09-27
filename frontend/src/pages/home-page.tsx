import { useQuery } from '@tanstack/react-query'

import { api } from '@/api/client'
import { logout } from '@/auth/actions'
import { Button } from '@/components/ui/button'

// Временная страница второго этапа: показывает, что вход и сессия работают.
// На третьем этапе здесь будут операции за месяц
export function HomePage() {
  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/v1/auth/me')
      if (error) throw error
      return data
    },
  })

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="flex items-center justify-between border-b border-rule pb-4">
        <p className="text-lg font-semibold">Книжка</p>
        <Button variant="outline" onClick={() => void logout()}>
          Выйти
        </Button>
      </header>
      <p className="mt-8 text-muted-foreground">
        {me.data ? `Вы вошли как ${me.data.email}` : 'Загрузка…'}
      </p>
    </main>
  )
}
