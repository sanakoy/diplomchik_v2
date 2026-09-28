import { useEffect, useRef, useState } from 'react'

/**
 * Удаление в два шага внутри окна: «Удалить…» → «Не удалять / Удалить».
 *
 * Фокус ведём сами. Нажатая кнопка исчезает, и Radix, заметив пропажу
 * сфокусированного элемента, переводит фокус на само окно — уже после
 * autoFocus новой кнопки. Поэтому фокус ставим кадром позже: на безопасное
 * «Не удалять» (случайный Enter ничего не удалит), а после отмены — обратно
 * на «Удалить…», откуда начали.
 */
export function useConfirmStep() {
  const [confirming, setConfirming] = useState(false)
  const keepRef = useRef<HTMLButtonElement>(null)
  const askRef = useRef<HTMLButtonElement>(null)
  // При первом показе окна фокус не трогаем: он в поле ввода
  const stepChanged = useRef(false)

  useEffect(() => {
    if (!stepChanged.current) return
    const target = confirming ? keepRef : askRef
    const frame = requestAnimationFrame(() => target.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [confirming])

  function setStep(next: boolean) {
    stepChanged.current = true
    setConfirming(next)
  }

  return {
    confirming,
    ask: () => setStep(true),
    cancel: () => setStep(false),
    /** На кнопку «Не удалять». */
    keepRef,
    /** На кнопку «Удалить…», с которой начинается подтверждение. */
    askRef,
  }
}
