import { useQuery } from '@tanstack/react-query'
import { NavLink, Outlet } from 'react-router'

import { api } from '@/api/client'
import { logout } from '@/auth/actions'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { to: '/', label: 'Записи' },
  { to: '/categories', label: 'Категории' },
]

/** Каркас страниц после входа: шапка с разделами и выходом, под ней страница. */
export function AppLayout() {
  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/auth/me')
      if (!data) throw new Error('Не удалось загрузить профиль')
      return data
    },
  })

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between gap-4 border-b border-rule py-4">
        <div className="flex items-center gap-6">
          <p className="text-lg font-semibold">Книжка</p>
          <nav aria-label="Разделы" className="flex gap-4 text-sm">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                // Текущий раздел — цветом и подчёркиванием, как закладка; NavLink сам
                // ставит aria-current="page". Начертание у всех пунктов одно: полужирный
                // шире обычного, и соседний пункт сдвигался бы при переключении
                className={({ isActive }) =>
                  isActive
                    ? 'font-medium text-foreground underline decoration-2 underline-offset-8'
                    : 'font-medium text-muted-foreground hover:text-foreground'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex min-w-0 items-center gap-4">
          <p className="hidden truncate text-sm text-muted-foreground md:block">{me.data?.email}</p>
          <Button variant="outline" onClick={() => void logout()}>
            Выйти
          </Button>
        </div>
      </header>

      <Outlet />
    </div>
  )
}
