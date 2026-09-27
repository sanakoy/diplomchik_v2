import { parseAmount } from '@/lib/format'

// Столько вмещает колонка operation.comment, бэк проверяет то же самое
export const COMMENT_MAX_LENGTH = 100

export interface OperationFieldErrors {
  amount?: string
  date?: string
}

/** Проверка суммы и даты, общая для новой записи и изменения. */
export function validateOperationFields(amount: string, date: string) {
  const sum = parseAmount(amount)
  const errors: OperationFieldErrors = {
    amount: sum === null ? 'Введите сумму больше нуля, например 1250,50.' : undefined,
    date: date ? undefined : 'Укажите дату.',
  }
  return { sum, errors }
}

/** 1500.5 → «1500,5»: сумма для поля ввода, в привычной записи с запятой. */
export function amountToInput(sum: number): string {
  return String(sum).replace('.', ',')
}

/** День из даты операции: «2026-09-17T15:30:00» → «2026-09-17». */
export function dateToInput(isoDateTime: string | null | undefined): string {
  return isoDateTime ? isoDateTime.slice(0, 10) : ''
}
