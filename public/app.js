const $app = document.getElementById('app');
const $logout = document.getElementById('logoutBtn');
const LETTERS = ['А', 'Б', 'В', 'Г', 'Д'];
const BLOCK = 20;

const store = {
  get token() { try { return localStorage.getItem('rp_token'); } catch { return null; } },
  set token(v) { try { v ? localStorage.setItem('rp_token', v) : localStorage.removeItem('rp_token'); } catch {} },
  get me() { try { return JSON.parse(localStorage.getItem('rp_me') || 'null'); } catch { return null; } },
  set me(v) { try { v ? localStorage.setItem('rp_me', JSON.stringify(v)) : localStorage.removeItem('rp_me'); } catch {} },
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c; };
const pct = (n) => Number(n || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + '%';
const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('ru-RU'));

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (store.token) headers.Authorization = 'Bearer ' + store.token;
  const r = await fetch('/api/' + path, { ...opts, headers });
  let data = {};
  try { data = await r.json(); } catch {}
  if (r.status === 401) { store.token = null; updateNav(); }
  if (!r.ok) { const e = new Error(data.error || 'Ошибка сети'); e.status = r.status; throw e; }
  return data;
}

function updateNav() {
  $logout.classList.toggle('hidden', !store.token);
  const sl = document.getElementById('startLink');
  sl.textContent = store.token ? 'Тест' : 'Войти';
  sl.setAttribute('href', store.token ? '#/quiz' : '#/start');
  const h = (location.hash || '#/').split('?')[0];
  document.querySelectorAll('nav a').forEach((a) => a.classList.toggle('active', h === a.getAttribute('href')));
}

$logout.addEventListener('click', async () => {
  if (!confirm('Выйти? Прогресс и место в рейтинге сохранены — вернуться можно с любого устройства по имени и PIN-коду.')) return;
  try { await api('logout', { method: 'POST' }); } catch {}
  store.token = null;
  location.hash = '#/';
  route();
});

let metaCache = null;
async function getMeta() {
  if (!metaCache) { try { metaCache = await api('meta'); } catch { metaCache = {}; } }
  return metaCache;
}
const modeName = (m, meta) => (m === 'all' || m == null ? 'Весь тест' : meta?.sections?.find((s) => s.id === Number(m))?.title || 'Раздел');

// Выбор режима: залогиненный — сразу на сервер, иначе — запоминаем до входа.
async function chooseMode(mode) {
  if (!store.token) { location.hash = '#/start?s=' + mode; return; }
  try {
    const r = await api('mode', { method: 'POST', body: JSON.stringify({ mode }) });
    store.me = { ...(store.me || {}), name: r.stats.name, mode: r.stats.mode };
    state.dots = [];
    location.hash = '#/quiz';
  } catch (e) { alert(e.message); }
}

// ---------------- главная ----------------
async function viewHome() {
  const logged = !!store.token, me = store.me;
  $app.innerHTML = `
  <section class="hero">
    <div>
      <span class="eyebrow">Онлайн-тест с рейтингом</span>
      <h1>Насколько хорошо вы знаете <em>русскую философию</em>?</h1>
      <p class="lead">От «Слова о Законе и Благодати» до «Диалектики мифа»: славянофилы и западники, Достоевский и Толстой, Соловьёв, «Вехи», Бердяев, Флоренский, Франк, евразийцы и космисты. Вопросы составлены по книгам самих мыслителей, к каждому приведена цитата-источник, при ошибке — пояснение.</p>
      <div class="row">
        ${logged
          ? `<a class="btn lg" href="#/quiz">Продолжить тест</a><span class="note">Вы вошли как ${esc(me?.name || '')}</span>`
          : `<a class="btn lg" href="#/start">Начать тест</a><a class="btn lg secondary" href="#/rating">Посмотреть рейтинг</a>`}
      </div>
    </div>
    <figure class="hero-photo placeholder" aria-label="Место для изображения"><span>Изображение появится позже</span></figure>
  </section>
  <div class="stats">
    <div><b id="stTotal">…</b><span>вопросов всего</span></div>
    <div><b id="stSec">…</b><span>разделов</span></div>
    <div><b id="stBooks">…</b><span>книг-источников</span></div>
    <div><b>${BLOCK}</b><span>вопросов в блоке, затем пауза</span></div>
  </div>
  <h2 class="section-title">Что проходить</h2>
  <p class="lead">Можно пройти весь тест подряд или выбрать один раздел. Прогресс и рейтинг общие: ответ, данный в разделе, засчитывается и во всём тесте.</p>
  <div class="sections" id="sections"><p class="note">Загрузка…</p></div>
  <h2 class="section-title">Как это устроено</h2>
  <div class="grid3">
    <div class="card step"><b>1</b><h3>Имя и PIN-код</h3><p>Имя попадёт в рейтинг, а PIN-код позволит продолжить тест с любого устройства и в любом браузере.</p></div>
    <div class="card step"><b>2</b><h3>Блоки по ${BLOCK} вопросов</h3><p>После каждого блока — итог и разбор ошибок. Выйти можно в любой момент, прогресс сохраняется.</p></div>
    <div class="card step"><b>3</b><h3>Цитата к каждому ответу</h3><p>После ответа видно, на каком месте какой книги основан вопрос: автор, название, глава и точная цитата.</p></div>
  </div>`;
  const m = await getMeta();
  let prog = null;
  if (logged) { try { prog = (await api('mode')).stats; } catch {} }
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = fmt(v); };
  set('stTotal', m.total); set('stSec', m.sections?.length); set('stBooks', m.books?.length);
  const box = document.getElementById('sections');
  if (!box || !m.sections) return;
  const secProg = (id) => prog?.sections?.find((s) => s.id === id);
  const bar = (a, t) => (logged ? `<div class="mini"><div class="bar"><i style="width:${t ? ((a / t) * 100).toFixed(1) : 0}%"></i></div><span>${fmt(a)} из ${fmt(t)}</span></div>` : '');
  const cur = prog?.mode;
  const card = (mode, num, title, count, topics, a) => `
    <article class="card sec-card${cur !== undefined && String(cur) === String(mode) ? ' current' : ''}">
      <div class="sec-head">${num ? `<span class="sec-num">${num}</span>` : ''}<h3>${esc(title)}</h3></div>
      <p class="note">${fmt(count)} ${plural(count || 0, 'вопрос', 'вопроса', 'вопросов')}${topics ? ' · ' + esc(topics) : ''}</p>
      ${bar(a, count)}
      <button class="btn${num ? ' secondary' : ''}" data-mode="${mode}" type="button" ${count ? '' : 'disabled'}>${count ? (logged && a ? (a >= count ? 'Пройдено' : 'Продолжить') : 'Начать') : 'Скоро'}</button>
    </article>`;
  box.innerHTML = card('all', '', 'Весь тест', m.total, 'все разделы вперемешку', prog?.answered || 0)
    + m.sections.map((s) => card(s.id, s.id, s.title, s.count, s.topics.slice(0, 3).join(', '), secProg(s.id)?.answered || 0)).join('');
  box.querySelectorAll('button[data-mode]').forEach((b) => b.addEventListener('click', () => chooseMode(b.dataset.mode)));
}

// ---------------- вход ----------------
async function viewStart(err, presetMode) {
  if (store.token && !err) { location.hash = '#/quiz'; return; }
  const me = store.me;
  const q = new URLSearchParams((location.hash.split('?')[1]) || '');
  const mode = presetMode ?? q.get('s') ?? null;
  const meta = await getMeta();
  $app.innerHTML = `
  <section class="auth">
    <a class="back" href="#/">← На главную</a>
    <h1>Вход в тест</h1>
    <p class="lead">Первый раз — придумайте PIN-код. Уже проходили — введите те же имя и PIN-код, и тест продолжится с того же места.</p>
    <form class="card stack" id="loginForm" autocomplete="on">
      ${mode != null ? `<p class="note" style="margin:0">Вы выбрали: <b>${esc(modeName(mode, meta))}</b>. <a href="#/">Изменить</a></p>` : ''}
      <label class="field">Имя<span class="hint">Так вас увидят в рейтинге</span>
        <input type="text" name="name" maxlength="40" required autocomplete="nickname" value="${esc(me?.name || '')}" placeholder="Например, Иван Петров">
      </label>
      <label class="field">PIN-код<span class="hint">4–8 цифр</span>
        <input type="password" name="pin" inputmode="numeric" pattern="\\d{4,8}" maxlength="8" required autocomplete="current-password" placeholder="••••">
      </label>
      ${err ? `<div class="error">${esc(err)}</div>` : ''}
      <button class="btn lg" type="submit" style="width:100%">Начать или продолжить</button>
    </form>
    <p class="note" style="margin-top:14px">После каждых ${BLOCK} вопросов — промежуточный итог и пауза. Выйти можно в любой момент: прогресс сохраняется на сервере.</p>
  </section>`;
  const f = document.getElementById('loginForm');
  f.querySelector(err ? 'input[name=pin]' : 'input[name=name]').focus();
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    const btn = f.querySelector('button'); btn.disabled = true; btn.textContent = 'Входим…';
    try {
      const body = { name: fd.get('name'), pin: fd.get('pin') };
      if (mode != null) body.mode = mode;
      const r = await api('login', { method: 'POST', body: JSON.stringify(body) });
      store.token = r.token;
      store.me = { name: r.stats.name, mode: r.stats.mode };
      state.dots = [];
      location.hash = '#/quiz';
    } catch (ex) { viewStart(ex.message, mode); }
  });
}

// ---------------- тест ----------------
let state = { q: null, answered: false, dots: [] };

async function viewQuiz() {
  if (!store.token) { location.hash = '#/start'; return; }
  $app.innerHTML = '<p class="note">Загружаем вопрос…</p>';
  let d;
  try { d = await api('next'); }
  catch (e) { if (e.status === 401) { location.hash = '#/start'; viewStart('Сессия истекла — войдите снова по имени и PIN-коду.'); return; } $app.innerHTML = `<div class="error">${esc(e.message)}</div>`; return; }
  store.me = { ...(store.me || {}), name: d.stats.name, mode: d.stats.mode };
  if (d.finished) return viewFinished(d);
  const inBlock = d.stats.seq % BLOCK;
  if (inBlock === 0) state.dots = [];
  else if (state.dots.length !== inBlock) state.dots = Array(inBlock).fill('');
  state.q = d.question; state.answered = false;
  renderQuestion(d);
}

function progressHtml(st, rank, after = false) {
  const done = st.modeTotal ? (st.modeAnswered / st.modeTotal) * 100 : 0;
  const blockNo = Math.floor(Math.max(0, st.seq - (after ? 1 : 0)) / BLOCK) + 1;
  return `
  <div class="progress-wrap"><span>${esc(st.name)} · ${esc(st.modeTitle)}</span>
  <span>Верно: <b>${fmt(st.correct)}</b> из ${fmt(st.answered)}${st.answered ? ` (${pct(st.accuracy)})` : ''}${rank?.rank ? ` · место ${rank.rank} из ${rank.players}` : ''}</span></div>
  <div class="bar" title="Пройдено ${st.modeAnswered} из ${st.modeTotal}"><i style="width:${done.toFixed(2)}%"></i></div>
  <div class="progress-wrap"><span>Блок ${blockNo}</span><span>${st.mode === 'all' ? 'Пройдено' : 'В разделе пройдено'}: ${fmt(st.modeAnswered)} из ${fmt(st.modeTotal)}</span></div>`;
}
function dotsHtml(st) {
  let h = '';
  for (let i = 0; i < BLOCK; i++) h += `<i class="${i < state.dots.length ? state.dots[i] : i === state.dots.length ? 'cur' : ''}"></i>`;
  return `<div class="blockdots" aria-hidden="true">${h}</div>`;
}

function renderQuestion(d) {
  const q = d.question, st = d.stats;
  $app.innerHTML = `<div class="quiz">
  <div id="prog">${progressHtml(st, d)}</div>
  ${dotsHtml(st)}
  <article class="card">
    <div class="topic">${st.mode === 'all' ? esc(q.sectionTitle) + ' · ' : ''}${esc(q.topic)}</div>
    <p class="qtext"><span class="qnum">${q.number}.</span>${esc(q.text)}</p>
    <div class="options">${q.options.map((o, i) => `<button class="opt" data-i="${i}" data-letter="${LETTERS[i]}">${esc(o)}</button>`).join('')}</div>
    <div id="fb"></div>
  </article>
  <div class="actions"><button class="btn secondary" id="pauseBtn" type="button">Пауза — выйти и сохранить</button><span class="note hide-sm">Клавиши 1–${q.options.length} выбирают ответ, Enter — далее</span></div></div>`;
  $app.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => answer(Number(b.dataset.i))));
  document.getElementById('pauseBtn').addEventListener('click', () => { location.hash = '#/'; });
}

async function answer(i) {
  if (state.answered) return;
  state.answered = true;
  const btns = [...$app.querySelectorAll('.opt')];
  btns.forEach((b) => (b.disabled = true));
  let r;
  try { r = await api('answer', { method: 'POST', body: JSON.stringify({ qid: state.q.id, choice: i }) }); }
  catch (e) {
    document.getElementById('fb').innerHTML = `<div class="error">${esc(e.message)}</div><div class="actions"><button class="btn" id="nextBtn">Продолжить</button></div>`;
    document.getElementById('nextBtn').onclick = () => viewQuiz();
    return;
  }
  btns[r.correctIndex].classList.add('correct');
  if (!r.correct) btns[i].classList.add('wrong');
  btns.forEach((b, k) => { if (k !== r.correctIndex && k !== i) b.classList.add('dim'); });
  state.dots.push(r.correct ? 'ok' : 'bad');
  const prog = document.getElementById('prog');
  if (prog && r.stats) prog.innerHTML = progressHtml(r.stats, r, true);
  $app.querySelectorAll('.blockdots i').forEach((el, k) => { el.className = k < state.dots.length ? state.dots[k] : ''; });
  const src = `<div class="sources"><b>Источник:</b> ${r.sources.map((s) => (s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>` : esc(s.title))).join('; ')}</div>`;
  const expl = `<p style="margin:0">${esc(r.explanation)}</p>`;
  const last = !!r.summary || r.finished;
  document.getElementById('fb').innerHTML = `
    <div class="feedback ${r.correct ? 'ok' : 'bad'}">
      ${r.correct
        ? `<h3 class="ok-title">Верно!</h3><details class="more"><summary>Пояснение</summary>${expl}</details>${src}`
        : `<h3 class="bad-title">Неверно. Правильный ответ: ${LETTERS[r.correctIndex]}</h3>${expl}${src}`}
    </div>
    <div class="actions"><span></span>
    <button class="btn" id="nextBtn">${last ? 'Итоги блока' : 'Следующий вопрос →'}</button></div>`;
  const go = () => (last ? viewSummary(r) : viewQuiz());
  document.getElementById('nextBtn').onclick = go;
  document.getElementById('nextBtn').focus({ preventScroll: true });
}

function viewSummary(r) {
  const s = r.summary, st = r.stats;
  state.dots = [];
  const n = s.items.length;
  const wrong = s.items.filter((x) => !x.ok);
  $app.innerHTML = `
  <section class="stack quiz">
    <h1>${r.finished ? (st.mode === 'all' ? 'Тест пройден полностью!' : 'Раздел пройден!') : `Блок ${s.block} завершён`}</h1>
    <div class="card stack">
      <div class="row" style="align-items:baseline;gap:18px"><span class="big">${s.correct}/${n}</span><span class="lead" style="margin:0">верных ${plural(s.correct, 'ответ', 'ответа', 'ответов')} в этом блоке</span></div>
      <div class="kpis">
        <div class="kpi"><b>${fmt(st.correct)}</b><span>верных всего</span></div>
        <div class="kpi"><b>${fmt(st.answered)} / ${fmt(st.total)}</b><span>пройдено вопросов</span></div>
        <div class="kpi"><b>${pct(st.accuracy)}</b><span>точность</span></div>
        <div class="kpi"><b>${r.rank ?? '—'}</b><span>место из ${r.players}</span></div>
      </div>
    </div>
    ${wrong.length ? `<h2>Разбор ошибок блока</h2><ul class="review">${wrong.map((x) => `<li><div>${esc(x.text)}</div><div class="ans">Правильно: ${esc(x.answer)}</div></li>`).join('')}</ul>` : '<p class="lead">В этом блоке ни одной ошибки — превосходно!</p>'}
    <div class="row">
      ${r.finished ? '<a class="btn" href="#/">Выбрать другой раздел</a>' : '<button class="btn" id="contBtn">Продолжить тест</button>'}
      <button class="btn secondary" id="exitBtn">${r.finished ? 'К рейтингу' : 'Сделать паузу'}</button>
    </div>
    ${r.finished ? '' : '<p class="note">Если сделаете паузу, прогресс сохранится. Чтобы продолжить с того же места, войдите по своему имени и PIN-коду — на этом или на любом другом устройстве.</p>'}
  </section>`;
  document.getElementById('contBtn')?.addEventListener('click', () => viewQuiz());
  document.getElementById('exitBtn').addEventListener('click', () => { location.hash = r.finished ? '#/rating' : '#/'; });
  window.scrollTo({ top: 0 });
}

function viewFinished(d) {
  const st = d.stats;
  const whole = st.mode === 'all';
  $app.innerHTML = `
  <section class="stack quiz">
    <h1>${whole ? 'Тест пройден полностью!' : 'Этот раздел пройден'}</h1>
    <div class="card stack">
      <p class="lead" style="margin:0">${whole ? '' : `Все вопросы раздела «${esc(st.modeTitle)}» отвечены. `}Всего верных ответов: <b>${fmt(st.correct)}</b> из ${fmt(st.answered)} (${pct(st.accuracy)}), место в рейтинге — <b>${d.rank ?? '—'}</b> из ${d.players}.</p>
      <div class="row"><a class="btn" href="#/">${whole ? 'На главную' : 'Выбрать другой раздел'}</a><a class="btn secondary" href="#/rating">Открыть рейтинг</a></div>
    </div>
  </section>`;
}

// ---------------- рейтинг ----------------
const fmtDate = (ms) => new Date(ms).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

async function viewRating() {
  $app.innerHTML = `<div class="narrow">
    <h1>Рейтинг</h1>
    <p class="lead">Место определяется числом верных ответов, при равенстве выше тот, у кого меньше ошибок. Учитываются ответы во всех разделах.</p>
    <div id="lb" class="card"><p class="note">Загрузка…</p></div>
    ${store.token ? '<div class="row" style="margin-top:18px"><a class="btn" href="#/quiz">Продолжить тест</a><button class="btn secondary" id="resetBtn" type="button">Обнулить мой результат</button></div><div id="resetBox"></div>' : '<div class="row" style="margin-top:18px"><a class="btn" href="#/start">Пройти тест</a></div>'}</div>`;
  document.getElementById('resetBtn')?.addEventListener('click', () => askReset());
  try {
    const d = await api('leaderboard');
    const me = store.me;
    const more = d.list.length >= 100 && d.players > d.list.length ? ` Показаны первые ${d.list.length}.` : '';
    // Карточку заменяем целиком: так Safari не оставляет следы старой рамки при смене высоты.
    const card = document.createElement('div');
    card.id = 'lb'; card.className = 'card';
    card.innerHTML = d.list.length ? `
      <table class="lb"><thead><tr><th>#</th><th>Имя</th><th class="num">Верно</th><th class="num hide-sm">Пройдено</th><th class="num">Точность</th></tr></thead>
      <tbody>${d.list.map((r, i) => `<tr class="${me && me.name && me.name.toLowerCase() === r.name.toLowerCase() ? 'me' : ''}"><td class="${i < 3 ? 'medal' : ''}">${i + 1}</td><td>${esc(r.name)}</td><td class="num">${fmt(r.correct)}</td><td class="num hide-sm">${fmt(r.answered)} / ${fmt(r.total)}</td><td class="num">${pct(r.accuracy)}</td></tr>`).join('')}</tbody></table>
      <p class="note">Участников: ${d.players}.${more}</p>` : '<p class="note">Пока никто не ответил ни на один вопрос. Станьте первым!</p>';
    document.getElementById('lb')?.replaceWith(card);
  } catch (e) { document.getElementById('lb').innerHTML = `<div class="error">${esc(e.message)}</div>`; }
}

async function askReset() {
  const box = document.getElementById('resetBox');
  box.innerHTML = '<p class="note" style="margin-top:14px">Проверяем…</p>';
  let r;
  try { r = await api('reset'); } catch (e) { box.innerHTML = `<div class="error" style="margin-top:14px">${esc(e.message)}</div>`; return; }
  if (r.availableAt > r.now) {
    box.innerHTML = `<div class="card reset-card"><p>Результат можно обнулять не чаще раза в неделю. Следующий раз — <b>${fmtDate(r.availableAt)}</b>.</p></div>`;
    return;
  }
  box.innerHTML = `<div class="card reset-card stack">
    <p><b>Обнулить результат?</b> Все ваши ответы во всех разделах и место в рейтинге будут удалены, тест начнётся заново с новым порядком вопросов. Отменить это нельзя, а следующее обнуление станет доступно только через неделю.</p>
    <div class="row"><button class="btn danger" id="resetYes" type="button">Да, обнулить</button><button class="btn secondary" id="resetNo" type="button">Отмена</button></div>
  </div>`;
  document.getElementById('resetNo').onclick = () => { box.innerHTML = ''; };
  document.getElementById('resetYes').onclick = async (ev) => {
    ev.target.disabled = true;
    try {
      const res = await api('reset', { method: 'POST' });
      state.dots = [];
      const keep = `<div class="card reset-card"><p>Готово: результат обнулён. Следующее обнуление — не раньше ${fmtDate(res.availableAt)}.</p></div>`;
      await viewRating();
      document.getElementById('resetBox').innerHTML = keep;
    } catch (e) { box.innerHTML = `<div class="error" style="margin-top:14px">${esc(e.message)}</div>`; }
  };
}

// ---------------- источники ----------------
async function viewAbout() {
  $app.innerHTML = '<div class="narrow"><h1>Об источниках и правилах</h1><p class="note">Загрузка…</p></div>';
  const m = await getMeta();
  const books = (m.books || []).slice().sort((a, b) => a.author.localeCompare(b.author, 'ru'));
  $app.innerHTML = `<div class="narrow">
  <h1>Об источниках и правилах</h1>
  <div class="card stack">
    <p>Каждый вопрос составлен по одной из книг ниже и подтверждён точной цитатой из неё: после ответа видны автор, название, глава и ссылка на текст. Идеи излагаются так, как их формулирует сам автор, без оценок составителя.</p>
    <p>Вопросы идут в случайном порядке, своём для каждого участника, и разбиты на блоки по ${BLOCK}. Можно проходить весь тест или отдельные разделы: прогресс и рейтинг общие. На сервере сохраняется каждый ответ, поэтому продолжить можно с любого устройства по имени и PIN-коду. Правильные ответы хранятся только на сервере.</p>
    <h2>Книги (${books.length})</h2>
    ${books.length ? `<ul class="src-list">${books.map((b) => `<li>${esc(b.author)}. ${b.url ? `<a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.title)}</a>` : esc(b.title)} (${esc(b.year)})</li>`).join('')}</ul>` : '<p class="note">Список появится вместе с первыми вопросами.</p>'}
    <p class="note">Нашли неточность? Сообщите владельцу сайта, указав номер и текст вопроса.</p>
  </div></div>`;
}

function route() {
  updateNav();
  const h = location.hash || '#/';
  if (h.startsWith('#/quiz')) return viewQuiz();
  if (h.startsWith('#/rating')) return viewRating();
  if (h.startsWith('#/about')) return viewAbout();
  if (h.startsWith('#/start')) return viewStart();
  viewHome();
}
window.addEventListener('hashchange', route);
document.addEventListener('keydown', (e) => {
  if (!location.hash.startsWith('#/quiz') || e.target.tagName === 'INPUT') return;
  if (/^[1-5]$/.test(e.key) && !state.answered) {
    const b = $app.querySelector(`.opt[data-i="${Number(e.key) - 1}"]`);
    if (b) b.click();
  } else if (e.key === 'Enter' && state.answered) {
    const n = document.getElementById('nextBtn');
    if (n && document.activeElement !== n) n.click();
  }
});
route();
