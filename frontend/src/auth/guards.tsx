import { Navigate, Outlet, useLocation } from 'react-router'

import { useSession } from './session'

function SessionRestoring() {
  // Пока идёт /refresh при старте, не показываем ни вход, ни приложение:
  // иначе вошедший пользователь на долю секунды увидел бы форму входа
  return <div role="status" aria-live="polite" className="sr-only">Загрузка</div>
}

/** Пускает только вошедших, остальных отправляет на вход и запоминает, куда они шли. */
export function RequireAuth() {
  const { status } = useSession()
  const location = useLocation()

  if (status === 'restoring') return <SessionRestoring />
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

/** Вход и регистрация: вошедшему пользователю они не нужны. */
export function GuestOnly() {
  const { status } = useSession()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (status === 'restoring') return <SessionRestoring />
  if (status === 'authenticated') return <Navigate to={from} replace />
  return <Outlet />
}
