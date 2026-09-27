import { useRouteError } from 'react-router'

import { Button } from '@/components/ui/button'

/**
 * Страница ошибки вместо отладочного экрана React Router.
 *
 * Самый вероятный случай в проде — не загрузился чанк страницы: после
 * деплоя у открытой вкладки старые имена файлов, а на сервере уже новые.
 * Лечится перезагрузкой, поэтому она и предлагается.
 */
export function RouteError() {
  const error = useRouteError()
  // В консоль — для отладки; пользователю детали ошибки ни к чему
  console.error(error)

  return (
    <main role="alert" className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Страница не открылась</h1>
      <p className="mt-3 text-muted-foreground">
        Возможно, вышла новая версия приложения. Обновите страницу: записи никуда не делись.
      </p>
      <Button size="lg" className="mt-6 h-11 px-8" onClick={() => window.location.reload()}>
        Обновить страницу
      </Button>
    </main>
  )
}
