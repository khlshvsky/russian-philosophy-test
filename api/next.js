import { handle, send, auth, query, nextQuestionId, getQuestion, publicQuestion, stats, rankOf, blockSummary, BLOCK } from './_lib/core.js';

export default handle(async (req, res) => {
  const { uid, user, answers, mode } = await auth(req);
  const st = stats(user, answers, mode);
  const rank = await rankOf(uid);
  const qid = nextQuestionId(mode, user.seed, answers);
  const out = { stats: st, ...rank, block: BLOCK };
  if (!qid) out.finished = true;
  else out.question = publicQuestion(getQuestion(qid), user.seed, st.seq + 1);
  if (query(req).summary === '1' && st.seq > 0) out.summary = blockSummary(answers, st.seq);
  send(res, 200, out);
});
