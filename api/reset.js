import crypto from 'node:crypto';
import { pipeline } from './_lib/store.js';
import { handle, send, auth, httpError, stats, rankOf, RESET_INTERVAL, LB } from './_lib/core.js';

// GET — когда можно обнулить результат; POST — обнулить (не чаще раза в неделю).
export default handle(async (req, res) => {
  const { uid, user, mode } = await auth(req);
  const now = Date.now();
  const availableAt = user.resetAt ? Number(user.resetAt) + RESET_INTERVAL : 0;
  if (req.method !== 'POST') return send(res, 200, { availableAt, now });

  if (availableAt > now) {
    const d = new Date(availableAt).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });
    throw httpError(429, `Результат можно обнулять не чаще раза в неделю. Следующий раз — ${d} (по Москве).`);
  }
  // Новый seed — новый порядок вопросов после обнуления.
  const seed = crypto.randomBytes(8).toString('hex');
  await pipeline([
    ['DEL', 'a:' + uid],
    ['HSET', 'u:' + uid, 'answered', 0, 'correct', 0, 'seed', seed, 'resetAt', now, 'updated', now],
    ['ZADD', LB, 0, uid],
  ]);
  const fresh = { ...user, seed, resetAt: String(now) };
  send(res, 200, { ok: true, availableAt: now + RESET_INTERVAL, stats: stats(fresh, {}, mode), ...(await rankOf(uid)) });
});
