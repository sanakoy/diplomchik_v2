import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import { ICON_KEYS, type IconKey } from './icon-keys'
import { ICONS } from './icons'

interface IconPickerProps {
  /** Уникален на странице: имя группы радиокнопок. */
  id: string
  value: IconKey
  onChange: (icon: IconKey) => void
  /** Размер кнопки под соседнее поле: h-11 в форме, h-9 в строке списка. */
  size?: 'default' | 'compact'
}

/**
 * Выбор иконки: кнопка с текущей иконкой открывает сетку. Сетка — группа
 * радиокнопок: стрелки ходят по иконкам, пробел выбирает, как в любой
 * группе радио. После выбора сетка закрывается.
 */
export function IconPicker({ id, value, onChange, size = 'default' }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const { Icon, label } = ICONS[value]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={`Иконка: ${label.toLowerCase()}. Выбрать другую`}
          className={`shrink-0 bg-sheet ${size === 'compact' ? 'size-9' : 'size-11'}`}
        >
          <Icon className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto border-rule bg-paper p-3">
        <fieldset>
          <legend className="mb-2 text-sm text-muted-foreground">Иконка категории</legend>
          <div className="grid grid-cols-6 gap-1.5">
            {ICON_KEYS.map((key) => {
              const option = ICONS[key]
              return (
                <label
                  key={key}
                  title={option.label}
                  className="flex size-10 cursor-pointer items-center justify-center rounded-md text-ink transition-colors hover:bg-sheet has-checked:bg-ink has-checked:text-sheet has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                >
                  <input
                    type="radio"
                    name={`${id}-icon`}
                    value={key}
                    checked={value === key}
                    aria-label={option.label}
                    onChange={() => onChange(key)}
                    // Закрываем по клику, а не по onChange: стрелки тоже меняют
                    // выбор, и сетка закрывалась бы на первом же шаге
                    onClick={(event) => {
                      if (event.detail > 0) setOpen(false)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        setOpen(false)
                      }
                    }}
                    className="sr-only"
                  />
                  <option.Icon aria-hidden="true" className="size-5" />
                </label>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Enter — выбрать и закрыть</p>
        </fieldset>
      </PopoverContent>
    </Popover>
  )
}
