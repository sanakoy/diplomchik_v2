import { Plus } from 'lucide-react'

import { CategoryIcon } from '@/categories/icons'
import type { Category } from '@/categories/queries'
import { formatRubles } from '@/lib/format'

/** Штамп «Проведено» на плитке после записи; key перезапускает анимацию. */
export interface TileStamp {
  categoryId: number
  key: number
}

interface CategoryTilesProps {
  categories: Category[]
  /** Нажали на плитку: открыть окно записи в эту категорию. */
  onSelect: (category: Category, tile: HTMLButtonElement) => void
  /** Нажали на «+»: открыть окно новой категории. */
  onCreate: (tile: HTMLButtonElement) => void
  stamp: TileStamp | null
  /** id подсказки над плитками: кнопки на неё ссылаются. */
  hintId: string
}

/** Категории плитками: запись в два касания — плитка, потом сумма в окне. */
export function CategoryTiles({ categories, onSelect, onCreate, stamp, hintId }: CategoryTilesProps) {
  // По алфавиту, а не по сумме: плитки не должны переезжать после каждой
  // записи, иначе нужную не найти по привычному месту
  const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name, 'ru'))

  return (
    <ul className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
      {sorted.map((category) => {
        const sum = category.cat_sum ?? 0
        return (
          <li key={category.id} className="relative">
            <button
              type="button"
              aria-describedby={hintId}
              onClick={(event) => onSelect(category, event.currentTarget)}
              className="flex w-full flex-col items-center gap-1.5 rounded-lg px-1 py-2 text-center transition-colors outline-none hover:bg-sheet focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex size-12 items-center justify-center rounded-full border border-rule bg-sheet text-ink">
                <CategoryIcon category={category} className="size-5" />
              </span>
              <span className="line-clamp-2 text-xs leading-tight break-words sm:text-sm">
                {category.name}
              </span>
              <span
                className={`amount text-xs ${sum > 0 ? 'text-muted-foreground' : 'text-muted-foreground/60'}`}
              >
                {formatRubles(sum)}
              </span>
            </button>

            {/* Отметка о записи прямо на плитке: видно, куда легла сумма */}
            {stamp?.categoryId === category.id && (
              <span
                key={stamp.key}
                aria-hidden="true"
                className="stamp-flash pointer-events-none absolute top-1 left-1/2 -ml-11 w-22 rounded-md border-[3px] border-double border-income bg-paper py-0.5 text-center text-xs font-bold text-income"
              >
                Проведено
              </span>
            )}
          </li>
        )
      })}

      {/* «+» в конце списка — новая категория, в окне прямо здесь */}
      <li>
        <button
          type="button"
          onClick={(event) => onCreate(event.currentTarget)}
          className="flex w-full flex-col items-center gap-1.5 rounded-lg px-1 py-2 text-center text-muted-foreground transition-colors outline-none hover:bg-sheet hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex size-12 items-center justify-center rounded-full border border-dashed border-ink/40">
            <Plus aria-hidden="true" className="size-5" />
          </span>
          <span className="text-xs leading-tight sm:text-sm">Новая категория</span>
        </button>
      </li>
    </ul>
  )
}
