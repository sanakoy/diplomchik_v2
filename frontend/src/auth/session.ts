import { useSyncExternalStore } from 'react'

// restoring — при старте приложения ещё не знаем, жива ли сессия (идёт /refresh)
export type SessionStatus = 'restoring' | 'authenticated' | 'anonymous'

export interface SessionState {
  status: SessionStatus
  // Access-токен живёт только в памяти: после перезагрузки страницы
  // его восстанавливает /refresh по httpOnly cookie
  accessToken: string | null
}

let state: SessionState = { status: 'restoring', accessToken: null }
const listeners = new Set<() => void>()

function setState(next: SessionState) {
  state = next
  listeners.forEach((listener) => listener())
}

export const session = {
  get: (): SessionState => state,

  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  signIn(accessToken: string) {
    setState({ status: 'authenticated', accessToken })
  },

  signOut() {
    setState({ status: 'anonymous', accessToken: null })
  },
}

export function useSession(): SessionState {
  return useSyncExternalStore(session.subscribe, session.get)
}
