import createClient from 'openapi-fetch'

import { refreshAccessToken } from '@/auth/refresh'
import { session } from '@/auth/session'

import type { paths } from './schema'

// На 401 от ручек авторизации обновлять токен бессмысленно: для /login это
// неверный пароль, для /refresh — конец сессии
function isAuthEndpoint(url: string): boolean {
  return new URL(url).pathname.startsWith('/api/v1/auth/')
}

function withAccessToken(request: Request): Request {
  const { accessToken } = session.get()
  if (!accessToken) return request
  const headers = new Headers(request.headers)
  headers.set('Authorization', `Bearer ${accessToken}`)
  return new Request(request, { headers })
}

/**
 * fetch с авторизацией: подставляет access-токен, а при 401 один раз обновляет
 * его и повторяет запрос. Если обновить не удалось, сессия сбрасывается,
 * и защищённые маршруты отправят пользователя на вход.
 */
export async function authFetch(request: Request): Promise<Response> {
  // Копия до отправки: тело запроса читается один раз, для повтора нужна своя
  const retry = request.clone()
  const response = await fetch(withAccessToken(request))

  if (response.status !== 401 || isAuthEndpoint(request.url)) {
    return response
  }

  const refreshed = await refreshAccessToken()
  if (!refreshed) return response

  return fetch(withAccessToken(retry))
}

// Относительный адрес: в разработке запросы проксирует Vite, в Docker — nginx.
// Для браузера фронт и API на одном адресе, поэтому CORS не нужен
export const api = createClient<paths>({ baseUrl: '', fetch: authFetch })
