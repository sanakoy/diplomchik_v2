import { api } from '@/api/client'
import { queryClient } from '@/query-client'

import { session } from './session'

export type LoginResult =
  | { ok: true }
  | { ok: false; reason: 'invalid-credentials' | 'unknown' }
  // Бэк ограничивает попытки входа и говорит, через сколько секунд можно снова
  | { ok: false; reason: 'rate-limited'; retryAfterSeconds: number }

export async function login(email: string, password: string): Promise<LoginResult> {
  const { data, response } = await api.POST('/api/v1/auth/login', {
    body: { email, password },
  })

  if (data) {
    session.signIn(data.access_token)
    return { ok: true }
  }
  if (response.status === 401) {
    return { ok: false, reason: 'invalid-credentials' }
  }
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get('Retry-After'))
    return {
      ok: false,
      reason: 'rate-limited',
      retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60,
    }
  }
  return { ok: false, reason: 'unknown' }
}

export type RegisterResult =
  | { ok: true }
  | { ok: false; reason: 'email-taken' | 'invalid-email' | 'invalid-password' | 'unknown' }

export async function register(email: string, password: string): Promise<RegisterResult> {
  const { data, error, response } = await api.POST('/api/v1/auth/register', {
    body: { email, password },
  })

  if (data) {
    // Сразу входим: после регистрации пользователь ждёт, что он уже внутри
    const loginResult = await login(email, password)
    return loginResult.ok ? { ok: true } : { ok: false, reason: 'unknown' }
  }
  if (response.status === 409) {
    return { ok: false, reason: 'email-taken' }
  }
  if (response.status === 422) {
    // Pydantic сообщает, какое поле не прошло проверку: ["body", "email"]
    const field = error && 'detail' in error ? error.detail?.[0]?.loc?.at(-1) : undefined
    return { ok: false, reason: field === 'email' ? 'invalid-email' : 'invalid-password' }
  }
  return { ok: false, reason: 'unknown' }
}

export async function logout(): Promise<void> {
  try {
    await api.POST('/api/v1/auth/logout')
  } finally {
    // Даже если бэк недоступен, на этом устройстве пользователь должен выйти
    session.signOut()
    queryClient.clear()
  }
}
