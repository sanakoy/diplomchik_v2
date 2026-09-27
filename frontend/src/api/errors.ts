/** Неуспешный ответ API: по статусу страница выбирает понятное сообщение. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Запрос завершился с кодом ${status}`)
    this.status = status
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

/** Бросает ApiError, если ответ неуспешный: для мутаций, где тело ответа не нужно. */
export function ensureOk(response: Response): void {
  if (!response.ok) throw new ApiError(response.status)
}
