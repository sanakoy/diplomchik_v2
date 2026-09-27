import { useEffect, useRef, useState, type FormEvent } from 'react'

import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { parseAmount } from '@/lib/format'
import { todayIsoDate, type YearMonth } from '@/lib/month'

import {
  CreateOperationError,
  useCategories,
  useCreateOperation,
  type OperationKind,
} from './queries'

const KIND_LABELS: Record<OperationKind, string> = { spending: 'Расход', profit: 'Доход' }
const EMPTY_CATEGORIES: Record<OperationKind, string> = {
  spending: 'Категорий расходов пока нет.',
  profit: 'Категорий доходов пока нет.',
}
const COMMENT_MAX_LENGTH = 100 // столько вмещает колонка operation.comment
const STAMP_VISIBLE_MS = 2000

interface FieldErrors {
  amount?: string
  category?: string
  date?: string
}

function errorMessage(error: unknown): string {
  if (error instanceof CreateOperationError && error.status === 404) {
    return 'Категория не найдена: возможно, её удалили. Обновите страницу.'
  }
  return 'Не удалось записать. Попробуйте ещё раз.'
}

interface OperationFormProps {
  /** Открытый на странице месяц: список категорий берётся из того же запроса,
   * что и блок категорий, и второй раз не грузится. */
  month: YearMonth
  /** Вызывается после записи с датой операции: страница покажет её месяц. */
  onSaved: (isoDate: string) => void
}

export function OperationForm({ month, onSaved }: OperationFormProps) {
  const [kind, setKind] = useState<OperationKind>('spending')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(todayIsoDate)
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  // Номер показа штампа: новый key перезапускает анимацию при каждой записи
  const [stamp, setStamp] = useState<number | null>(null)
  const amountRef = useRef<HTMLInputElement>(null)

  const categories = useCategories(kind, month)
  const createOperation = useCreateOperation()
  const noCategories = categories.isSuccess && categories.data.length === 0

  useEffect(() => {
    if (stamp === null) return
    const timer = setTimeout(() => setStamp(null), STAMP_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [stamp])

  function changeKind(next: OperationKind) {
    setKind(next)
    // У доходов и расходов разные категории: выбранная к новому типу не подходит
    setCategoryId('')
    setErrors((current) => ({ ...current, category: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const sum = parseAmount(amount)
    const nextErrors: FieldErrors = {
      amount: sum === null ? 'Введите сумму больше нуля, например 1250,50.' : undefined,
      category: categoryId ? undefined : 'Выберите категорию.',
      date: date ? undefined : 'Укажите дату.',
    }
    setErrors(nextErrors)
    if (sum === null || !categoryId || !date) return

    createOperation.mutate(
      {
        sum,
        category_id: Number(categoryId),
        // Бэк хранит дату со временем, а в книжке важен только день
        date: `${date}T00:00:00`,
        comment: comment.trim() || null,
      },
      {
        onSuccess: () => {
          // Тип, категория и дата остаются: несколько трат подряд вносятся быстрее
          setAmount('')
          setComment('')
          setStamp((current) => (current ?? 0) + 1)
          amountRef.current?.focus()
          onSaved(date)
        },
        onError: (error) => setFormError(errorMessage(error)),
      },
    )
  }

  const pending = createOperation.isPending

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby="new-entry-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="new-entry-title" className="text-lg font-semibold">
          Новая запись
        </h2>

        <fieldset className="flex rounded-lg border border-rule bg-sheet p-0.5">
          <legend className="sr-only">Тип записи</legend>
          {(['spending', 'profit'] as const).map((value) => (
            <label
              key={value}
              className="cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors has-checked:bg-ink has-checked:text-sheet has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input
                type="radio"
                name="kind"
                value={value}
                checked={kind === value}
                onChange={() => changeKind(value)}
                className="sr-only"
              />
              {KIND_LABELS[value]}
            </label>
          ))}
        </fieldset>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
        <FormField
          ref={amountRef}
          id="amount"
          label="Сумма, ₽"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          className="amount h-11 bg-sheet text-lg"
          value={amount}
          error={errors.amount}
          onChange={(event) => setAmount(event.target.value)}
        />

        <div className="grid content-start gap-2">
          <Label htmlFor="category">Категория</Label>
          <select
            id="category"
            value={categoryId}
            disabled={!categories.isSuccess || noCategories}
            aria-invalid={errors.category ? true : undefined}
            aria-describedby={errors.category || noCategories ? 'category-note' : undefined}
            onChange={(event) => setCategoryId(event.target.value)}
            className="h-11 w-full min-w-0 rounded-lg border border-input bg-sheet px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm"
          >
            <option value="" disabled>
              {categories.isPending ? 'Загрузка…' : 'Выберите категорию'}
            </option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {(errors.category || noCategories || categories.isError) && (
            <p
              id="category-note"
              className={`text-sm ${errors.category || categories.isError ? 'text-expense' : 'text-muted-foreground'}`}
            >
              {categories.isError
                ? 'Не удалось загрузить категории.'
                : (errors.category ?? EMPTY_CATEGORIES[kind])}
            </p>
          )}
        </div>

        <FormField
          id="date"
          label="Дата"
          type="date"
          required
          value={date}
          error={errors.date}
          onChange={(event) => setDate(event.target.value)}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <FormField
          id="comment"
          label="Комментарий"
          hint="Необязательно"
          maxLength={COMMENT_MAX_LENGTH}
          autoComplete="off"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />

        <div className="relative sm:mb-7">
          <Button
            type="submit"
            size="lg"
            className="h-11 w-full px-8 sm:w-auto"
            disabled={pending || noCategories}
          >
            {pending ? 'Записываем…' : 'Записать'}
          </Button>

          {/* Отметка об успешной записи; role="status" — чтобы её услышал и скринридер */}
          <div role="status" className="pointer-events-none absolute -top-8 right-1">
            {stamp !== null && (
              <span
                key={stamp}
                className="stamp-flash inline-block rounded-md border-[3px] border-double border-income bg-paper px-3 py-1 text-sm font-bold text-income"
              >
                Проведено
              </span>
            )}
          </div>
        </div>
      </div>

      <div role="alert" className="mt-3 text-sm text-expense">
        {formError}
      </div>
    </form>
  )
}
