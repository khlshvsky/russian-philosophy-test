// Пересобирает PROGRESS.md: квоты из scripts/plan.mjs, «готово» — из data/counts.json
// (его пишет scripts/build.mjs). Запуск: node scripts/build.mjs && node scripts/progress.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAN, EXCLUDED } from './plan.mjs';
import { SOURCES } from './sources.mjs';
import { SECTIONS } from './sections.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const counts = fs.existsSync(path.join(ROOT, 'data/counts.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'data/counts.json'), 'utf8')) : {};

const errs = [];
const total = PLAN.reduce((s, r) => s + r[2], 0);
if (total !== 5000) errs.push(`сумма квот ${total}, а должна быть 5000`);
const perBook = {};
for (const [k, , q] of PLAN) { if (!SOURCES[k]) errs.push(`нет книги ${k} в sources.mjs`); perBook[k] = (perBook[k] || 0) + q; }
for (const [k, q] of Object.entries(perBook)) if (q < 20 || q > 80) errs.push(`${k}: квота по книге ${q}, нужно 20–80`);
for (const k of Object.keys(SOURCES)) if (!perBook[k]) errs.push(`книга ${k} не входит в план`);
for (const key of Object.keys(counts)) { const [k, s] = key.split('|'); if (!PLAN.some((r) => r[0] === k && r[1] === Number(s))) errs.push(`есть вопросы по ${k} в разделе ${s}, которого нет в плане`); }
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }

const done = (k, s) => counts[`${k}|${s}`] || 0;
let doneAll = 0;
const secRows = SECTIONS.map((s) => {
  const rows = PLAN.filter((r) => r[1] === s.id);
  const q = rows.reduce((a, r) => a + r[2], 0);
  const d = rows.reduce((a, r) => a + Math.min(r[2], done(r[0], r[1])), 0);
  doneAll += d;
  return `| ${s.id} | ${s.title} | ${q} | ${d} |`;
});
const bookRows = PLAN.map(([k, s, q]) => {
  const b = SOURCES[k];
  const d = done(k, s);
  const mark = d >= q ? ' ✓' : '';
  return `| ${k} | ${b.author}. ${b.title} (${b.year}) | ${s} | ${q} | ${d}${mark} |`;
});

const md = `# Русская философия — расширенный тест: прогресс

Файл пересобирается командой \`node scripts/build.mjs && node scripts/progress.mjs\`.
Квоты — в \`scripts/plan.mjs\`, книги — в \`scripts/sources.mjs\`. Править таблицы руками не нужно.

**Готово: ${doneAll} из 5000.**

## Как продолжить в новом диалоге

1. Книги лежат на компьютере владельца: «Рабочий стол / Книги по русской философии». Перевести их в \`books/<ключ>.txt\`:
   \`python3 -I scripts/prep_books.py "<папка с книгами>" books\` (папка \`books/\` не попадает в git).
2. Взять первую книгу в таблице ниже, у которой «готово» меньше квоты. Порядок работы по книге:
   оглавление и поиск по словам скриптом (книгу целиком в контекст не читать) → план фактов →
   вопросы с цитатами в \`content/NN-*.txt\` → \`node scripts/build.mjs\` (0 ошибок, 0 предупреждений) →
   разбор предупреждений о повторах и подсказках → \`node scripts/progress.mjs\` → коммит и push.
3. Каждые ~500 вопросов — проверка интерфейса в браузере на ширине 1280 и 390 пикселей
   (\`npm run dev\`): нет горизонтальной прокрутки и ошибок в консоли.

## Формат вопроса

\`\`\`
# Тема: …
? текст вопроса
+ верный ответ
- неверный (ровно три)
! пояснение в 1–3 предложения: почему ответ верный и кому принадлежат неверные варианты
@ ключ ~ точная цитата из books/<ключ>.txt, 5–20 слов, подтверждает верный ответ | Автор. Название, глава
= тип сложность
\`\`\`

Тип: \`идея\` (≈40%), \`понятие\` (≈25%), \`автор\` (авторство и цитаты, ≈20%), \`история\` (≈15%). Сложность: \`1\` базовый (≈30%), \`2\` средний (≈50%), \`3\` трудный (≈20%). Вопросов про годы — не больше 10%.

Правила: все четыре варианта правдоподобны и из той же области; неверный вариант точно неверен; верный не выделяется длиной и стилем; вопрос не подсказывает ответ (ни своими словами, ни годом или именем, ни текстом другого вопроса); один факт — один вопрос; идеи — как позиция автора («по Соловьёву…»), без оценок; сокращения расшифрованы; буква «ё» везде. Ложные срабатывания проверок после ручного разбора вносятся в \`scripts/reviewed.json\` по коду из квадратных скобок.

## Разделы

| № | Раздел | Квота | Готово |
|---|---|---|---|
${secRows.join('\n')}
| | **Всего** | **5000** | **${doneAll}** |

## Книги

| Ключ | Книга | Раздел | Квота | Готово |
|---|---|---|---|---|
${bookRows.join('\n')}

## Не используются

${EXCLUDED.map(([k, why]) => `- **${k}** — ${why}`).join('\n')}
`;
fs.writeFileSync(path.join(ROOT, 'PROGRESS.md'), md);
console.log(`PROGRESS.md: готово ${doneAll} из 5000`);
