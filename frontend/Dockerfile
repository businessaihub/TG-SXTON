# Dockerfile (frontend)
FROM node:20-alpine

# Встановлюємо Yarn
RUN corepack enable && corepack prepare yarn@1.22.22 --activate

WORKDIR /app

# Копіюємо package.json
COPY package.json ./

# Генеруємо yarn.lock та встановлюємо залежності
RUN yarn install

# Копіюємо решту файлів
COPY . .

EXPOSE 3000

# Запускаємо dev-сервер
CMD ["sh", "-c", "yarn start --host 0.0.0.0"]