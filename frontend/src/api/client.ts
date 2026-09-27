import createClient from 'openapi-fetch'

import type { paths } from './schema'

// Относительный адрес: в разработке запросы проксирует Vite, в Docker — nginx.
// Для браузера фронт и API на одном адресе, поэтому CORS не нужен
export const api = createClient<paths>({ baseUrl: '' })
