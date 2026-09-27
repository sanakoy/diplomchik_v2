import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { CategoryTotals } from '@/categories/category-totals'
import { Button } from '@/components/ui/button'
import {
  formatMonthParam,
  isSameMonth,
  monthName,
  monthOfIsoDate,
  parseMonthParam,
  type YearMonth,
} from '@/lib/month'
import { LedgerTable } from '@/operations/ledger-table'
import { MonthSummary } from '@/operations/month-summary'
import { MonthSwitcher } from '@/operations/month-switcher'
import { OperationEditDialog } from '@/operations/operation-edit-dialog'
import { OperationForm } from '@/operations/operation-form'
import { useMonthOperations, type Operation } from '@/operations/queries'
import { summarize } from '@/operations/summary'

export function LedgerPage() {
  // Месяц живёт в адресе (?month=2026-09): работает «Назад», ссылку можно сохранить
  const [searchParams, setSearchParams] = useSearchParams()
  const month = parseMonthParam(searchParams.get('month'))
  const operations = useMonthOperations(month)
  // Запись, открытая в диалоге изменения; null — диалог закрыт
  const [editing, setEditing] = useState<Operation | null>(null)

  function showMonth(next: YearMonth) {
    setSearchParams({ month: formatMonthParam(next) })
  }

  function handleSaved(isoDate: string) {
    // Запись в другой месяц иначе «пропала» бы: показываем месяц, куда она легла
    const savedMonth = monthOfIsoDate(isoDate)
    if (!isSameMonth(savedMonth, month)) showMonth(savedMonth)
  }

  return (
    <main className="mt-8">
      <MonthSwitcher month={month} onChange={showMonth} />

      <div className="mt-6">
        {operations.data ? (
          <MonthSummary
            netLabel={`Итог за ${monthName(month)}`}
            summary={summarize(operations.data)}
          />
        ) : (
          // Место под итоги занято заранее, чтобы форма не прыгала после загрузки
          <div className="h-[8.5rem] border-y-[3px] border-double border-ink sm:h-[6.25rem]" />
        )}
      </div>

      <CategoryTotals month={month} />

      <section className="mt-10">
        <OperationForm month={month} onSaved={handleSaved} />
      </section>

      <section aria-label="Записи" className="mt-10">
        {operations.isError ? (
          <div className="border-t-2 border-ink py-6 text-sm">
            <p className="text-expense">Не удалось загрузить записи.</p>
            <Button variant="outline" className="mt-3" onClick={() => void operations.refetch()}>
              Повторить
            </Button>
          </div>
        ) : operations.data === undefined ? (
          <p className="border-t-2 border-ink py-6 text-sm text-muted-foreground">Загрузка…</p>
        ) : operations.data.length === 0 ? (
          <p className="border-t-2 border-ink py-6 text-muted-foreground">
            Записей за {monthName(month)} {month.year} нет.
          </p>
        ) : (
          // Пока грузится другой месяц, старые строки видны, но приглушены
          <div className={operations.isPlaceholderData ? 'opacity-50 transition-opacity' : ''}>
            <LedgerTable operations={operations.data} onEdit={setEditing} />
          </div>
        )}
      </section>

      <OperationEditDialog
        operation={editing}
        onClose={() => setEditing(null)}
        onSaved={handleSaved}
      />
    </main>
  )
}
