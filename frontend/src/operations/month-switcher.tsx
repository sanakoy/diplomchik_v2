import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { currentMonth, isSameMonth, monthTitle, shiftMonth, type YearMonth } from '@/lib/month'

interface MonthSwitcherProps {
  month: YearMonth
  onChange: (month: YearMonth) => void
  /** Уровень заголовка: на главной месяц — главный заголовок, в статистике — нет. */
  titleAs?: 'h1' | 'h2'
}

export function MonthSwitcher({ month, onChange, titleAs: Title = 'h1' }: MonthSwitcherProps) {
  const today = currentMonth()

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Предыдущий месяц"
          onClick={() => onChange(shiftMonth(month, -1))}
        >
          <ChevronLeft />
        </Button>
        {/* aria-live: скринридер прочитает новый месяц после переключения */}
        <Title
          aria-live="polite"
          className="min-w-[9.5ch] text-center text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {monthTitle(month)}
        </Title>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Следующий месяц"
          onClick={() => onChange(shiftMonth(month, 1))}
        >
          <ChevronRight />
        </Button>
      </div>

      {!isSameMonth(month, today) && (
        <button
          type="button"
          onClick={() => onChange(today)}
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          К текущему месяцу
        </button>
      )}
    </div>
  )
}
