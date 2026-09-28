import { useState, type FormEvent, type RefObject } from 'react'

import { isConflict, isNotFound } from '@/api/errors'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useConfirmStep } from '@/lib/use-confirm-step'
import { refreshLedger } from '@/query-client'

import { DEFAULT_ICON, resolveIcon, suggestIcon, type IconKey } from './icon-keys'
import { IconPicker } from './icon-picker'
import {
  CATEGORY_NAME_MAX_LENGTH,
  hasCategoryNamed,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
  type Category,
  type OperationKind,
} from './queries'

/** Что делаем в окне: создаём категорию этого типа или меняем существующую. */
export type CategoryDialogState =
  | { mode: 'create'; kind: OperationKind }
  | { mode: 'edit'; category: Category }

const GROUP: Record<OperationKind, { genitive: string; prepositional: string }> = {
  spending: { genitive: 'расходов', prepositional: 'расходах' },
  profit: { genitive: 'доходов', prepositional: 'доходах' },
}

interface CategoryDialogProps {
  state: CategoryDialogState | null
  /** Категории того же типа: чтобы не завести второе такое же название. */
  siblings: Category[]
  /** Кнопка, с которой открыли окно: после закрытия фокус вернётся на неё. */
  returnFocusTo: RefObject<HTMLElement | null>
  onClose: () => void
  /** Для объявления скринридеру: что произошло. */
  onDone: (message: string) => void
}

export function CategoryDialog({ state, siblings, returnFocusTo, onClose, onDone }: CategoryDialogProps) {
  // Ключ формы: новое открытие — новое состояние, от прошлого ничего не остаётся
  const formKey = state?.mode === 'edit' ? `edit-${state.category.id}` : `create-${state?.kind}`

  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="gap-0 bg-paper p-6 sm:max-w-md"
        // Radix вернул бы фокус на DialogTrigger, а окно открыто плиткой без него
        onCloseAutoFocus={(event) => {
          if (returnFocusTo.current?.isConnected) {
            event.preventDefault()
            returnFocusTo.current.focus()
          }
        }}
      >
        {state && (
          <CategoryForm key={formKey} state={state} siblings={siblings} onClose={onClose} onDone={onDone} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CategoryForm({
  state,
  siblings,
  onClose,
  onDone,
}: Omit<CategoryDialogProps, 'state' | 'returnFocusTo'> & { state: CategoryDialogState }) {
  const editing = state.mode === 'edit' ? state.category : null
  const kind: OperationKind =
    state.mode === 'create' ? state.kind : state.category.is_profit ? 'profit' : 'spending'
  const group = GROUP[kind]

  const [name, setName] = useState(editing?.name ?? '')
  // У новой категории иконка подбирается по названию, пока её не выбрали вручную
  const [pickedIcon, setPickedIcon] = useState<IconKey | null>(editing ? resolveIcon(editing) : null)
  const icon = pickedIcon ?? suggestIcon(name) ?? DEFAULT_ICON
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  // Удаление в два шага: первая кнопка только спрашивает подтверждение
  const deleteStep = useConfirmStep()

  const create = useCreateCategory()
  const update = useUpdateCategory()
  const remove = useDeleteCategory()
  const busy = create.isPending || update.isPending || remove.isPending

  function conflictMessage(trimmed: string) {
    return `Категория «${trimmed}» уже есть в ${group.prepositional}.`
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const trimmed = name.trim()
    if (!trimmed) return setError('Введите название.')
    if (hasCategoryNamed(siblings, trimmed, editing?.id)) return setError(conflictMessage(trimmed))
    setError(null)

    const onError = (mutationError: unknown) => {
      // Проверка выше смотрит на загруженный список, а бэк — на всю БД:
      // дубль мог появиться, например, из другой вкладки
      if (isConflict(mutationError)) setError(conflictMessage(trimmed))
      else if (isNotFound(mutationError)) setFormError('Категория не найдена: возможно, её уже удалили.')
      else setFormError('Не удалось сохранить. Попробуйте ещё раз.')
    }

    if (editing) {
      // Ничего не поменяли — нечего и отправлять
      if (trimmed === editing.name && icon === editing.icon) return onClose()
      update.mutate(
        { id: editing.id, name: trimmed, icon },
        {
          onSuccess: () => {
            onClose()
            onDone(`Категория «${trimmed}» сохранена.`)
          },
          onError,
        },
      )
    } else {
      // Иконку сохраняем явно, даже подобранную: при переименовании
      // категории она не должна сама меняться вслед за названием
      create.mutate(
        { name: trimmed, kind, icon },
        {
          onSuccess: () => {
            onClose()
            onDone(`Категория «${trimmed}» добавлена.`)
          },
          onError,
        },
      )
    }
  }

  function handleDelete() {
    if (!editing) return
    setFormError(null)
    remove.mutate(editing.id, {
      onSuccess: () => {
        onClose()
        onDone(`Категория «${editing.name}» удалена.`)
      },
      onError: (mutationError) => {
        if (isNotFound(mutationError)) {
          // Категории уже нет, например удалили в другой вкладке: цель достигнута
          void refreshLedger()
          onClose()
        } else {
          setFormError('Не удалось удалить. Попробуйте ещё раз.')
        }
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader className="text-left">
        <DialogTitle className="text-lg">
          {editing ? 'Изменить категорию' : `Новая категория ${group.genitive}`}
        </DialogTitle>
        <DialogDescription>
          {editing
            ? 'Название и иконка поменяются и в старых записях.'
            : 'Иконка подберётся по названию, её можно сменить.'}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 grid gap-2">
        <Label htmlFor="category-dialog-name">Название</Label>
        <div className="flex gap-2">
          <IconPicker id="category-dialog" value={icon} onChange={setPickedIcon} />
          <Input
            id="category-dialog-name"
            // Окно открыли ради названия: курсор сразу в нём
            autoFocus
            maxLength={CATEGORY_NAME_MAX_LENGTH}
            autoComplete="off"
            value={name}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'category-dialog-error' : undefined}
            onChange={(event) => setName(event.target.value)}
            className="h-11 bg-sheet"
          />
        </div>
        {error && (
          <p id="category-dialog-error" className="text-sm text-expense">
            {error}
          </p>
        )}
      </div>

      <div role="alert" className="mt-3 min-h-5 text-sm text-expense">
        {formError}
      </div>

      <div className="mt-3 border-t border-rule pt-4">
        {deleteStep.confirming ? (
          <div className="grid gap-3">
            <p className="font-medium">
              Удалить категорию вместе со всеми её записями за все месяцы? Отменить это нельзя.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                ref={deleteStep.keepRef}
                disabled={busy}
                onClick={deleteStep.cancel}
              >
                Не удалять
              </Button>
              <Button
                type="button"
                size="lg"
                className="bg-expense text-white hover:bg-expense/90"
                disabled={busy}
                onClick={handleDelete}
              >
                {remove.isPending ? 'Удаляем…' : 'Удалить с записями'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {editing ? (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className="-ml-2.5 text-expense hover:bg-expense/10 hover:text-expense"
                ref={deleteStep.askRef}
                disabled={busy}
                onClick={deleteStep.ask}
              >
                Удалить категорию
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="lg" disabled={busy} onClick={onClose}>
                Отмена
              </Button>
              <Button type="submit" size="lg" className="px-8" disabled={busy}>
                {create.isPending || update.isPending
                  ? 'Сохраняем…'
                  : editing
                    ? 'Сохранить'
                    : 'Добавить'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </form>
  )
}
