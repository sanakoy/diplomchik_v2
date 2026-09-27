import { Pencil, Trash2 } from 'lucide-react'
import { useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react'

import { isNotFound } from '@/api/errors'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { refreshLedger } from '@/query-client'

import {
  CATEGORY_NAME_MAX_LENGTH,
  hasCategoryNamed,
  useDeleteCategory,
  useRenameCategory,
  type Category,
} from './queries'

interface CategoryRowProps {
  category: Category
  /** Все категории того же типа: для проверки, что новое имя не занято. */
  siblings: Category[]
}

export function CategoryRow({ category, siblings }: CategoryRowProps) {
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  // Кнопки строки: после переименования и закрытия диалога фокус возвращается
  // туда, откуда начали, а не падает на body
  const renameButtonRef = useRef<HTMLButtonElement>(null)
  const deleteButtonRef = useRef<HTMLButtonElement>(null)

  function finishEditing() {
    setEditing(false)
    // Кнопка появится в DOM после перерисовки, поэтому фокус — в следующем кадре
    requestAnimationFrame(() => renameButtonRef.current?.focus())
  }

  return (
    <li className="border-b border-rule py-2">
      {editing ? (
        <RenameForm category={category} siblings={siblings} onDone={finishEditing} />
      ) : (
        <div className="flex min-h-9 items-center justify-between gap-3">
          <span className="min-w-0 break-words">{category.name}</span>
          <div className="flex shrink-0 gap-1">
            <Button
              ref={renameButtonRef}
              variant="ghost"
              size="icon"
              // На телефоне крупнее: в палец попасть проще
              className="size-10 sm:size-8"
              aria-label={`Переименовать категорию «${category.name}»`}
              onClick={() => setEditing(true)}
            >
              <Pencil />
            </Button>
            <Button
              ref={deleteButtonRef}
              variant="ghost"
              size="icon"
              aria-label={`Удалить категорию «${category.name}»`}
              className="size-10 hover:bg-expense/10 hover:text-expense sm:size-8"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      )}

      <DeleteCategoryDialog
        category={category}
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        returnFocusTo={deleteButtonRef}
      />
    </li>
  )
}

function RenameForm({
  category,
  siblings,
  onDone,
}: CategoryRowProps & { onDone: () => void }) {
  const [name, setName] = useState(category.name)
  const [error, setError] = useState<string | null>(null)
  const rename = useRenameCategory()
  const errorId = `rename-${category.id}-error`

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setError('Введите название.')
    if (trimmed === category.name) return onDone()
    if (hasCategoryNamed(siblings, trimmed, category.id)) {
      return setError('Категория с таким названием уже есть.')
    }

    rename.mutate(
      { id: category.id, name: trimmed },
      {
        onSuccess: onDone,
        onError: (mutationError) =>
          setError(
            isNotFound(mutationError)
              ? 'Категория не найдена: возможно, её уже удалили.'
              : 'Не удалось переименовать. Попробуйте ещё раз.',
          ),
      },
    )
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') onDone()
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label={`Новое название категории «${category.name}»`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          // Поле появилось по нажатию «Переименовать»: фокус сразу в нём
          autoFocus
          maxLength={CATEGORY_NAME_MAX_LENGTH}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={handleKeyDown}
          className="h-9 min-w-40 flex-1 bg-sheet"
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={rename.isPending} onClick={onDone}>
            Отмена
          </Button>
          <Button type="submit" disabled={rename.isPending}>
            {rename.isPending ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </div>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-expense">
          {error}
        </p>
      )}
    </form>
  )
}

interface DeleteCategoryDialogProps {
  category: Category
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Radix возвращает фокус на AlertDialogTrigger, а диалог открыт без него. */
  returnFocusTo: RefObject<HTMLButtonElement | null>
}

function DeleteCategoryDialog({
  category,
  open,
  onOpenChange,
  returnFocusTo,
}: DeleteCategoryDialogProps) {
  const remove = useDeleteCategory()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    setError(null)
    remove.mutate(category.id, {
      onSuccess: () => onOpenChange(false),
      onError: (mutationError) => {
        if (isNotFound(mutationError)) {
          // Категории уже нет: обновляем список, цель достигнута
          void refreshLedger()
          onOpenChange(false)
        } else {
          setError('Не удалось удалить. Попробуйте ещё раз.')
        }
      },
    })
  }

  return (
    <AlertDialog
      open={open}
      // Пока идёт удаление, диалог не закрывается: иначе ошибка потерялась бы
      onOpenChange={(next) => !remove.isPending && onOpenChange(next)}
    >
      <AlertDialogContent
        className="bg-paper p-6 sm:max-w-md"
        onCloseAutoFocus={(event) => {
          // После удаления строки нет, кнопки тоже: тогда поведение по умолчанию
          if (returnFocusTo.current?.isConnected) {
            event.preventDefault()
            returnFocusTo.current.focus()
          }
        }}
      >
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="text-lg">
            Удалить категорию «{category.name}»?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Вместе с ней удалятся все её записи за все месяцы. Отменить это нельзя.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p role="alert" className="text-sm text-expense">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-rule pt-4 sm:flex-row sm:justify-end">
          <AlertDialogCancel size="lg" disabled={remove.isPending}>
            Не удалять
          </AlertDialogCancel>
          {/* Обычная кнопка, а не AlertDialogAction: та закрывает диалог сразу,
              не дожидаясь ответа сервера */}
          <Button
            size="lg"
            className="bg-expense text-white hover:bg-expense/90"
            disabled={remove.isPending}
            onClick={handleDelete}
          >
            {remove.isPending ? 'Удаляем…' : 'Удалить с записями'}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
