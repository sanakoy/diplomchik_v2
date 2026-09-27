import { createBrowserRouter, Navigate } from 'react-router'

import { GuestOnly, RequireAuth } from '@/auth/guards'
import { AppLayout } from '@/components/app-layout'
import { CategoriesPage } from '@/pages/categories-page'
import { LedgerPage } from '@/pages/ledger-page'
import { LoginPage } from '@/pages/login-page'
import { RegisterPage } from '@/pages/register-page'

export const router = createBrowserRouter([
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
          { path: '/', element: <LedgerPage /> },
          { path: '/categories', element: <CategoriesPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
