import type { OperationKind } from '@/query-client'

import { Segmented } from './segmented'

export const KIND_LABELS: Record<OperationKind, string> = { spending: 'Расход', profit: 'Доход' }

const KIND_OPTIONS = [
  { value: 'spending', label: KIND_LABELS.spending },
  { value: 'profit', label: KIND_LABELS.profit },
] as const

interface KindToggleProps {
  /** Имя группы радиокнопок: на странице может быть несколько переключателей. */
  name: string
  value: OperationKind
  onChange: (kind: OperationKind) => void
}

/** «Расход / Доход». */
export function KindToggle({ name, value, onChange }: KindToggleProps) {
  return <Segmented name={name} legend="Тип" options={KIND_OPTIONS} value={value} onChange={onChange} />
}
