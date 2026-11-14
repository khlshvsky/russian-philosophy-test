import crypto from 'node:crypto';
import { cmd, pipeline, hashFromArray } from './_lib/store.js';
import {
  handle, send, readBody, httpError, cleanName, nameKey, hashPin,
  newToken, stats, rankOf, parseMode, LB,
} from './_lib/core.js';

export default handle(async (req, res) => {
  if (req.method !== 'POST') throw httpError(405, 'Только POST');
  const body = await readBody(req);
  const name = cleanName(body.name);
  const pin = String(body.pin || '');
  if (name.length < 2 || name.length > 40) throw httpError(400, 'Имя должно быть от 2 до 40 символов');
  if (/[<>]/.test(name)) throw httpError(400, 'Имя содержит недопустимые символы');
  if (!/^\d{4,8}$/.test(pin)) throw httpError(400, 'PIN-код — от 4 до 8 цифр');
  const wanted = body.mode === undefined ? undefined : parseMode(body.mode);

  const uid = nameKey(name);

  // ограничение перебора PIN: не более 10 неудачных попыток за 15 минут
  const failKey = 'f:' + uid;
  const fails = Number((await cmd('GET', failKey)) || 0);
  if (fails >= 10) throw httpError(429, 'Слишком много неверных попыток. Попробуйте через 15 минут.');

  let user = hashFromArray(await cmd('HGETALL', 'u:' + uid));
  let created = false;
  if (!user.name) {
    const salt = crypto.randomBytes(16).toString('hex');
    const seed = crypto.randomBytes(8).toString('hex');
    const now = Date.now();
    // HSETNX на поле name защищает от одновременной регистрации одного имени
    const ok = await cmd('HSETNX', 'u:' + uid, 'name', name);
    if (Number(ok) === 1) {
      await pipeline([
        ['HSET', 'u:' + uid, 'salt', salt, 'pinh', hashPin(pin, salt), 'seed', seed, 'mode', 'all', 'created', now, 'updated', now],
        ['ZADD', LB, 0, uid],
      ]);
      created = true;
    }
    user = hashFromArray(await cmd('HGETALL', 'u:' + uid));
  }
  if (!created) {
    const h = hashPin(pin, user.salt);
    if (!user.pinh || !crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(user.pinh, 'hex'))) {
      await pipeline([['INCR', failKey], ['EXPIRE', failKey, 900]]);
      throw httpError(403, 'Это имя уже занято, и PIN-код не подходит. Если это вы — проверьте PIN; если нет — выберите другое имя.');
    }
  }
  if (wanted !== undefined && wanted !== null) {
    await cmd('HSET', 'u:' + uid, 'mode', wanted);
    user.mode = String(wanted);
  }
  const answers = hashFromArray(await cmd('HGETALL', 'a:' + uid));
  const token = await newToken(uid);
  send(res, 200, { token, created, stats: stats(user, answers, parseMode(user.mode) ?? 'all'), ...(await rankOf(uid)) });
});
