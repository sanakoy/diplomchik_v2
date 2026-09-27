import type { ComponentProps } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FormFieldProps extends ComponentProps<typeof Input> {
  id: string
  label: string
  hint?: string
  error?: string
}

/** Поле формы: подпись, подсказка и ошибка связаны с полем для скринридеров. */
export function FormField({ id, label, hint, error, ...inputProps }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined

  return (
    // content-start: в ряду с соседом повыше поле не растягивается, а держится у подписи
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        className="h-11 bg-sheet"
        {...inputProps}
      />
      {hint && !error && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-expense">
          {error}
        </p>
      )}
    </div>
  )
}
