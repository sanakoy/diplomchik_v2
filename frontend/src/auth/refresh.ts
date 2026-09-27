import { session } from './session'

let inFlight: Promise<boolean> | null = null

/**
 * Получает новый access-токен по refresh-токену из httpOnly cookie.
 *
 * Single-flight: если несколько запросов одновременно получили 401, на /refresh
 * уходит только один запрос, остальные ждут его результат. Иначе второй /refresh
 * пришёл бы с уже отозванным токеном, бэк счёл бы это кражей и погасил сессию.
 */
export function refreshAccessToken(): Promise<boolean> {
  inFlight ??= doRefresh().finally(() => {
    inFlight = null
  })
  return inFlight
}

async function doRefresh(): Promise<boolean> {
  try {
    // Обычный fetch, а не api-клиент: иначе при 401 клиент снова позвал бы refresh
    const response = await fetch('/api/v1/auth/refresh', { method: 'POST' })
    if (!response.ok) {
      session.signOut()
      return false
    }
    const { access_token } = (await response.json()) as { access_token: string }
    session.signIn(access_token)
    return true
  } catch {
    // Сеть недоступна: сессию считаем потерянной, пользователь войдёт заново
    session.signOut()
    return false
  }
}
