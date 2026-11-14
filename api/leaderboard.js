import { pipeline } from './_lib/store.js';
import { handle, send, TOTAL, LB } from './_lib/core.js';

const TOP = 100;

export default handle(async (req, res) => {
  const [arr, players] = await pipeline([['ZREVRANGE', LB, 0, TOP - 1, 'WITHSCORES'], ['ZCARD', LB]]);
  const uids = [];
  for (let i = 0; i < (arr || []).length; i += 2) uids.push(arr[i]);
  const rows = await pipeline(uids.map((u) => ['HGETALL', 'u:' + u]));
  const list = [];
  rows.forEach((r) => {
    const o = {};
    for (let i = 0; i < (r || []).length; i += 2) o[r[i]] = r[i + 1];
    const answered = Number(o.answered || 0), correct = Number(o.correct || 0);
    if (!o.name || answered === 0) return;
    list.push({ name: o.name, answered, correct, total: TOTAL, accuracy: Math.round((correct / answered) * 1000) / 10 });
  });
  send(res, 200, { players: Number(players || 0), list });
});
