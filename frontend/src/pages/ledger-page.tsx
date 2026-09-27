import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'

import { api } from '@/api/client'
import { logout } from '@/auth/actions'
import { Button } from '@/components/ui/button'
import {
  formatMonthParam,
  isSameMonth,
  monthName,
  monthOfIsoDate,
  parseMonthParam,
  type YearMonth,
} from '@/lib/month'
import { CategoryTotals } from '@/operations/category-totals'
import { LedgerTable } from '@/operations/ledger-table'
import { MonthSummary } from '@/operations/month-summary'
import { MonthSwitcher } from '@/operations/month-switcher'
import { OperationForm } from '@/operations/operation-form'
import { useMonthOperations } from '@/operations/queries'
import { summarize } from '@/operations/summary'

export function LedgerPage() {
  // Месяц живёт в адресе (?month=2026-09): работает «Назад», ссылку можно сохранить
  const [searchParams, setSearchParams] = useSearchParams()
  const month = parseMonthParam(searchParams.get('month'))
  const operations = useMonthOperations(month)

  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/auth/me')
      if (!data) throw new Error('Не удалось загрузить профиль')
      return data
    },
  })

  function showMonth(next: YearMonth) {
    setSearchParams({ month: formatMonthParam(next) })
  }

  function handleSaved(isoDate: string) {
    // Запись в другой месяц иначе «пропала» бы: показываем месяц, куда она легла
    const savedMonth = monthOfIsoDate(isoDate)
    if (!isSameMonth(savedMonth, month)) showMonth(savedMonth)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between gap-4 border-b border-rule py-4">
        <p className="text-lg font-semibold">Книжка</p>
        <div className="flex min-w-0 items-center gap-4">
          <p className="hidden truncate text-sm text-muted-foreground sm:block">{me.data?.email}</p>
          <Button variant="outline" onClick={() => void logout()}>
            Выйти
          </Button>
        </div>
      </header>

      <main className="mt-8">
        <MonthSwitcher month={month} onChange={showMonth} />

        <div className="mt-6">
          {operations.data ? (
            <MonthSummary month={month} summary={summarize(operations.data)} />
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
              <LedgerTable operations={operations.data} />
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
