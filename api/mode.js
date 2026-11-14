import { cmd } from './_lib/store.js';
import { handle, send, readBody, auth, httpError, parseMode, stats, rankOf } from './_lib/core.js';

// GET — прогресс по разделам; POST {mode: 'all' | номер раздела} — выбрать, что проходить.
export default handle(async (req, res) => {
  const { uid, user, answers, mode } = await auth(req);
  if (req.method !== 'POST') return send(res, 200, { stats: stats(user, answers, mode), ...(await rankOf(uid)) });
  const body = await readBody(req);
  const m = parseMode(body.mode);
  if (m === null) throw httpError(400, 'Неизвестный раздел');
  await cmd('HSET', 'u:' + uid, 'mode', m);
  send(res, 200, { stats: stats(user, answers, m), ...(await rankOf(uid)) });
});
