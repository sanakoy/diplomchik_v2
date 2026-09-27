import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import { refreshAccessToken } from './auth/refresh'
import './index.css'
import { queryClient } from './query-client'
import { router } from './router'

// Восстанавливаем сессию после перезагрузки страницы: access-токен жил в памяти
// и пропал, но refresh-cookie осталась. Результат попадёт в session
void refreshAccessToken()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
