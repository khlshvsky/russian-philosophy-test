import { cmd, pipeline } from './_lib/store.js';
import {
  handle, send, readBody, auth, httpError, nextQuestionId, getQuestion, permutation,
  stats, rankOf, lbScore, blockSummary, BLOCK, LB,
} from './_lib/core.js';

export default handle(async (req, res) => {
  if (req.method !== 'POST') throw httpError(405, 'Только POST');
  const { uid, user, answers, mode } = await auth(req);
  const body = await readBody(req);
  const expected = nextQuestionId(mode, user.seed, answers);
  if (!expected) throw httpError(409, 'Все вопросы этого раздела уже пройдены');
  if (body.qid !== expected) throw httpError(409, 'Этот вопрос уже не актуален — обновите страницу');
  const q = getQuestion(expected);
  const choice = Number(body.choice);
  if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length) throw httpError(400, 'Неверный вариант ответа');

  const p = permutation(user.seed, q.id, q.options.length);
  const ok = p[choice] === 0;
  const n = stats(user, answers, mode).seq + 1;
  const put = await cmd('HSETNX', 'a:' + uid, q.id, `${n}|${ok ? 1 : 0}`);
  if (Number(put) !== 1) throw httpError(409, 'Ответ на этот вопрос уже засчитан');
  answers[q.id] = `${n}|${ok ? 1 : 0}`;

  const st = stats(user, answers, mode);
  await pipeline([
    ['ZADD', LB, lbScore(st.correct, st.answered), uid],
    ['HSET', 'u:' + uid, 'updated', Date.now(), 'answered', st.answered, 'correct', st.correct],
  ]);
  const left = nextQuestionId(mode, user.seed, answers);
  const out = {
    correct: ok,
    correctIndex: p.indexOf(0),
    explanation: q.explanation,
    sources: q.sources,
    stats: st,
    ...(await rankOf(uid)),
  };
  if (st.seq % BLOCK === 0 || !left) out.summary = blockSummary(answers, st.seq);
  if (!left) out.finished = true;
  send(res, 200, out);
});
