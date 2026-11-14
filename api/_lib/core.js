import crypto from 'node:crypto';
import { cmd, pipeline, hashFromArray } from './store.js';
import bank from '../../data/bank.js';

export const BANK = bank;
export const BLOCK = 20;
export const RESET_INTERVAL = 7 * 24 * 60 * 60 * 1000; // обнуление результата — раз в неделю
const TOKEN_TTL = 60 * 60 * 24 * 90; // 90 дней
export const LB = 'lb';

const byId = new Map(bank.questions.map((q) => [q.id, q]));
const bySection = new Map(bank.sections.map((s) => [s.id, bank.questions.filter((q) => q.s === s.id)]));
export const TOTAL = bank.questions.length;
export function getQuestion(id) { return byId.get(id); }
export function sectionTitle(id) { return bank.sections.find((s) => s.id === id)?.title || ''; }

// режим: 'all' — весь тест, или номер раздела
export function parseMode(m) {
  if (m === undefined || m === null || m === '' || m === 'all') return 'all';
  const n = Number(m);
  return bySection.has(n) ? n : null;
}
function poolOf(mode) { return mode === 'all' ? bank.questions : bySection.get(mode) || []; }

// ---------- HTTP helpers ----------
export function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}
export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}
export function handle(fn) {
  return async (req, res) => {
    try { await fn(req, res); }
    catch (e) {
      if (e?.constructor?.name === 'StoreNotConfigured') return send(res, 503, { error: 'База данных ещё не подключена. Владельцу сайта нужно подключить Upstash Redis в настройках Vercel.' });
      if (e?.status) return send(res, e.status, { error: e.message });
      console.error(e);
      send(res, 500, { error: 'Внутренняя ошибка сервера' });
    }
  };
}
export function httpError(status, message) { const e = new Error(message); e.status = status; return e; }
export function query(req) { return req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams); }

// ---------- имена, PIN ----------
export function cleanName(name) { return String(name || '').replace(/\s+/g, ' ').trim(); }
export function nameKey(name) { return cleanName(name).toLowerCase().replace(/ё/g, 'е'); }
export function hashPin(pin, salt) { return crypto.scryptSync(String(pin), salt, 32).toString('hex'); }

// ---------- детерминированный порядок ----------
function h32(str) { return crypto.createHash('sha1').update(str).digest().readUInt32BE(0); }
export function nextQuestionId(mode, seed, answers) {
  let best = null, bestH = Infinity;
  for (const q of poolOf(mode)) {
    if (answers[q.id] !== undefined) continue;
    const v = h32(seed + '|' + q.id);
    if (v < bestH) { bestH = v; best = q.id; }
  }
  return best;
}
export function permutation(seed, qid, n) {
  const p = [...Array(n).keys()];
  let s = h32('perm|' + seed + '|' + qid) || 1;
  for (let i = n - 1; i > 0; i--) {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p; // p[displayIndex] = originalIndex (0 = правильный)
}

// ---------- сессии ----------
export async function newToken(uid) {
  const t = crypto.randomBytes(24).toString('base64url');
  await cmd('SET', 't:' + t, uid, 'EX', TOKEN_TTL);
  return t;
}
export async function auth(req) {
  const h = req.headers['authorization'] || '';
  const t = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!t || t.length > 64) throw httpError(401, 'Нужно войти заново');
  const uid = await cmd('GET', 't:' + t);
  if (!uid) throw httpError(401, 'Сессия истекла, войдите заново');
  const [uArr, aArr] = await pipeline([['HGETALL', 'u:' + uid], ['HGETALL', 'a:' + uid]]);
  const user = hashFromArray(uArr);
  if (!user.name) throw httpError(401, 'Пользователь не найден');
  const answers = hashFromArray(aArr); // qid -> "n|ok"
  return { token: t, uid, user, answers, mode: parseMode(user.mode) ?? 'all' };
}

// Считаются только ответы на вопросы, которые есть в текущем банке.
export function stats(user, answers, mode = 'all') {
  let answered = 0, correct = 0, maxN = 0;
  const sec = {};
  for (const [qid, v] of Object.entries(answers)) {
    const n = Number(v.split('|')[0]);
    if (n > maxN) maxN = n;
    const q = byId.get(qid);
    if (!q) continue;
    answered++;
    const ok = v.endsWith('|1');
    if (ok) correct++;
    const s = (sec[q.s] ??= { answered: 0, correct: 0 });
    s.answered++; if (ok) s.correct++;
  }
  const sections = bank.sections.map((s) => ({ id: s.id, title: s.title, total: s.count, answered: sec[s.id]?.answered || 0, correct: sec[s.id]?.correct || 0 }));
  const cur = mode === 'all' ? null : sections.find((s) => s.id === mode);
  return {
    name: user.name, mode, modeTitle: mode === 'all' ? 'Весь тест' : sectionTitle(mode),
    answered, correct, total: TOTAL, seq: maxN,
    accuracy: answered ? Math.round((correct / answered) * 1000) / 10 : 0,
    modeAnswered: cur ? cur.answered : answered, modeTotal: cur ? cur.total : TOTAL,
    sections,
  };
}

export function lbScore(correct, answered) {
  // Главное — число верных ответов; при равенстве выше тот, у кого меньше ошибок.
  return correct * 100000 - (answered - correct);
}

export async function rankOf(uid) {
  const [r, n] = await pipeline([['ZREVRANK', LB, uid], ['ZCARD', LB]]);
  return { rank: r === null ? null : Number(r) + 1, players: Number(n) };
}

export function publicQuestion(q, seed, number) {
  const p = permutation(seed, q.id, q.options.length);
  return { id: q.id, section: q.s, sectionTitle: sectionTitle(q.s), topic: q.topic, text: q.text, number, options: p.map((i) => q.options[i]) };
}

// Блок — последние BLOCK ответов (по сквозному номеру ответа).
export function blockSummary(answers, upto) {
  const from = Math.floor((upto - 1) / BLOCK) * BLOCK + 1;
  const items = [];
  for (const [qid, v] of Object.entries(answers)) {
    const [n, ok] = v.split('|');
    const num = Number(n);
    if (num >= from && num <= upto) {
      const q = getQuestion(qid);
      if (!q) continue;
      items.push({ n: num, ok: ok === '1', text: q.text, answer: q.options[0], topic: q.topic });
    }
  }
  items.sort((a, b) => a.n - b.n);
  return { block: Math.ceil(upto / BLOCK), from, to: upto, correct: items.filter((i) => i.ok).length, items };
}
