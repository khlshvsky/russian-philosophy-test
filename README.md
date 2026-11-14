# Русская философия — расширенный тест

Онлайн-тест на 5000 вопросов по книгам русских мыслителей. Движок — из theology-test:
статичный фронтенд в `public/`, серверные функции в `api/`, хранилище — Upstash Redis.

- `content/NN-*.txt` — вопросы (NN — номер раздела), формат описан в `PROGRESS.md`.
- `node scripts/build.mjs` — сборка `data/bank.js` с проверками (цитаты сверяются с `books/`, если папка есть).
- `node scripts/progress.mjs` — пересобирает `PROGRESS.md`.
- `npm run dev` — локальный запуск на http://localhost:3000 с хранилищем в памяти (`LOCAL_MEMORY=1`).

На Vercel: подключить Upstash Redis (переменные `KV_REST_API_URL` / `KV_REST_API_TOKEN`
или `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`), сборка — `node scripts/build.mjs`.
