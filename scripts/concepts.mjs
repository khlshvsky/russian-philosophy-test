// Сборка дерева понятий из content/concepts/*.txt в public/concepts.json.
//
// Формат файла (одно произведение — один блок, в файле может быть несколько блоков):
//   @ ключ_книги                      — произведение (ключ из scripts/sources.mjs)
//   : Описание произведения и его строения (можно несколько строк «:»)
//   # Название группы                 — структурная часть или тематический узел
//   * Термин {id} — определение       — понятие первого уровня
//   ** Термин {id} — определение      — подпонятие (глубина = число звёздочек)
//   " точная цитата из книги          — проверяется по books/<ключ>.txt
//   ^ место в тексте                  — письмо, глава, лекция
//   = синоним, синоним                — другие имена для поиска
//   ~ id, id                          — «ср.»: близкие понятия (связь взаимная)
//   ! id, id                          — полемика, противоположность (взаимная)
//   > id, id                          — развитие, продолжение у других (обратная связь — «истоки»)
// В определениях [[id]] или [[id|текст]] — ссылка на другое понятие.
//
// Ошибки (сборка падает): дубли id, ссылки на несуществующие id, неизвестная книга,
// цитата не найдена в книге (проверяется, только если есть папка books/).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES } from './sources.mjs';
import { SECTIONS } from './sections.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'content', 'concepts');
const norm = (s) => String(s).toLowerCase()
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

const errors = [];
const warns = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

const works = [];
const terms = {};
const order = [];
const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith('.txt')).sort() : [];

for (const file of files) {
  const lines = fs.readFileSync(path.join(DIR, file), 'utf8').split('\n');
  let work = null, group = null, stack = [], cur = null;
  lines.forEach((raw, i) => {
    const where = `${file}:${i + 1}`;
    const line = raw.trim();
    if (!line || line.startsWith('//')) return;
    const tag = line[0];
    const rest = line.replace(/^(\*+|[@:#"^=~!>])\s*/, '');
    if (tag === '@') {
      if (!SOURCES[rest]) { err(where, `неизвестная книга «${rest}»`); return; }
      const s = SOURCES[rest];
      work = { key: rest, author: s.author, title: s.title, year: s.year, section: s.section, about: '', groups: [] };
      works.push(work); group = null; stack = []; cur = null;
      return;
    }
    if (!work) { err(where, 'строка до «@ ключ»'); return; }
    if (tag === ':') { work.about += (work.about ? ' ' : '') + rest; return; }
    if (tag === '#') { group = { title: rest, terms: [] }; work.groups.push(group); stack = []; cur = null; return; }
    if (tag === '*') {
      const depth = line.match(/^\*+/)[0].length;
      const m = rest.match(/^(.+?)\s*\{([a-z0-9_]+)\}\s*(?:—\s*(.*))?$/);
      if (!m) { err(where, 'понятие без {id}'); return; }
      const [, name, id, def = ''] = m;
      if (terms[id]) { err(where, `повтор id «${id}» (уже в ${terms[id].w})`); return; }
      if (!def) warns.push(`${where}: нет определения у «${name}»`);
      if (depth > stack.length + 1) { err(where, `глубина ${depth} без родителя`); return; }
      if (!group) { group = { title: '', terms: [] }; work.groups.push(group); }
      stack = stack.slice(0, depth - 1);
      const parent = stack[depth - 2] || null;
      cur = { id, n: name, d: def, w: work.key, p: parent, c: [], q: [], loc: '', aka: [], see: [], anti: [], dev: [] };
      terms[id] = cur; order.push(id);
      if (parent) terms[parent].c.push(id); else group.terms.push(id);
      stack[depth - 1] = id;
      return;
    }
    if (!cur) { err(where, 'строка вне понятия'); return; }
    if (tag === '"') {
      cur.q.push(rest);
      if (haveBooks) {
        const t = bookText(work.key);
        if (t && !t.includes(norm(rest))) err(where, `цитата не найдена в ${work.key}: «${rest.slice(0, 70)}»`);
      }
      return;
    }
    if (tag === '^') { cur.loc = rest; return; }
    if (tag === '=') { cur.aka.push(...rest.split(',').map((s) => s.trim()).filter(Boolean)); return; }
    const ids = rest.split(',').map((s) => s.trim()).filter(Boolean);
    if (tag === '~') cur.see.push(...ids);
    else if (tag === '!') cur.anti.push(...ids);
    else if (tag === '>') cur.dev.push(...ids);
    else err(where, `непонятная строка «${line.slice(0, 40)}»`);
  });
}

// ---------- проверка и обратные связи ----------
const add = (arr, v) => { if (!arr.includes(v)) arr.push(v); };
for (const id of order) {
  const t = terms[id];
  for (const kind of ['see', 'anti', 'dev']) {
    t[kind] = [...new Set(t[kind])].filter((x) => {
      if (x === id) { err(id, `ссылка на себя`); return false; }
      if (!terms[x]) { err(id, `${kind}: нет понятия «${x}»`); return false; }
      return true;
    });
  }
  for (const m of t.d.matchAll(/\[\[([a-z0-9_]+)(?:\|[^\]]+)?\]\]/g)) {
    if (!terms[m[1]]) err(id, `в определении ссылка на неизвестное «${m[1]}»`);
  }
}
for (const id of order) {
  const t = terms[id];
  t.src = t.src || [];
  for (const x of t.see) add(terms[x].see, id);
  for (const x of t.anti) add(terms[x].anti, id);
}
for (const id of order) for (const x of terms[id].dev) { terms[x].src = terms[x].src || []; add(terms[x].src, id); }
for (const id of order) for (const x of terms[id].see) if (terms[id].anti.includes(x)) err(id, `«${x}» одновременно в «ср.» и «полемика»`);
// упоминания в чужих определениях
for (const id of order) {
  for (const m of terms[id].d.matchAll(/\[\[([a-z0-9_]+)/g)) {
    const x = terms[m[1]];
    if (x && m[1] !== id) { x.ment = x.ment || []; add(x.ment, id); }
  }
}

// ---------- запись ----------
let lib = {};
try {
  const L = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'library.json'), 'utf8'));
  for (const b of (Array.isArray(L) ? L : L.books || [])) if (b.pdf) lib[b.key] = b.pdf;
} catch {}
const out = {
  sections: SECTIONS.filter((s) => works.some((w) => w.section === s.id)),
  works: works.map((w) => ({ ...w, pdf: lib[w.key] || null })),
  terms: Object.fromEntries(order.map((id) => {
    const t = terms[id];
    const o = { n: t.n, d: t.d, w: t.w };
    if (t.p) o.p = t.p;
    for (const k of ['c', 'q', 'aka', 'see', 'anti', 'dev', 'src', 'ment']) if (t[k] && t[k].length) o[k] = t[k];
    if (t.loc) o.loc = t.loc;
    return [id, o];
  })),
};

if (errors.length) {
  console.error(`Понятия: ошибок ${errors.length}`);
  for (const e of errors.slice(0, 80)) console.error('  ' + e);
  process.exit(1);
}
fs.writeFileSync(path.join(ROOT, 'public', 'concepts.json'), JSON.stringify(out));
const nrefs = order.reduce((s, id) => s + terms[id].see.length + terms[id].anti.length + terms[id].dev.length, 0);
const nq = order.reduce((s, id) => s + terms[id].q.length, 0);
console.log(`Понятия: произведений ${works.length}, понятий ${order.length}, связей ${nrefs}, цитат ${nq}${haveBooks ? ' (проверены)' : ''}, предупреждений ${warns.length}`);
if (!process.argv.includes('--quiet')) for (const w of warns.slice(0, 20)) console.log('  ' + w);
