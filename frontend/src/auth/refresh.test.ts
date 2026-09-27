import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Поддельный бэкенд с той же логикой, что настоящий: каждый /refresh
 * ротирует токен, а повтор уже отозванного гасит всю цепочку.
 * Cookie одна на все вкладки — как в браузере.
 */
function fakeBackend() {
  const state = { cookie: 'r0', familyRevoked: false, sentCookies: [] as string[] }
  const valid = new Set(['r0'])
  const revoked = new Set<string>()
  let issued = 0

  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      const sent = state.cookie
      state.sentCookies.push(sent)
      // Запрос в пути: другая вкладка успевает отправить свой
      await new Promise((resolve) => setTimeout(resolve, 10))

      if (revoked.has(sent)) state.familyRevoked = true
      if (state.familyRevoked || !valid.has(sent)) return new Response(null, { status: 401 })

      valid.delete(sent)
      revoked.add(sent)
      issued += 1
      valid.add(`r${issued}`)
      state.cookie = `r${issued}` // Set-Cookie: браузер сохраняет новую до ответа странице
      return Response.json({ access_token: `a${issued}`, token_type: 'Bearer' })
    }),
  )
  return state
}

/** Отдельная вкладка: свои экземпляры модулей, а значит своя сессия и свой single-flight. */
async function openTab() {
  vi.resetModules()
  const { refreshAccessToken } = await import('./refresh')
  const { session } = await import('./session')
  return { refreshAccessToken, session }
}

describe('refreshAccessToken в нескольких вкладках', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('вкладки обновляют токен по очереди и обе остаются в сессии', async () => {
    const backend = fakeBackend()
    const first = await openTab()
    const second = await openTab()

    // Как при восстановлении браузером двух вкладок: обе стартуют одновременно
    const results = await Promise.all([first.refreshAccessToken(), second.refreshAccessToken()])

    expect(results).toEqual([true, true])
    expect(backend.familyRevoked).toBe(false)
    // Вторая вкладка отправила уже новую cookie, а не ту же r0
    expect(backend.sentCookies).toEqual(['r0', 'r1'])
    expect(first.session.get().status).toBe('authenticated')
    expect(second.session.get().status).toBe('authenticated')
  })

  it('без Web Locks вкладки гасят сессию друг другу (почему блокировка нужна)', async () => {
    // Контроль: тот же сценарий без блокировки воспроизводит баг. Иначе
    // первый тест проходил бы и с поддельным бэком, который гонку не ловит
    vi.stubGlobal('navigator', { ...navigator, locks: undefined })
    const backend = fakeBackend()
    const first = await openTab()
    const second = await openTab()

    const results = await Promise.all([first.refreshAccessToken(), second.refreshAccessToken()])

    expect(backend.sentCookies).toEqual(['r0', 'r0'])
    expect(backend.familyRevoked).toBe(true)
    expect(results).toContain(false)
  })
})
