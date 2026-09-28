import { useQuery } from '@tanstack/react-query'
import { NavLink, Outlet } from 'react-router'

import { api } from '@/api/client'
import { logout } from '@/auth/actions'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { to: '/', label: 'Записи' },
  { to: '/statistics', label: 'Статистика' },
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
      {/* На телефоне три раздела, название и «Выйти» в строку не влезают:
          меню уходит второй строкой (order-last + w-full), с sm — рядом с названием */}
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-rule py-4">
        <p className="text-lg font-semibold">Книжка</p>
        <nav
          aria-label="Разделы"
          className="order-last flex w-full gap-5 text-sm sm:order-none sm:w-auto sm:gap-4"
        >
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
        <div className="ml-auto flex min-w-0 items-center gap-4">
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
