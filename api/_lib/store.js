// Хранилище: Upstash Redis через REST API (без зависимостей).
// На Vercel переменные создаются автоматически при подключении
// интеграции Upstash Redis (KV_REST_API_URL / KV_REST_API_TOKEN
// или UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
// Для локальной разработки: LOCAL_MEMORY=1 — данные в памяти процесса.

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export class StoreNotConfigured extends Error {}

async function rest(path, body) {
  if (!URL_ || !TOKEN) throw new StoreNotConfigured('База данных не подключена');
  const r = await fetch(URL_.replace(/\/$/, '') + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error('Redis: ' + (data.error || r.status));
  return data;
}

// ---------- in-memory реализация для локальной разработки ----------
const mem = globalThis.__memStore || (globalThis.__memStore = { kv: new Map(), exp: new Map() });
function memGet(k) {
  const e = mem.exp.get(k);
  if (e && e < Date.now()) { mem.kv.delete(k); mem.exp.delete(k); }
  return mem.kv.get(k);
}
function memCmd([cmd, ...a]) {
  cmd = cmd.toUpperCase();
  const h = (k) => { let v = memGet(k); if (!(v instanceof Map)) { v = new Map(); mem.kv.set(k, v); } return v; };
  switch (cmd) {
    case 'GET': { const v = memGet(a[0]); return v === undefined ? null : v; }
    case 'SET': {
      if (a.includes('NX') && memGet(a[0]) !== undefined) return null;
      mem.kv.set(a[0], String(a[1]));
      const i = a.indexOf('EX'); if (i > 0) mem.exp.set(a[0], Date.now() + Number(a[i + 1]) * 1000);
      return 'OK';
    }
    case 'DEL': return mem.kv.delete(a[0]) ? 1 : 0;
    case 'INCR': { const v = Number(memGet(a[0]) || 0) + 1; mem.kv.set(a[0], String(v)); return v; }
    case 'EXPIRE': mem.exp.set(a[0], Date.now() + Number(a[1]) * 1000); return 1;
    case 'HGETALL': { const v = memGet(a[0]); if (!(v instanceof Map)) return []; return [...v].flat(); }
    case 'HSET': { const m = h(a[0]); let n = 0; for (let i = 1; i < a.length; i += 2) { if (!m.has(a[i])) n++; m.set(a[i], String(a[i + 1])); } return n; }
    case 'HSETNX': { const m = h(a[0]); if (m.has(a[1])) return 0; m.set(a[1], String(a[2])); return 1; }
    case 'HINCRBY': { const m = h(a[0]); const v = Number(m.get(a[1]) || 0) + Number(a[2]); m.set(a[1], String(v)); return v; }
    case 'HLEN': { const v = memGet(a[0]); return v instanceof Map ? v.size : 0; }
    case 'ZADD': { const m = h(a[0]); m.set(a[2], Number(a[1])); return 1; }
    case 'ZCARD': { const v = memGet(a[0]); return v instanceof Map ? v.size : 0; }
    case 'ZREVRANK': {
      const v = memGet(a[0]); if (!(v instanceof Map) || !v.has(a[1])) return null;
      return [...v].sort((x, y) => y[1] - x[1]).findIndex(([k]) => k === a[1]);
    }
    case 'ZREVRANGE': {
      const v = memGet(a[0]); if (!(v instanceof Map)) return [];
      const top = [...v].sort((x, y) => y[1] - x[1]).slice(Number(a[1]), Number(a[2]) + 1);
      return a.includes('WITHSCORES') ? top.flatMap(([k, sc]) => [k, String(sc)]) : top.map(([k]) => k);
    }
    default: throw new Error('mem: unsupported ' + cmd);
  }
}

const useMem = process.env.LOCAL_MEMORY === '1';

export async function cmd(...args) {
  if (useMem) return memCmd(args.map(String));
  const d = await rest('', args.map(String));
  return d.result;
}

export async function pipeline(cmds) {
  if (!cmds.length) return [];
  if (useMem) return cmds.map((c) => memCmd(c.map(String)));
  const d = await rest('/pipeline', cmds.map((c) => c.map(String)));
  return d.map((x) => { if (x.error) throw new Error('Redis: ' + x.error); return x.result; });
}

export function hashFromArray(arr) {
  const o = {};
  if (!arr) return o;
  for (let i = 0; i < arr.length; i += 2) o[arr[i]] = arr[i + 1];
  return o;
}
