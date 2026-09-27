import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { session } from '@/auth/session'

import { authFetch } from './client'

const API = 'http://localhost'

/**
 * Поддельный бэкенд: защищённые ручки пускают только с токеном 'new',
 * а /refresh выдаёт этот токен (или отказывает, если refreshFails).
 */
function fakeBackend({ refreshFails = false } = {}) {
  const refreshCalls: number[] = []
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url.endsWith('/api/v1/auth/refresh')) {
      refreshCalls.push(Date.now())
      // Небольшая задержка, чтобы параллельные запросы успели встать в очередь
      await new Promise((resolve) => setTimeout(resolve, 10))
      return refreshFails
        ? new Response(null, { status: 401 })
        : Response.json({ access_token: 'new', token_type: 'Bearer' })
    }
    const request = input as Request
    const authorized = request.headers.get('Authorization') === 'Bearer new'
    return authorized ? Response.json({ ok: true }) : new Response(null, { status: 401 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, refreshCalls }
}

describe('authFetch', () => {
  beforeEach(() => {
    session.signIn('old')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('подставляет access-токен в заголовок', async () => {
    session.signIn('new')
    const { fetchMock } = fakeBackend()

    await authFetch(new Request(`${API}/api/v1/operations`))

    const sent = fetchMock.mock.calls[0][0] as Request
    expect(sent.headers.get('Authorization')).toBe('Bearer new')
  })

  it('на 401 обновляет токен и повторяет запрос', async () => {
    const { refreshCalls } = fakeBackend()

    const response = await authFetch(new Request(`${API}/api/v1/operations`))

    expect(response.status).toBe(200)
    expect(refreshCalls).toHaveLength(1)
    expect(session.get()).toEqual({ status: 'authenticated', accessToken: 'new' })
  })

  it('повторяет запрос с тем же телом', async () => {
    const { fetchMock } = fakeBackend()

    await authFetch(
      new Request(`${API}/api/v1/operations/create`, {
        method: 'POST',
        body: JSON.stringify({ sum: 100 }),
      }),
    )

    const retried = fetchMock.mock.calls.at(-1)![0] as Request
    expect(await retried.json()).toEqual({ sum: 100 })
  })

  it('при одновременных 401 вызывает /refresh один раз', async () => {
    // Без single-flight второй /refresh пришёл бы с уже отозванным токеном,
    // бэк счёл бы это кражей и погасил сессию
    const { refreshCalls } = fakeBackend()

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => authFetch(new Request(`${API}/api/v1/operations`))),
    )

    expect(refreshCalls).toHaveLength(1)
    expect(responses.map((r) => r.status)).toEqual([200, 200, 200, 200, 200])
  })

  it('если обновить не удалось, сбрасывает сессию и не повторяет запрос', async () => {
    const { fetchMock } = fakeBackend({ refreshFails: true })

    const response = await authFetch(new Request(`${API}/api/v1/operations`))

    expect(response.status).toBe(401)
    expect(session.get()).toEqual({ status: 'anonymous', accessToken: null })
    // Исходный запрос и /refresh, повтора нет
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('не обновляет токен на 401 от ручек авторизации', async () => {
    // 401 от /login — это неверный пароль, а не протухший токен
    const { refreshCalls } = fakeBackend()

    const response = await authFetch(
      new Request(`${API}/api/v1/auth/login`, { method: 'POST' }),
    )

    expect(response.status).toBe(401)
    expect(refreshCalls).toHaveLength(0)
  })
})
