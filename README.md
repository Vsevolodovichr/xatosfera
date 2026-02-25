# RealEstate CRM (Supabase)

## Налаштування

1. Створіть Supabase проєкт.
2. Виконайте SQL зі `supabase/schema.sql` у SQL Editor.
3. Додайте `.env`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

4. Увімкніть провайдера Google в **Authentication → Providers** (за потреби OAuth логіну).
5. Для файлів створіть buckets:
   - `avatars`
   - `properties`
   - `documents`

## Запуск

```bash
npm install
npm run dev
```

## Що реалізовано

- Авторизація (email/password) через Supabase Auth.
- Реєстрація нових користувачів через Supabase Auth.
- OAuth (Google) для логіну/реєстрації.
- Автоматичне створення профілю в таблиці `public.users` через trigger `handle_new_auth_user`.
- Базовий RBAC (`superuser`, `top_manager`, `manager`) + RLS-політики для ключових таблиць.
