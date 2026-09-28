import { createBrowserRouter, Navigate } from 'react-router'

import { GuestOnly, RequireAuth } from '@/auth/guards'
import { AppLayout } from '@/components/app-layout'
import { RouteError } from '@/components/route-error'
import { LedgerPage } from '@/pages/ledger-page'
import { LoginPage } from '@/pages/login-page'
import { RegisterPage } from '@/pages/register-page'

export const router = createBrowserRouter([
  {
    // Ошибка вне страниц приложения (вход, регистрация, охранники маршрутов)
    errorElement: <RouteError />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            // Общая шапка с разделами для всех страниц после входа
            element: <AppLayout />,
            children: [
              {
                // Ошибка страницы показывается под шапкой: разделы и «Выйти»
                // остаются, можно уйти на другую страницу
                errorElement: <RouteError />,
                children: [
                  { path: '/', element: <LedgerPage /> },
                  {
                    path: '/statistics',
                    // Отдельный чанк: Recharts нужен только здесь, остальные
                    // страницы не должны его скачивать
                    lazy: async () => ({
                      Component: (await import('@/pages/statistics-page')).StatisticsPage,
                    }),
                    // Пока чанк грузится при прямом заходе на /statistics
                    hydrateFallbackElement: (
                      <p className="mt-8 text-sm text-muted-foreground">Загрузка…</p>
                    ),
                  },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
