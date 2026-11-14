import { cmd } from './_lib/store.js';
import { handle, send } from './_lib/core.js';
export default handle(async (req, res) => {
  const h = req.headers['authorization'] || '';
  const t = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (t) await cmd('DEL', 't:' + t);
  send(res, 200, { ok: true });
});
