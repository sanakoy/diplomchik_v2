interface SegmentedProps<T extends string> {
  /** Имя группы радиокнопок: на странице может быть несколько переключателей. */
  name: string
  /** Подпись группы для скринридера: «Тип», «Период». */
  legend: string
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}

/** Выбор одного из нескольких вариантов: радиокнопки, оформленные как переключатель. */
export function Segmented<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <fieldset className="flex rounded-lg border border-rule bg-sheet p-0.5">
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className="cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors has-checked:bg-ink has-checked:text-sheet has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  )
}
