import { CategoryRow } from '@/categories/category-row'
import { NewCategoryForm } from '@/categories/new-category-form'
import { useCategories, type OperationKind } from '@/categories/queries'
import { currentMonth } from '@/lib/month'

const GROUPS: Record<OperationKind, { title: string; empty: string }> = {
  spending: { title: 'Расходы', empty: 'Категорий расходов пока нет.' },
  profit: { title: 'Доходы', empty: 'Категорий доходов пока нет.' },
}

function CategoryList({ kind }: { kind: OperationKind }) {
  const categories = useCategories(kind, currentMonth())
  const group = GROUPS[kind]
  const titleId = `manage-${kind}`

  let body
  if (categories.isError) {
    body = <p className="py-3 text-sm text-expense">Не удалось загрузить категории.</p>
  } else if (!categories.data) {
    body = <p className="py-3 text-sm text-muted-foreground">Загрузка…</p>
  } else if (categories.data.length === 0) {
    body = <p className="py-3 text-sm text-muted-foreground">{group.empty}</p>
  } else {
    // По алфавиту: здесь категории ищут по названию, а не по сумме
    const sorted = [...categories.data].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    body = (
      <ul>
        {sorted.map((category) => (
          <CategoryRow key={category.id} category={category} siblings={categories.data} />
        ))}
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

export function CategoriesPage() {
  return (
    <main className="mt-8">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Категории</h1>

      <div className="mt-8">
        <NewCategoryForm />
      </div>

      <div className="mt-8 grid gap-10 sm:grid-cols-2 sm:gap-8">
        <CategoryList kind="spending" />
        <CategoryList kind="profit" />
      </div>
    </main>
  )
}
