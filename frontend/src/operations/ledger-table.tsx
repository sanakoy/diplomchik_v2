import { Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatAmount, formatDayMonth, formatSignedAmount } from '@/lib/format'

import type { Operation } from './queries'

interface LedgerTableProps {
  operations: Operation[]
  onEdit: (operation: Operation) => void
}

export function LedgerTable({ operations, onEdit }: LedgerTableProps) {
  return (
    <table className="w-full border-collapse text-[15px]">
      <caption className="sr-only">Записи за месяц, новые сверху</caption>
      <thead>
        <tr className="border-b-2 border-ink text-left text-sm text-muted-foreground">
          <th scope="col" className="w-16 pb-2 font-normal">
            Дата
          </th>
          <th scope="col" className="pb-2 font-normal">
            Запись
          </th>
          {/* На телефоне двум колонкам сумм не хватает места: одна колонка со знаком */}
          <th scope="col" className="pb-2 text-right font-normal sm:hidden">
            Сумма
          </th>
          <th scope="col" className="hidden w-36 pb-2 text-right font-normal sm:table-cell">
            Доход
          </th>
          <th scope="col" className="hidden w-36 pb-2 text-right font-normal sm:table-cell">
            Расход
          </th>
          <th scope="col" className="w-12 pb-2 sm:w-10">
            <span className="sr-only">Действия</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {operations.map((operation) => (
          <tr key={operation.id} className="border-b border-rule align-top">
            <td className="amount py-3 text-muted-foreground">
              {operation.date ? formatDayMonth(operation.date) : '—'}
            </td>
            <td className="py-3 pr-3">
              <div>{operation.cat_name}</div>
              {operation.comment && (
                <div className="mt-0.5 text-sm break-words text-muted-foreground">
                  {operation.comment}
                </div>
              )}
            </td>
            <td
              className={`amount py-3 text-right whitespace-nowrap sm:hidden ${operation.is_profit ? 'text-income' : 'text-expense'}`}
            >
              {formatSignedAmount(operation.is_profit ? operation.sum : -operation.sum)}
            </td>
            <td className="amount hidden py-3 text-right text-income sm:table-cell">
              {operation.is_profit ? formatAmount(operation.sum) : ''}
            </td>
            <td className="amount hidden py-3 text-right text-expense sm:table-cell">
              {operation.is_profit ? '' : formatAmount(operation.sum)}
            </td>
            <td className="py-2 pl-2 text-right">
              <Button
                variant="ghost"
                size="icon"
                className="size-10 sm:size-8"
                // В названии кнопки — какая запись: иначе скринридер прочитает
                // десяток одинаковых «Изменить»
                aria-label={`Изменить запись: ${operation.cat_name}, ${operation.date ? formatDayMonth(operation.date) : 'без даты'}`}
                onClick={() => onEdit(operation)}
              >
                <Pencil />
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
