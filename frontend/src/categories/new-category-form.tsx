import { useRef, useState, type FormEvent } from 'react'

import { FormField } from '@/components/form-field'
import { KindToggle } from '@/components/kind-toggle'
import { Button } from '@/components/ui/button'
import { currentMonth } from '@/lib/month'

import {
  CATEGORY_NAME_MAX_LENGTH,
  hasCategoryNamed,
  useCategories,
  useCreateCategory,
  type OperationKind,
} from './queries'

const KIND_GROUP: Record<OperationKind, string> = { spending: 'расходах', profit: 'доходах' }

export function NewCategoryForm() {
  const [kind, setKind] = useState<OperationKind>('spending')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [added, setAdded] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  // Тот же запрос, что у списка ниже: для проверки на повтор второй раз не грузится
  const categories = useCategories(kind, currentMonth())
  const create = useCreateCategory()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setAdded(null)
    const trimmed = name.trim()
    if (!trimmed) return setError('Введите название.')
    if (hasCategoryNamed(categories.data ?? [], trimmed)) {
      return setError(`Категория «${trimmed}» уже есть в ${KIND_GROUP[kind]}.`)
    }
    setError(null)

    create.mutate(
      { name: trimmed, kind },
      {
        onSuccess: () => {
          setName('')
          setAdded(trimmed)
          // Категории часто заводят подряд: фокус остаётся в поле названия
          nameRef.current?.focus()
        },
        onError: () => setFormError('Не удалось добавить категорию. Попробуйте ещё раз.'),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby="new-category-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="new-category-title" className="text-lg font-semibold">
          Новая категория
        </h2>
        <KindToggle name="category-kind" value={kind} onChange={setKind} />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <FormField
          ref={nameRef}
          id="category-name"
          label="Название"
          maxLength={CATEGORY_NAME_MAX_LENGTH}
          autoComplete="off"
          value={name}
          error={error ?? undefined}
          onChange={(event) => setName(event.target.value)}
        />
        {/* Отступ сверху = подпись (14px, leading-none) + gap-2: кнопка вровень с полем */}
        <Button type="submit" size="lg" className="h-11 px-8 sm:mt-[22px]" disabled={create.isPending}>
          {create.isPending ? 'Добавляем…' : 'Добавить'}
        </Button>
      </div>

      <div role="status" className="mt-2 min-h-5 text-sm text-income">
        {added && `Категория «${added}» добавлена.`}
      </div>
      <div role="alert" className="text-sm text-expense">
        {formError}
      </div>
    </form>
  )
}
