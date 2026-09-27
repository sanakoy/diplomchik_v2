import { formatAmount } from '@/lib/format'
import type { YearMonth } from '@/lib/month'

import { useCategories, type Category, type OperationKind } from './queries'

const GROUPS: Record<OperationKind, { title: string; empty: string; bar: string }> = {
  spending: { title: 'Расходы', empty: 'Категорий расходов пока нет.', bar: 'bg-expense' },
  profit: { title: 'Доходы', empty: 'Категорий доходов пока нет.', bar: 'bg-income' },
}

// Крупные статьи сверху; при равных суммах — по алфавиту, чтобы порядок не прыгал
function bySumDesc(a: Category, b: Category): number {
  return (b.cat_sum ?? 0) - (a.cat_sum ?? 0) || a.name.localeCompare(b.name, 'ru')
}

function CategoryGroup({ kind, month }: { kind: OperationKind; month: YearMonth }) {
  const categories = useCategories(kind, month)
  const group = GROUPS[kind]
  const titleId = `categories-${kind}`

  let body
  if (categories.isError) {
    body = <p className="py-3 text-sm text-expense">Не удалось загрузить категории.</p>
  } else if (!categories.data) {
    body = <p className="py-3 text-sm text-muted-foreground">Загрузка…</p>
  } else if (categories.data.length === 0) {
    body = <p className="py-3 text-sm text-muted-foreground">{group.empty}</p>
  } else {
    const total = categories.data.reduce((sum, category) => sum + (category.cat_sum ?? 0), 0)
    body = (
      <ul className={categories.isPlaceholderData ? 'opacity-50 transition-opacity' : ''}>
        {[...categories.data].sort(bySumDesc).map((category) => {
          const sum = category.cat_sum ?? 0
          return (
            <li key={category.id} className="border-b border-rule py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className={`min-w-0 break-words ${sum === 0 ? 'text-muted-foreground' : ''}`}>
                  {category.name}
                </span>
                <span className={`amount whitespace-nowrap ${sum === 0 ? 'text-muted-foreground' : ''}`}>
                  {formatAmount(sum)}
                </span>
              </div>
              {/* Доля категории в расходах или доходах месяца; цифра рядом, полоска — для глаза */}
              {sum > 0 && (
                <div aria-hidden="true" className="mt-1.5 h-0.5 bg-rule/60">
                  <div className={`h-full ${group.bar}`} style={{ width: `${(sum / total) * 100}%` }} />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId} className="border-b-2 border-ink pb-2 text-lg font-semibold">
        {group.title}
      </h2>
      {body}
    </section>
  )
}

/** Суммы по категориям за месяц: расходы и доходы рядом, на телефоне друг под другом. */
export function CategoryTotals({ month }: { month: YearMonth }) {
  return (
    <div className="mt-10 grid gap-10 sm:grid-cols-2 sm:gap-8">
      <CategoryGroup kind="spending" month={month} />
      <CategoryGroup kind="profit" month={month} />
    </div>
  )
}
