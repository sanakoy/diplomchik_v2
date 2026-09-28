# syntax=docker/dockerfile:1

# ---- Этап 1: сборка. Node нужен только здесь, в итоговый образ он не попадёт ----
FROM node:24-alpine AS build
WORKDIR /app

# Сначала только манифесты: слой с зависимостями пересобирается лишь
# при их изменении, а не при каждой правке кода
COPY package.json package-lock.json ./
# npm ci ставит ровно то, что в package-lock.json, и падает при расхождении
RUN npm ci

COPY . .
# build = tsc -b (проверка типов) + vite build
RUN npm run build

# ---- Этап 2: только nginx и готовая статика ----
# Непривилегированная сборка nginx: работает не от root и слушает 8080
FROM nginxinc/nginx-unprivileged:1.29-alpine

# Куда проксировать /api. Шаблон из /etc/nginx/templates при старте
# контейнера проходит через envsubst, так адрес бэкенда задаётся без пересборки
ENV BACKEND_URL=http://app:8000

COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
