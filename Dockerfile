ARG BASE_IMAGE

# Основа образа для сборки приложения
FROM node:24.18.0-alpine AS build

# Тут описываем шаги сборки, pnpm install, pnpm build и так далее
# Как лучше и почему читать тут - https://docs.docker.com/develop/develop-images/dockerfile_best-practices/

ARG BASE_PATH
ARG VITE_PROGRESS_API
ARG https_proxy
ARG no_proxy

WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm ci

COPY . /app

RUN VITE_PROGRESS_API=${VITE_PROGRESS_API} NODE_ENV=production npm run build

# Основа образа для запуска приложения
FROM ${BASE_IMAGE}
ARG BASE_PATH
# Устанавливаем переменную окружения
ENV BASE_PATH=${BASE_PATH}
# Копируем результат сборки в образ для запуска
COPY --from=build /app/dist /var/www
