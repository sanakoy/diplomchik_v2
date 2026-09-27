import { useRef, useState, type FormEvent } from 'react'

import { isNotFound } from '@/api/errors'
import { KIND_LABELS } from '@/components/kind-toggle'
import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDayMonth } from '@/lib/format'
import { refreshLedger } from '@/query-client'

import { useDeleteOperation, useUpdateOperation, type Operation, type OperationChanges } from './queries'
import {
  amountToInput,
  COMMENT_MAX_LENGTH,
  dateToInput,
  validateOperationFields,
  type OperationFieldErrors,
} from './validation'

interface OperationEditDialogProps {
  /** Запись для изменения; null — диалог закрыт. */
  operation: Operation | null
  onClose: () => void
  /** Вызывается после сохранения с датой записи: страница покажет её месяц. */
  onSaved: (isoDate: string) => void
}

export function OperationEditDialog({ operation, onClose, onSaved }: OperationEditDialogProps) {
  // Кнопка, которой открыли диалог. Radix при закрытии возвращает фокус на
  // DialogTrigger, а его здесь нет: диалог открывается из строки таблицы.
  // Без этого фокус падал на body, и с клавиатуры приходилось начинать сначала
  const openerRef = useRef<HTMLElement | null>(null)

  return (
    <Dialog open={operation !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="gap-0 bg-paper p-6 sm:max-w-md"
        onOpenAutoFocus={() => {
          openerRef.current = document.activeElement as HTMLElement | null
        }}
        onCloseAutoFocus={(event) => {
          // Если запись удалили, её кнопки уже нет в DOM: тогда поведение по умолчанию
          if (openerRef.current?.isConnected) {
            event.preventDefault()
            openerRef.current.focus()
          }
        }}
      >
        {/* key: у каждой записи своё состояние формы, от прошлой ничего не остаётся */}
        {operation && (
          <EditOperationForm
            key={operation.id}
            operation={operation}
            onClose={onClose}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EditOperationForm({
  operation,
  onClose,
  onSaved,
}: OperationEditDialogProps & { operation: Operation }) {
  const originalDate = dateToInput(operation.date)
  const [amount, setAmount] = useState(() => amountToInput(operation.sum))
  const [date, setDate] = useState(originalDate)
  const [comment, setComment] = useState(operation.comment ?? '')
  const [errors, setErrors] = useState<OperationFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  // Удаление в два шага: первая кнопка только спрашивает подтверждение
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const update = useUpdateOperation()
  const remove = useDeleteOperation()
  const busy = update.isPending || remove.isPending

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    const { sum, errors: nextErrors } = validateOperationFields(amount, date)
    setErrors(nextErrors)
    if (sum === null || !date) return

    const changes: OperationChanges = { sum, comment: comment.trim() || null }
    // Дату отправляем, только если её поменяли: иначе затёрлось бы время,
    // с которым запись могла прийти не из этой формы
    if (date !== originalDate) changes.date = `${date}T00:00:00`

    update.mutate(
      { id: operation.id, changes },
      {
        onSuccess: () => {
          onClose()
          onSaved(date)
        },
        onError: (error) =>
          setFormError(
            isNotFound(error)
              ? 'Запись не найдена: возможно, её уже удалили.'
              : 'Не удалось сохранить. Попробуйте ещё раз.',
          ),
      },
    )
  }

  function handleDelete() {
    setFormError(null)
    remove.mutate(operation.id, {
      onSuccess: onClose,
      onError: (error) => {
        if (isNotFound(error)) {
          // Записи уже нет, например удалили в другой вкладке: цель достигнута
          void refreshLedger()
          onClose()
        } else {
          setFormError('Не удалось удалить. Попробуйте ещё раз.')
        }
      },
    })
  }

  const kindLabel = KIND_LABELS[operation.is_profit ? 'profit' : 'spending'].toLowerCase()

  return (
    <form onSubmit={handleSubmit} noValidate>
      <DialogHeader>
        <DialogTitle className="text-lg">
          Запись от {operation.date ? formatDayMonth(operation.date) : '—'}
        </DialogTitle>
        <DialogDescription>
          {operation.cat_name}, {kindLabel}. Категорию записи изменить нельзя: для другой
          категории удалите эту запись и создайте новую.
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <FormField
          id="edit-amount"
          label="Сумма, ₽"
          inputMode="decimal"
          autoComplete="off"
          className="amount h-11 bg-sheet text-lg"
          value={amount}
          error={errors.amount}
          onChange={(event) => setAmount(event.target.value)}
        />
        <FormField
          id="edit-date"
          label="Дата"
          type="date"
          required
          value={date}
          error={errors.date}
          onChange={(event) => setDate(event.target.value)}
        />
        <div className="sm:col-span-2">
          <FormField
            id="edit-comment"
            label="Комментарий"
            maxLength={COMMENT_MAX_LENGTH}
            autoComplete="off"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </div>
      </div>

      <div role="alert" className="mt-3 min-h-5 text-sm text-expense">
        {formError}
      </div>

      <div className="mt-3 border-t border-rule pt-4">
        {confirmingDelete ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium">Удалить запись? Отменить это нельзя.</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={busy}
                onClick={() => setConfirmingDelete(false)}
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
                {remove.isPending ? 'Удаляем…' : 'Удалить'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="-ml-2.5 text-expense hover:bg-expense/10 hover:text-expense"
              disabled={busy}
              onClick={() => setConfirmingDelete(true)}
            >
              Удалить запись
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="lg" disabled={busy} onClick={onClose}>
                Отмена
              </Button>
              <Button type="submit" size="lg" disabled={busy}>
                {update.isPending ? 'Сохраняем…' : 'Сохранить'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </form>
  )
}
