import { session } from './session'

// Имя блокировки Web Locks: общее для всех вкладок этого сайта
const REFRESH_LOCK = 'auth-refresh'

let inFlight: Promise<boolean> | null = null

/**
 * Получает новый access-токен по refresh-токену из httpOnly cookie.
 *
 * Бэк ротирует refresh-токен на каждый /refresh, а пришедший повторно старый
 * токен считает кражей и гасит всю цепочку. Поэтому два /refresh с одной
 * cookie не должны уйти одновременно — ни из одной вкладки, ни из разных:
 *
 * - внутри вкладки single-flight: если несколько запросов получили 401,
 *   на /refresh уходит один, остальные ждут его результат;
 * - между вкладками блокировка Web Locks: вкладки обновляют токен по
 *   очереди. Следующая получает блокировку, когда предыдущая уже получила
 *   ответ и браузер сохранил новую cookie, — и отправляет уже её. Без этого
 *   браузер, восстановивший несколько вкладок сразу, выкидывал бы на вход.
 */
export function refreshAccessToken(): Promise<boolean> {
  inFlight ??= doRefresh().finally(() => {
    inFlight = null
  })
  return inFlight
}

async function doRefresh(): Promise<boolean> {
  // Web Locks есть только в защищённом контексте (HTTPS или localhost).
  // Без него остаётся single-flight внутри вкладки
  if (typeof navigator !== 'undefined' && navigator.locks) {
    // Колбэк возвращает промис: блокировка держится, пока он не завершится
    return await navigator.locks.request(REFRESH_LOCK, refreshOnce)
  }
  return refreshOnce()
}

async function refreshOnce(): Promise<boolean> {
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
