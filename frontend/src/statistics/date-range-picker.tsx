import { CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { ru } from 'react-day-picker/locale'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatRange, isoToLocalDate, localDateToIso } from '@/lib/dates'
import { useMediaQuery } from '@/lib/use-media-query'

import { PERIOD_MAX_DAYS } from './period'

interface DateRangePickerProps {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}

/**
 * Выбор периода в календаре: первый клик — начало, второй — конец.
 * После второго период применяется и календарь закрывается: отдельная
 * кнопка «Применить» была бы лишним шагом.
 */
export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  // Начало, выбранное первым кликом; null — ждём первый клик
  const [start, setStart] = useState<Date | null>(null)
  // На широком экране два месяца рядом: период на стыке месяцев виден целиком
  const wide = useMediaQuery('(min-width: 640px)')

  function handleOpenChange(next: boolean) {
    setOpen(next)
    setStart(null)
  }

  function handleDayClick(day: Date) {
    if (!start) {
      setStart(day)
      return
    }
    // Порядок кликов неважен: раньше выбранный день — начало
    const [first, last] = day < start ? [day, start] : [start, day]
    onChange(localDateToIso(first), localDateToIso(last))
    handleOpenChange(false)
  }

  // Пока выбран только старт, дальше 366 дней от него выбрать нельзя — как на бэке
  const limit = PERIOD_MAX_DAYS - 1
  const disabled = start
    ? [
        { before: new Date(start.getFullYear(), start.getMonth(), start.getDate() - limit) },
        { after: new Date(start.getFullYear(), start.getMonth(), start.getDate() + limit) },
      ]
    : undefined

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="lg" className="h-11 gap-2.5 bg-sheet px-3.5 text-base font-normal">
          <CalendarDays className="text-muted-foreground" />
          {formatRange(from, to)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto border-rule bg-paper p-3">
        <Calendar
          mode="range"
          locale={ru}
          numberOfMonths={wide ? 2 : 1}
          // Дни соседних месяцев в двух сетках рядом повторялись бы:
          // 30 сентября выглядело бы выбранным и в сетке октября
          showOutsideDays={false}
          defaultMonth={isoToLocalDate(wide ? from : to)}
          // Управляем выбором сами: range-режим календаря нужен только для подсветки
          selected={
            start
              ? { from: start, to: undefined }
              : { from: isoToLocalDate(from), to: isoToLocalDate(to) }
          }
          onDayClick={handleDayClick}
          disabled={disabled}
          // На телефоне клетки крупнее: в день пальцем попасть проще
          className="bg-transparent p-0 [--cell-size:--spacing(10)] sm:[--cell-size:--spacing(8)]"
        />
        <p aria-live="polite" className="mt-3 text-sm text-muted-foreground">
          {start ? 'Выберите последний день' : 'Выберите первый день периода'}
        </p>
      </PopoverContent>
    </Popover>
  )
}
