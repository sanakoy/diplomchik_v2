# Фронтенд

React 19 + TypeScript + Vite, Tailwind 4 и shadcn/ui, данные через TanStack Query.

```bash
npm install
npm run dev        # http://localhost:5173
```

Запросы на `/api`, `/health` и `/ready` Vite проксирует на бэкенд, по умолчанию `http://127.0.0.1:8000` (приложение из `docker compose`). Если бэкенд запущен на хосте через `uvicorn` на другом порту, укажите его в `frontend/.env.local`:

```bash
API_PROXY_TARGET=http://127.0.0.1:8001
```

## Команды

```bash
npm run lint       # oxlint
npm run typecheck  # tsc
npm run build      # проверка типов и сборка в dist/
npm run gen:api    # обновить типы API из OpenAPI работающего бэкенда
```

Типы API лежат в `src/api/schema.d.ts` и генерируются, а не пишутся руками: после изменения ручек на бэке запустите `npm run gen:api`, и TypeScript подсветит места, которые нужно поправить.
