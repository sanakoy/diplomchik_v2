import type { ReactNode } from 'react'

import { PassbookPreview } from './passbook-preview'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Слева — пример страницы учёта, на узких экранах его нет: форма важнее */}
      <aside className="hidden items-center justify-center border-r border-rule bg-sheet px-12 py-16 lg:flex">
        <PassbookPreview />
      </aside>

      <main className="flex flex-col px-6 py-8 sm:px-12">
        <p className="text-lg font-semibold">Money Tracker</p>
        {/* На телефоне форма сразу под названием, на широком экране — по центру высоты */}
        <div className="w-full max-w-sm pt-12 sm:my-auto sm:py-12">{children}</div>
      </main>
    </div>
  )
}
