import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { ChartContainer, ChartTooltip, type ChartConfig } from '@/components/ui/chart'
import { formatAmount } from '@/lib/format'

import type { Breakdown, BreakdownRow, Series } from './breakdown'

// Ось в «85 тыс.», а не «85 000,00»: копейки на оси только мешают
const axisFormatter = new Intl.NumberFormat('ru-RU', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export const percentFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'percent',
  maximumFractionDigits: 0,
})

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload?: BreakdownRow }>
  series: Series[]
}

/** Подсказка месяца: категории от большей суммы к меньшей, с долей от месяца. */
function BreakdownTooltip({ active, payload, series }: TooltipProps) {
  const row = payload?.[0]?.payload
  if (!active || !row) return null

  const items = series
    .map((s) => ({ ...s, value: Number(row[s.key]) }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)

  return (
    <div className="min-w-56 rounded-lg border border-rule bg-sheet px-3 py-2.5 text-xs shadow-lg">
      <p className="font-medium">{row.title}</p>
      {items.length === 0 ? (
        <p className="mt-1.5 text-muted-foreground">Записей нет</p>
      ) : (
        <ul className="mt-1.5 grid gap-1">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
              <span className="min-w-0 truncate text-muted-foreground">{item.name}</span>
              <span className="amount ml-auto pl-3 font-medium">{formatAmount(item.value)}</span>
              <span className="amount w-9 text-right text-muted-foreground">
                {percentFormatter.format(item.value / row.total)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 flex justify-between border-t border-rule pt-1.5 font-medium">
        <span>Всего</span>
        <span className="amount">{formatAmount(row.total)}</span>
      </p>
    </div>
  )
}

export function CategoryChart({ breakdown }: { breakdown: Breakdown }) {
  const config: ChartConfig = Object.fromEntries(
    breakdown.series.map((s) => [s.key, { label: s.name, color: s.color }]),
  )

  return (
    // Сам график скринридеру не читаем: те же суммы есть в рейтинге под ним
    <ChartContainer config={config} className="aspect-auto h-72 w-full" aria-hidden="true">
      <BarChart data={breakdown.rows} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--rule)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          // На узком экране подписи не влезут все: Recharts пропустит лишние
          minTickGap={4}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(value: number) => axisFormatter.format(value)}
        />
        <ChartTooltip
          cursor={{ fill: 'var(--rule)', opacity: 0.35 }}
          content={<BreakdownTooltip series={breakdown.series} />}
        />
        {/* Крупные категории внизу стопки: их проще сравнивать между столбиками.
            Обводка цветом фона — зазор 2px между частями стопки: без него
            соседние цвета сливаются. Без анимации роста: движение в интерфейсе
            одно — штамп «Проведено», а анимация Recharts не учитывает
            prefers-reduced-motion */}
        {breakdown.series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            stackId="period"
            fill={s.color}
            stroke="var(--paper)"
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}
