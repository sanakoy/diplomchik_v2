// Проверенная категориальная палитра (скрипт validate_palette из скилла dataviz,
// фон #E9EFE8): различима и при нарушениях цветового зрения. Без красного
// и зелёного: в книжке это цвета расхода и дохода, а категория расходов,
// покрашенная зелёным, читалась бы как доход. Порядок фиксирован
export const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#4a3aa7']
export const OTHER_COLOR = '#aab5ad'

/**
 * Цвета для списка, уже отсортированного по убыванию суммы. Хватает цветов —
 * у каждого свой. Не хватает — свои у крупнейших, остальным серый, и на
 * графиках они показываются вместе, как «Остальное».
 */
export function rankedColors(count: number): string[] {
  const own = count <= PALETTE.length ? count : PALETTE.length - 1
  return Array.from({ length: count }, (_, index) => (index < own ? PALETTE[index] : OTHER_COLOR))
}
