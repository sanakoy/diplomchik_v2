import { formatAmount } from '@/lib/format'

// Пример страницы учёта: показывает, чем будет заниматься пользователь.
// Суммы и остаток сходятся: 85 000 − 2 350 − 1 200 − 640 + 12 500 = 93 310
const SAMPLE_ENTRIES = [
  { date: '03.09', title: 'Зарплата', amount: 85000 },
  { date: '05.09', title: 'Продукты', amount: -2350 },
  { date: '08.09', title: 'Проезд', amount: -1200 },
  { date: '12.09', title: 'Кафе', amount: -640 },
  { date: '15.09', title: 'Фриланс', amount: 12500 },
]

const balance = SAMPLE_ENTRIES.reduce((sum, entry) => sum + entry.amount, 0)

export function PassbookPreview() {
  return (
    // Иллюстрация, а не данные пользователя: скринридеру её читать незачем
    <div aria-hidden="true" className="relative w-full max-w-md">
      <p className="text-sm text-muted-foreground">Доходы и расходы за сентябрь</p>
      <p className="mt-1 text-2xl font-semibold">Учёт финансов</p>

      <table className="mt-8 w-full border-collapse text-[15px]">
        <thead>
          <tr className="border-b-2 border-ink text-left text-sm text-muted-foreground">
            <th className="w-16 pb-2 font-normal">Дата</th>
            <th className="pb-2 font-normal">Запись</th>
            <th className="pb-2 text-right font-normal">Доход</th>
            <th className="pb-2 text-right font-normal">Расход</th>
          </tr>
        </thead>
        <tbody>
          {SAMPLE_ENTRIES.map((entry) => (
            <tr key={entry.date + entry.title} className="border-b border-rule">
              <td className="amount py-3 text-muted-foreground">{entry.date}</td>
              <td className="py-3">{entry.title}</td>
              <td className="amount py-3 text-right text-income">
                {entry.amount > 0 ? formatAmount(entry.amount) : ''}
              </td>
              <td className="amount py-3 text-right text-expense">
                {entry.amount < 0 ? formatAmount(-entry.amount) : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex items-baseline justify-between border-t-2 border-double border-ink pt-4">
        <span className="text-sm text-muted-foreground">Остаток на 15.09</span>
        <span className="amount text-4xl font-semibold tracking-tight">
          {formatAmount(balance)}
        </span>
      </div>

      <div className="stamp absolute -top-2 right-0 rounded-md border-[3px] border-double border-expense px-4 py-1.5 text-center text-expense">
        <div className="text-lg font-bold leading-tight">Проведено</div>
        <div className="amount text-xs">15.09.2026</div>
      </div>
    </div>
  )
}
