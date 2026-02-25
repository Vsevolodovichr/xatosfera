# CRM Real Estate Application

CRM система для агентств нерухомості з підтримкою Cloudflare (D1, R2, Workers).

## Архітектура

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Cloudflare Workers (API)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (Object Storage)
- **Auth**: JWT токени (власна реалізація)

## Швидкий старт

### 1. Встановлення залежностей

Frontend:
```bash
npm install
```

Worker:
```bash
cd worker
npm install
```

### 2. Ініціалізація бази даних D1

```bash
cd worker
npm run db:init
```

### 3. Налаштування JWT Secret

```bash
cd worker
npx wrangler secret put JWT_SECRET
# Введіть надійний секретний ключ
```

### 4. Налаштування Frontend

Створіть файл .env:
```
VITE_API_URL=http://localhost:8787
```

Для production:
```
VITE_API_URL=https://crm-api.your-subdomain.workers.dev
```

### 5. Запуск для розробки

Terminal 1 - Worker:
```bash
cd worker
npm run dev
```

Terminal 2 - Frontend:
```bash
npm run dev
```

### 6. Деплой

Worker:
```bash
cd worker
npm run deploy
```

Frontend (Cloudflare Pages):
```bash
npm run build
npx wrangler pages deploy dist
```

## API Endpoints

### Авторизація
- POST /api/auth/register - Реєстрація
- POST /api/auth/login - Вхід
- POST /api/auth/refresh - Оновлення токена
- POST /api/auth/logout - Вихід
- GET /api/auth/me - Поточний користувач

### Користувачі
- GET /api/users - Список користувачів
- PUT /api/users/:id - Оновити користувача
- DELETE /api/users/:id - Видалити користувача

### Об'єкти нерухомості
- GET /api/properties - Список об'єктів
- POST /api/properties - Створити об'єкт
- PUT /api/properties/:id - Оновити об'єкт
- DELETE /api/properties/:id - Видалити об'єкт

### Клієнти, Угоди, Завдання, Календар, Документи
- Аналогічні CRUD операції

## Ролі користувачів

- **superuser** - Повний доступ до системи
- **top_manager** - Управління менеджерами та всіма даними
- **manager** - Доступ до власних даних

## Cloudflare ресурси

- Account ID: 56ad06454242b60d6e1fe038ded5fd9f
- D1 Database ID: d8ee9d0c-ac4d-4f23-b1ff-8ac3d9a3d5a6
- R2 Bucket: crm
