import type { OperationKind } from '@/query-client'

export const KIND_LABELS: Record<OperationKind, string> = { spending: 'Расход', profit: 'Доход' }

interface KindToggleProps {
  /** Имя группы радиокнопок: на странице может быть несколько переключателей. */
  name: string
  value: OperationKind
  onChange: (kind: OperationKind) => void
}

/** «Расход / Доход»: две радиокнопки, оформленные как переключатель. */
export function KindToggle({ name, value, onChange }: KindToggleProps) {
  return (
    <fieldset className="flex rounded-lg border border-rule bg-sheet p-0.5">
      <legend className="sr-only">Тип</legend>
      {(['spending', 'profit'] as const).map((kind) => (
        <label
          key={kind}
          className="cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors has-checked:bg-ink has-checked:text-sheet has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
        >
          <input
            type="radio"
            name={name}
            value={kind}
            checked={value === kind}
            onChange={() => onChange(kind)}
            className="sr-only"
          />
          {KIND_LABELS[kind]}
        </label>
      ))}
    </fieldset>
  )
}
