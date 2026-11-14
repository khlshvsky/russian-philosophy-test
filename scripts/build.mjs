// Сборка банка вопросов из content/NN-*.txt в data/bank.js с проверками.
//
// Формат вопроса:
//   # Тема: Название темы            — тема для следующих вопросов
//   ? Текст вопроса
//   + верный ответ
//   - неверный ответ                 (ровно три)
//   ! Пояснение (1–3 предложения; несколько строк «!» склеиваются)
//   @ ключ ~ точная цитата из книги | Автор. Название, глава
//   = тип сложность                  (тип: идея | понятие | автор | история; сложность: 1 | 2 | 3)
//   (пустая строка — конец вопроса)
//
// Ошибки (сборка падает): структура, неизвестная книга, цитата не 5–20 слов
// или не найдена в books/<ключ>.txt, подпись не с фамилии автора.
// Предупреждения: подсказки в вариантах, повторы, сокращения, «е» вместо «ё».
// Предупреждение, проверенное вручную и признанное ложным, вносится
// в scripts/reviewed.json по его коду (печатается в квадратных скобках).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { SOURCES } from './sources.mjs';
import { SECTIONS } from './sections.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUIET = process.argv.includes('--quiet');
const REVIEWED = fs.existsSync(path.join(ROOT, 'scripts/reviewed.json'))
  ? JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/reviewed.json'), 'utf8')) : {};
const usedReviewed = new Set();

// ---------- нормализация ----------
export const norm = (s) => String(s).toLowerCase()
  .replace(/[́̀­]/g, '').replace(/ё/g, 'е')
  .replace(/[*_"“”„'‘’«»‹›`]/g, '')
  .replace(/…/g, '...')
  .replace(/[-‐‑‒–—―]/g, ' ')
  .replace(/\s+/g, ' ').trim();

const BOOKDIR = path.join(ROOT, 'books');
const haveBooks = fs.existsSync(BOOKDIR) && fs.readdirSync(BOOKDIR).some((f) => f.endsWith('.txt'));
const bookCache = {};
const bookText = (k) => {
  if (!(k in bookCache)) {
    const f = path.join(BOOKDIR, k + '.txt');
    bookCache[k] = fs.existsSync(f) ? norm(fs.readFileSync(f, 'utf8')) : null;
  }
  return bookCache[k];
};

// ---------- слова и основы ----------
const STOP = new Set(`без более больше будет было быть был была были вас ваш весь всего всех все всю всем всеми всё где даже для если есть ещё еще его ему ней нее неё ними них нем нём них она они оно его этих этим этой этом этот эта эти это этого этому как какая какие каким какими каких какой какое каком каков какова каково каковы когда кого кому который которая которое которые которых которым которой котором кроме кто между можно может могут него нему нет них ничто однако около она перед после потому почему при про раз сам сама само сами свой своя своё свое свои своих своей своим своего себе себя так также такой такая такие такое там тем теми того тоже той только том тот три тут уже хотя чего чей чем через что чтобы чьё чья эту является являются являлось называет называл называется называют пишет писал пишут считал считает считают утверждает утверждал говорит говорил автор автора авторы книге книги книга работе работы сочинении сочинения какому каких самый самая самое самые весьма очень вопрос вопросе ответ понимает понимал согласно мысли мысль мнению своём своем образом смысле именно`.split(/\s+/));
const WORD_RE = /[а-яёa-z]+|\d{3,4}/gi;
const stem = (w) => { w = w.toLowerCase().replace(/ё/g, 'е'); return /^\d+$/.test(w) ? w : w.slice(0, Math.max(4, Math.min(6, w.length - 2))); };
const stems = (s) => {
  const out = new Set();
  for (const w of String(s).match(WORD_RE) || []) {
    const lw = w.toLowerCase().replace(/ё/g, 'е');
    if (/^\d+$/.test(lw) || (lw.length >= 4 && !STOP.has(lw))) out.add(stem(lw));
  }
  return out;
};
const jaccard = (a, b) => { if (!a.size || !b.size) return 0; let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); };

// ---------- сообщения ----------
const errors = [];
const warns = [];
function warn(code, msg) {
  if (REVIEWED[code] !== undefined) { usedReviewed.add(code); return; }
  warns.push(`${msg} [${code}]`);
}

const TYPES = { 'идея': 'idea', 'понятие': 'concept', 'автор': 'author', 'история': 'history' };

function makeSource(line, where) {
  let rest = line.slice(1).trim();
  let label = '';
  const bar = rest.lastIndexOf('|');
  if (bar >= 0) { label = rest.slice(bar + 1).trim(); rest = rest.slice(0, bar).trim(); }
  let quote = '';
  const tl = rest.indexOf('~');
  if (tl >= 0) { quote = rest.slice(tl + 1).trim(); rest = rest.slice(0, tl).trim(); }
  const key = rest.trim();
  const src = SOURCES[key];
  if (!src) { errors.push(`${where}: неизвестная книга «${key}»`); return null; }
  if (!quote) errors.push(`${where}: нет цитаты «~» — вопрос без подтверждающей цитаты не добавляется`);
  else {
    const n = norm(quote).split(' ').filter((w) => /[а-яa-z0-9]/i.test(w)).length;
    if (n < 5 || n > 20) errors.push(`${where}: цитата должна быть 5–20 слов (сейчас ${n})`);
    if (haveBooks) {
      const t = bookText(key);
      if (t === null) errors.push(`${where}: нет файла books/${key}.txt`);
      else if (!t.includes(norm(quote))) errors.push(`${where}: цитата не найдена в books/${key}.txt: «${quote}»`);
    }
  }
  if (!label) errors.push(`${where}: нет подписи «| Автор. Название, глава»`);
  else if (src.author !== 'Сборник') {
    const surnames = src.author.split(',').map((a) => a.trim().split(/\s+/).pop().replace(/[.,]/g, ''));
    if (!surnames.some((s) => norm(label).startsWith(norm(s)) || norm(label).includes(norm(s) + '.'))) errors.push(`${where}: подпись должна начинаться с автора (${src.author}): «${label}»`);
  }
  return { key, quote, label, url: src.url || '' };
}

function parseFile(file) {
  const base = path.basename(file);
  const section = parseInt(base, 10);
  if (!SECTIONS.find((s) => s.id === section)) errors.push(`${base}: имя файла должно начинаться с номера раздела 01–16`);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const qs = [];
  let topic = '';
  let cur = null;
  const flush = () => {
    if (!cur) return;
    const where = `${base}:${cur.line}`;
    if (!cur.text) errors.push(`${where}: нет текста вопроса`);
    if (cur.correct !== 1) errors.push(`${where}: должен быть ровно один «+»`);
    if (cur.options.length !== 4) errors.push(`${where}: нужно ровно три неверных варианта (сейчас вариантов ${cur.options.length})`);
    if (new Set(cur.options.map(norm)).size !== cur.options.length) errors.push(`${where}: повторяющиеся варианты`);
    if (!cur.explanation) errors.push(`${where}: нет пояснения «!»`);
    if (!cur.sources.length) errors.push(`${where}: нет источника «@»`);
    if (!cur.meta) errors.push(`${where}: нет строки «= тип сложность»`);
    if (!topic) errors.push(`${where}: вопрос до первой строки «# Тема:»`);
    const id = 'r' + crypto.createHash('sha1').update(norm(cur.text)).digest('hex').slice(0, 10);
    qs.push({ id, s: section, topic, text: cur.text, options: cur.options, explanation: cur.explanation.trim(), sources: cur.sources.filter(Boolean), meta: cur.meta, where });
    cur = null;
  };
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) { flush(); return; }
    const where = `${base}:${i + 1}`;
    if (line.startsWith('# Тема:')) { flush(); topic = line.slice(7).trim(); return; }
    if (line.startsWith('#')) return;
    const t = line[0];
    if (t === '?') { flush(); cur = { line: i + 1, text: line.slice(1).trim(), options: [], correct: 0, explanation: '', sources: [], meta: null }; return; }
    if (!cur) { errors.push(`${where}: строка вне вопроса: ${line.slice(0, 40)}`); return; }
    if (t === '+') { cur.correct++; cur.options.unshift(line.slice(1).trim()); }
    else if (t === '-') cur.options.push(line.slice(1).trim());
    else if (t === '!') cur.explanation += (cur.explanation ? ' ' : '') + line.slice(1).trim();
    else if (t === '@') cur.sources.push(makeSource(line, where));
    else if (t === '=') {
      const [ty, d] = line.slice(1).trim().split(/\s+/);
      if (!TYPES[ty] || !['1', '2', '3'].includes(d)) errors.push(`${where}: строка «=» — тип (идея/понятие/автор/история) и сложность 1–3`);
      else cur.meta = { type: TYPES[ty], diff: Number(d) };
    }
    else errors.push(`${where}: непонятная строка: ${line.slice(0, 40)}`);
  });
  flush();
  return qs;
}

// ---------- сборка ----------
const dir = path.join(ROOT, 'content');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d\d-.*\.txt$/.test(f)).sort() : [];
let all = [];
for (const f of files) all = all.concat(parseFile(path.join(dir, f)));

// ---------- проверки отдельного вопроса ----------
const ABSOLUTE = ['всегда', 'никогда', 'только', 'исключительно'];
const YO = [
  [/(?<![а-яё])(е)ще(?![а-яё])/i, 'ещё'], [/(?<![а-яё])н?ее(?![а-яё])/i, 'её / неё'],
  [/соловьев/i, 'Соловьёв'], [/(?<![а-яё])федоров/i, 'Фёдоров'], [/(?<![а-яё])петр(?![а-яё])/i, 'Пётр'],
  [/(?<![а-яё])семен(?![а-яё])/i, 'Семён'], [/огарев/i, 'Огарёв'], [/(?<![а-яё])о нем(?![а-яё])/i, 'о нём'],
  [/отвлеченн/i, 'отвлечённ'], [/(?<![а-яё])черт(?![а-яё])/i, 'чёрт'], [/(?<![а-яё])ученн?ый/i, 'учёный'],
  [/(?<![а-яё])мертв/i, 'мёртв'], [/(?<![а-яё])шел(?![а-яё])/i, 'шёл']
];
const ABBR_OK = new Set(['II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI']);
const YEAR_RE = /(?<!\d)1\d{3}(?!\d)|в каком году|в каком веке|какого года/i;

for (const q of all) {
  q.qs = stems(q.text);
  q.os = q.options.map(stems);
  q.ans = norm(q.options[0]);
  const where = q.where;
  // 3. длина верного ответа
  const L = q.options.map((o) => o.length);
  const maxWrong = Math.max(...L.slice(1));
  if (L[0] > 25 && L[0] > maxWrong * 1.2) warn(`${q.id}:len`, `${where}: верный ответ заметно длиннее неверных (${L.join('/')})`);
  // 3. «всегда», «никогда», «только» — не в одном варианте
  for (const w of ABSOLUTE) {
    const re = new RegExp(`(?<![а-яё])${w}(?![а-яё])`, 'i');
    const n = q.options.filter((o) => re.test(o)).length;
    if (n === 1) warn(`${q.id}:abs:${w}`, `${where}: слово «${w}» стоит только в одном варианте`);
  }
  // 4. слова из вопроса только в верном варианте
  for (const st of q.os[0]) {
    if (q.qs.has(st) && !q.os.slice(1).some((s) => s.has(st))) warn(`${q.id}:hint:${st}`, `${where}: «${st}…» есть в вопросе и только в верном ответе`);
  }
  // 4. «кроме X»
  const m = q.text.match(/кроме ([^,?;:]+)/i);
  if (m) for (const st of stems(m[1])) if (q.os[0].has(st)) warn(`${q.id}:kroме`, `${where}: в вопросе «кроме ${m[1]}», а верный ответ содержит «${st}…»`);
  // сокращения
  for (const field of [q.text, ...q.options, q.explanation]) {
    for (const a of field.match(/(?<![А-ЯЁA-Za-zа-яё])[А-ЯЁ]{2,6}(?![А-ЯЁA-Za-zа-яё])/g) || []) {
      if (!ABBR_OK.has(a)) warn(`${q.id}:abbr:${a}`, `${where}: сокращение «${a}» — расшифруйте`);
    }
  }
  // ё
  for (const field of [q.text, ...q.options, q.explanation]) {
    for (const [re, good] of YO) if (re.test(field)) warn(`${q.id}:yo:${good}`, `${where}: пишите «${good}»: ${field.slice(0, 60)}`);
  }
  // пояснение 1–3 предложения
  const sent = q.explanation.split(/(?<=[.!?])\s+(?=[А-ЯЁ«(])/).length;
  if (sent > 3) warn(`${q.id}:expl`, `${where}: пояснение длиннее трёх предложений (${sent})`);
}

// ---------- проверки между вопросами ----------
const seen = new Map();
for (const q of all) {
  if (seen.has(q.id)) errors.push(`${q.where}: дубликат вопроса (${seen.get(q.id)})`);
  seen.set(q.id, q.where);
}
// индекс основ вопросов
const idx = new Map();
all.forEach((q, i) => { for (const s of q.qs) { if (!idx.has(s)) idx.set(s, []); idx.get(s).push(i); } });
const pairKey = (a, b) => (a.id < b.id ? `${a.id}~${b.id}` : `${b.id}~${a.id}`);
const byAns = new Map();
const byQuote = new Map();
const byLabel = new Map();
all.forEach((q, i) => {
  if (!byAns.has(q.ans)) byAns.set(q.ans, []); byAns.get(q.ans).push(i);
  for (const s of q.sources) {
    const qk = s.key + '|' + norm(s.quote);
    if (!byQuote.has(qk)) byQuote.set(qk, []); byQuote.get(qk).push(i);
    const lk = s.key + '|' + norm(s.label);
    if (!byLabel.has(lk)) byLabel.set(lk, []); byLabel.get(lk).push(i);
  }
});
const reported = new Set();
function dupWarn(a, b, kind, msg) {
  const k = pairKey(a, b) + ':' + kind;
  if (reported.has(k)) return; reported.add(k);
  warn(k, `${a.where} и ${b.where}: ${msg}`);
}
// 6. одинаковый верный ответ при пересечении слов вопроса
for (const list of byAns.values()) for (let x = 0; x < list.length; x++) for (let y = x + 1; y < list.length; y++) {
  const a = all[list[x]], b = all[list[y]];
  const j = jaccard(a.qs, b.qs);
  if (j >= 0.25) dupWarn(a, b, 'ans', `одинаковый ответ «${a.options[0]}» и похожие вопросы (${j.toFixed(2)})`);
}
// 6. одна и та же цитата; одна глава при похожей формулировке
for (const list of byQuote.values()) for (let x = 0; x < list.length; x++) for (let y = x + 1; y < list.length; y++) {
  dupWarn(all[list[x]], all[list[y]], 'quote', 'одна и та же цитата');
}
for (const list of byLabel.values()) for (let x = 0; x < list.length; x++) for (let y = x + 1; y < list.length; y++) {
  const a = all[list[x]], b = all[list[y]];
  const j = jaccard(a.qs, b.qs);
  if (j >= 0.35) dupWarn(a, b, 'chap', `одна глава и похожая формулировка (${j.toFixed(2)})`);
}
// 6. просто очень похожие вопросы
all.forEach((a, i) => {
  const cand = new Map();
  for (const s of a.qs) for (const k of idx.get(s) || []) if (k > i) cand.set(k, (cand.get(k) || 0) + 1);
  for (const [k, n] of cand) {
    if (n < 3) continue;
    const b = all[k];
    const j = jaccard(a.qs, b.qs);
    if (j >= 0.55) dupWarn(a, b, 'sim', `очень похожие вопросы (${j.toFixed(2)})`);
  }
});
// 5. текст одного вопроса выдаёт ответ на другой
all.forEach((a) => {
  const sa = a.os[0];
  if (!sa.size) return;
  // ответ, у которого все основы есть и в неверных вариантах, ничего не выдаёт
  const own = [...sa].filter((s) => !a.os.slice(1).some((o) => o.has(s)));
  if (!own.length) return;
  const rare = own.map((s) => [s, (idx.get(s) || []).length]).sort((p, q) => p[1] - q[1])[0][0];
  for (const k of idx.get(rare) || []) {
    const b = all[k];
    if (b === a) continue;
    if (!own.every((s) => b.qs.has(s))) continue;
    const rest = [...a.qs].filter((s) => !sa.has(s));
    if (!rest.length) continue;
    const shared = rest.filter((s) => b.qs.has(s) || b.os[0].has(s)).length;
    if (shared / rest.length >= 0.5) dupWarn(a, b, 'leak', `текст второго вопроса содержит ответ первого («${a.options[0]}»)`);
  }
});

// ---------- статистика ----------
const total = all.length;
const cnt = (f) => all.filter(f).length;
const pctS = (n) => (total ? Math.round((n / total) * 1000) / 10 : 0) + '%';
const stat = {
  total,
  types: Object.fromEntries(Object.entries(TYPES).map(([ru, en]) => [ru, pctS(cnt((q) => q.meta?.type === en))])),
  difficulty: Object.fromEntries([1, 2, 3].map((d) => [d, pctS(cnt((q) => q.meta?.diff === d))])),
  years: pctS(cnt((q) => YEAR_RE.test(q.text) || /(?<!\d)1\d{3}(?!\d)/.test(q.options[0]))),
  sections: Object.fromEntries(SECTIONS.map((s) => [s.id, cnt((q) => q.s === s.id)])),
};
if (total >= 200) {
  const share = (f) => cnt(f) / total;
  if (share((q) => YEAR_RE.test(q.text) || /(?<!\d)1\d{3}(?!\d)/.test(q.options[0])) > 0.10) warns.push(`вопросов про годы больше 10% (${stat.years})`);
}

// ---------- вывод ----------
const topicsBySection = {};
for (const q of all) (topicsBySection[q.s] ??= new Set()).add(q.topic);
const bank = {
  sections: SECTIONS.map((s) => ({ ...s, count: stat.sections[s.id], topics: [...(topicsBySection[s.id] || [])] })),
  books: Object.entries(SOURCES).filter(([k]) => all.some((q) => q.sources.some((s) => s.key === k)))
    .map(([k, b]) => ({ key: k, author: b.author, title: b.title, year: b.year, url: b.url })),
  questions: all.map((q) => ({
    id: q.id, s: q.s, topic: q.topic, text: q.text, options: q.options, explanation: q.explanation,
    sources: q.sources.map((s) => ({ title: s.label, url: s.url })),
  })),
};
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'bank.js'), '// Сгенерировано scripts/build.mjs — не редактировать вручную\nexport default ' + JSON.stringify(bank) + ';\n');
// служебный список для PROGRESS.md: сколько вопросов по каждой книге в каждом разделе
const perBook = {};
for (const q of all) for (const s of q.sources) { const k = `${s.key}|${q.s}`; perBook[k] = (perBook[k] || 0) + 1; }
fs.writeFileSync(path.join(ROOT, 'data', 'counts.json'), JSON.stringify(perBook, null, 1) + '\n');

const stale = Object.keys(REVIEWED).filter((k) => !usedReviewed.has(k));
if (!QUIET) for (const w of warns) console.warn('ПРЕДУПРЕЖДЕНИЕ', w);
for (const e of errors) console.error('ОШИБКА', e);
console.log(JSON.stringify(stat));
console.log(`Цитаты ${haveBooks ? 'сверены с books/' : 'не сверялись (нет папки books/)'}. Ошибок: ${errors.length}, предупреждений: ${warns.length}${stale.length ? `, устаревших записей в reviewed.json: ${stale.length}` : ''}`);
if (errors.length) process.exit(1);
