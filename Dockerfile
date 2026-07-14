FROM node:22-slim

# Устанавливаем системные зависимости
RUN DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Устанавливаем PM2
RUN npm install -g pm2

# Создаем пользователя приложения
RUN groupadd --gid 2000 app && useradd --uid 2000 --gid 2000 -m -s /bin/bash app

# Рабочая директория
WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package.json pnpm-lock.yaml* package-lock.json* pnpm-workspace.yaml* ./

# Устанавливаем зависимости
RUN if [ -f pnpm-lock.yaml ]; then \
        echo "Detected pnpm workspace"; \
        corepack prepare pnpm --activate && pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
        echo "Detected npm project"; \
        npm ci; \
    else \
        echo "No lockfile, fallback to basic install"; \
        npm install; \
    fi

# Копируем исходный код
COPY --chown=app:app . .

# Создаем папки для данных и сессий с правильными правами
RUN mkdir -p /app/sessions /app/data /app/public && \
    chown -R app:app /app/sessions /app/data /app/public && \
    chmod -R 755 /app/sessions /app/data /app/public

# Переключаемся на пользователя app
USER app

# Открываем порт
EXPOSE 3000

# Запуск
CMD ["pm2-runtime", "start", "server.js", "--name", "deepgaze"]
