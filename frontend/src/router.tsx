import { createBrowserRouter, Navigate } from 'react-router'

import { GuestOnly, RequireAuth } from '@/auth/guards'
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
    children: [{ path: '/', element: <LedgerPage /> }],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
