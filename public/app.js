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
  document.querySelectorAll('header nav a').forEach((a) => { const href = a.getAttribute('href'); a.classList.toggle('active', h === href || (href.length > 2 && h.startsWith(href + '/'))); });
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
    <figure class="hero-photo"><img src="/img/cover.webp" width="993" height="861" alt="М. В. Нестеров. «Философы» (П. А. Флоренский и С. Н. Булгаков), 1917"><figcaption>М. В. Нестеров. «Философы», 1917</figcaption></figure>
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
  const src = r.sources.map((s) => `<div class="sources">${s.quote ? `<p class="quote">«${esc(s.quote)}»</p>` : ''}<b>Источник:</b> ${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>` : esc(s.title)}</div>`).join('');
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

// ---------------- библиотека ----------------
const SECTION_TITLES = ['Древнерусская мысль и XVIII век', 'Чаадаев и славянофилы', 'Западники, революционная и народническая мысль',
  'Почвенничество и консерватизм', 'Достоевский и Толстой', 'Академическая философия XIX века', 'Владимир Соловьёв',
  'Серебряный век и «Вехи»', 'Бердяев', 'Булгаков и Флоренский', 'Франк, Лосский, Ильин', 'Эмиграция и евразийство',
  'Русский космизм', 'Марксизм в России', 'Советская философия', 'Историки русской философии'];
let libCache = null;
const mb = (n) => (n / 1048576).toLocaleString('ru-RU', { maximumFractionDigits: n < 1048576 ? 1 : 1 }) + ' МБ';
const pagesWord = (n) => { const a = n % 100, b = n % 10; return a > 10 && a < 20 ? 'страниц' : b === 1 ? 'страница' : b > 1 && b < 5 ? 'страницы' : 'страниц'; };

async function viewLibrary() {
  $app.innerHTML = '<div class="narrow"><h1>Библиотека</h1><p class="note">Загрузка…</p></div>';
  try {
    if (!libCache) { const r = await fetch('/library.json'); if (!r.ok) throw new Error('Не удалось загрузить список книг'); libCache = await r.json(); }
  } catch (e) { $app.innerHTML = `<div class="narrow"><h1>Библиотека</h1><div class="error">${esc(e.message)}</div></div>`; return; }
  const books = libCache;
  const withPdf = books.filter((b) => b.pdf);
  const total = withPdf.reduce((s, b) => s + b.size, 0);
  const pages = withPdf.reduce((s, b) => s + b.pages, 0);
  const groups = SECTION_TITLES.map((t, i) => ({ id: i + 1, title: t, books: books.filter((b) => b.section === i + 1) })).filter((g) => g.books.length);
  const row = (b) => b.pdf
    ? `<li class="lib-item"><div class="lib-text"><span class="lib-author">${esc(b.author)}</span><span class="lib-title">${esc(b.title)}</span><span class="lib-meta">${esc(b.year)} · ${fmt(b.pages)} ${pagesWord(b.pages)} · ${mb(b.size)}${b.partial ? ` · ${esc(b.partial)}` : ''}</span></div><a class="btn lib-btn" href="${esc(b.pdf)}" target="_blank" rel="noopener" download="${esc(b.key)}.pdf" aria-label="Скачать PDF: ${esc(b.author)}. ${esc(b.title)}">PDF</a></li>`
    : `<li class="lib-item off"><div class="lib-text"><span class="lib-author">${esc(b.author)}</span><span class="lib-title">${esc(b.title)}</span><span class="lib-meta">${esc(b.year)} · нет в библиотеке: ${esc(b.excluded)}</span></div>${b.src ? `<a class="btn secondary lib-btn" href="${esc(b.src)}" target="_blank" rel="noopener" aria-label="Текст в сети: ${esc(b.author)}. ${esc(b.title)}">В сети</a>` : ''}</li>`;
  $app.innerHTML = `<div class="narrow">
  <h1>Библиотека</h1>
  <p class="lead">Все книги, по которым составлены вопросы теста, — в PDF для чтения и печати: ${withPdf.length} ${withPdf.length % 10 === 1 && withPdf.length % 100 !== 11 ? 'книга' : 'книг'}, ${fmt(pages)} ${pagesWord(pages)}, ${mb(total)}.</p>
  <div class="card stack lib-about">
    <p>В каждом файле — титульный лист, оглавление и авторский текст. Шапки сайтов, примечания и комментарии публикаторов не включены. Тексты взяты из открытых электронных публикаций; в сканах возможны отдельные ошибки распознавания.</p>
    <p class="note">Книги, на которые ещё действуют авторские права или права переводчиков, здесь не выкладываются — у них стоит ссылка на текст в сети.</p>
  </div>
  <nav class="lib-toc" aria-label="Разделы">${groups.map((g) => `<a href="#/library" data-sec="${g.id}">${g.id}. ${esc(g.title)}</a>`).join('')}</nav>
  ${groups.map((g) => `<section class="lib-sec" id="lib-${g.id}"><h2>${g.id}. ${esc(g.title)}</h2><ul class="lib-list">${g.books.map(row).join('')}</ul></section>`).join('')}
  </div>`;
  $app.querySelectorAll('.lib-toc a').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('lib-' + a.dataset.sec)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
}

// ---------------- понятия ----------------
let cxCache = null;
async function loadConcepts() {
  if (cxCache) return cxCache;
  const r = await fetch('/concepts.json');
  if (!r.ok) throw new Error('Не удалось загрузить понятия');
  const d = await r.json();
  d.byWork = Object.fromEntries(d.works.map((w) => [w.key, w]));
  d.order = [];
  d.num = {};
  d.group = {};
  for (const w of d.works) {
    w.order = [];
    const walk = (id, pref, g) => {
      d.num[id] = pref; d.group[id] = g; w.order.push(id); d.order.push(id);
      (d.terms[id].c || []).forEach((c, i) => walk(c, pref + '.' + (i + 1), g));
    };
    let n = 0;
    w.groups.forEach((g, gi) => { g.idx = gi; g.terms.forEach((id) => walk(id, String(++n), gi)); });
    w.links = new Set();
    for (const id of w.order) for (const k of ['see', 'anti', 'dev', 'src']) for (const x of d.terms[id][k] || []) if (d.terms[x].w !== w.key) w.links.add(d.terms[x].w);
  }
  d.nlinks = d.order.reduce((s, id) => s + (d.terms[id].see || []).length + (d.terms[id].anti || []).length + (d.terms[id].dev || []).length + (d.terms[id].src || []).length, 0) / 2;
  d.nq = d.order.reduce((s, id) => s + (d.terms[id].q || []).length, 0);
  cxCache = d;
  return d;
}
const cxNorm = (s) => String(s).toLowerCase().replace(/ё/g, 'е').replace(/[«»"“”„]/g, '');
const cxSurname = (a) => (/^(Сборник|Вяч\.)/.test(a) ? a : a.split(' ').slice(-1)[0]);
const cxDef = (d, s) => esc(s).replace(/\[\[([a-z0-9_]+)(?:\|([^\]]+))?\]\]/g, (_, id, txt) => d.terms[id] ? `<a href="#/terms/t/${id}">${txt ? txt : esc(d.terms[id].n)}</a>` : (txt || id));
const cxWorkLabel = (w) => `${esc(cxSurname(w.author))}. «${esc(w.title)}»`;
const cxRef = (d, id) => {
  const t = d.terms[id], w = d.byWork[t.w];
  return `<a class="cx-ref" href="#/terms/t/${id}"><span class="cx-ref-n">${esc(t.n)}</span><span class="cx-ref-w">${cxWorkLabel(w)}</span></a>`;
};
const CX_KINDS = [
  ['see', 'Сопоставить', 'Близкие понятия у других авторов и в других местах'],
  ['anti', 'Полемика и противоположность', 'С чем это понятие спорит или чему противостоит'],
  ['dev', 'Развитие', 'Где эта мысль подхвачена и продолжена'],
  ['src', 'Истоки', 'Что эта мысль продолжает'],
  ['ment', 'Упоминается', 'В определениях других понятий'],
];
const termsWord = (n) => plural(n, 'понятие', 'понятия', 'понятий');

function cxShell(d, crumbs, body) {
  $app.innerHTML = `<div class="cx">
  <div class="cx-bar">
    <nav class="cx-crumbs" aria-label="Путь">${crumbs}</nav>
    <div class="cx-search"><input id="cxQ" type="search" placeholder="Найти понятие" aria-label="Поиск по понятиям" autocomplete="off"><a class="cx-az" href="#/terms/az">Указатель А–Я</a></div>
  </div>
  <div id="cxRes" class="cx-res hidden" aria-live="polite"></div>
  <div id="cxBody">${body}</div>
  </div>`;
  const q = document.getElementById('cxQ'), res = document.getElementById('cxRes'), bodyEl = document.getElementById('cxBody');
  q.addEventListener('input', () => {
    const s = cxNorm(q.value.trim());
    if (s.length < 2) { res.classList.add('hidden'); bodyEl.classList.remove('hidden'); return; }
    const scored = [];
    for (const id of d.order) {
      const t = d.terms[id], n = cxNorm(t.n), aka = cxNorm((t.aka || []).join(' ')), def = cxNorm(t.d);
      const sc = n.startsWith(s) ? 0 : n.includes(s) ? 1 : aka.includes(s) ? 2 : def.includes(s) ? 3 : cxNorm((t.q || []).join(' ')).includes(s) ? 4 : -1;
      if (sc >= 0) scored.push([sc, id]);
    }
    scored.sort((a, b) => a[0] - b[0]);
    res.innerHTML = scored.length
      ? `<p class="note">Найдено: ${scored.length} ${termsWord(scored.length)}</p><ul class="cx-hits">${scored.slice(0, 80).map(([, id]) => `<li>${cxRef(d, id)}<p>${cxDef(d, d.terms[id].d)}</p></li>`).join('')}</ul>`
      : '<p class="note">Ничего не найдено. Попробуйте другое слово или откройте указатель.</p>';
    res.classList.remove('hidden'); bodyEl.classList.add('hidden');
  });
  window.scrollTo(0, 0);
}

async function viewTerms() {
  $app.innerHTML = '<div class="narrow"><h1>Понятия</h1><p class="note">Загрузка…</p></div>';
  let d;
  try { d = await loadConcepts(); } catch (e) { $app.innerHTML = `<div class="narrow"><h1>Понятия</h1><div class="error">${esc(e.message)}</div></div>`; return; }
  const h = location.hash.split('?')[0];
  const parts = h.split('/');
  if (parts[2] === 'w' && d.byWork[parts[3]]) return cxWork(d, d.byWork[parts[3]], new URLSearchParams(location.hash.split('?')[1] || '').get('t'));
  if (parts[2] === 't' && d.terms[parts[3]]) return cxTerm(d, parts[3]);
  if (parts[2] === 'az') return cxIndex(d);
  return cxHome(d);
}

function cxHome(d) {
  const hubs = d.order.map((id) => [id, ['see', 'anti', 'dev', 'src'].reduce((s, k) => s + (d.terms[id][k] || []).length, 0)]).sort((a, b) => b[1] - a[1]).slice(0, 16);
  const body = `<h1>Понятия</h1>
  <p class="lead">Произведения русской философии XIX века, разложенные на дерево понятий: ${d.works.length} ${plural(d.works.length, 'произведение', 'произведения', 'произведений')}, ${fmt(d.order.length)} ${termsWord(d.order.length)}, ${fmt(d.nlinks)} ${plural(d.nlinks, 'связь', 'связи', 'связей')} между ними и ${d.nq} ${plural(d.nq, 'цитата', 'цитаты', 'цитат')}.</p>
  <div class="card stack cx-about">
    <p>Каждое произведение разобрано по своему строению: части и темы, внутри них — главные понятия, под ними — подчинённые. У понятия есть определение, место в тексте, цитата и связи с понятиями других авторов: что с чем стоит сопоставить, кто с кем спорит и где мысль получила развитие.</p>
    <p class="note">Все цитаты сверены с текстами книг из <a href="#/library">Библиотеки</a>. Определения передают мысль автора своими словами и не оценивают её.</p>
  </div>
  <h2 class="cx-h2">Узловые понятия</h2>
  <p class="note">Больше всего связей с другими авторами.</p>
  <div class="cx-chips">${hubs.map(([id]) => cxRef(d, id)).join('')}</div>
  ${d.sections.map((s) => `<section class="cx-sec"><h2 class="cx-h2">${s.id}. ${esc(s.title)}</h2><ul class="cx-works">${d.works.filter((w) => w.section === s.id).map((w) => `<li><a class="cx-work" href="#/terms/w/${w.key}"><span class="lib-author">${esc(w.author)}</span><span class="lib-title">${esc(w.title)}</span><span class="lib-meta">${esc(w.year)} · ${w.order.length} ${termsWord(w.order.length)} · связи с ${w.links.size} ${plural(w.links.size, 'произведением', 'произведениями', 'произведениями')}</span></a></li>`).join('')}</ul></section>`).join('')}`;
  cxShell(d, '<span>Понятия</span>', body);
}

function cxNode(d, id, hl) {
  const t = d.terms[id];
  const refs = CX_KINDS.slice(0, 4).filter(([k]) => (t[k] || []).length).map(([k, label]) => `<div class="cx-mini"><span class="cx-mini-k">${label}:</span> ${t[k].map((x) => `<a href="#/terms/t/${x}">${esc(d.terms[x].n)}</a><span class="cx-mini-w"> (${esc(cxSurname(d.byWork[d.terms[x].w].author))})</span>`).join(', ')}</div>`).join('');
  return `<li class="cx-node${id === hl ? ' hl' : ''}" id="n-${id}">
    <div class="cx-node-head"><span class="cx-num">${d.num[id]}</span><a class="cx-node-n" href="#/terms/t/${id}">${esc(t.n)}</a>${t.loc ? `<span class="cx-loc">${esc(t.loc)}</span>` : ''}</div>
    <p class="cx-node-d">${cxDef(d, t.d)}</p>
    ${t.q ? `<p class="cx-node-q">«${esc(t.q[0])}»</p>` : ''}
    ${refs}
    ${t.c ? `<ol class="cx-tree">${t.c.map((c) => cxNode(d, c, hl)).join('')}</ol>` : ''}
  </li>`;
}

function cxWork(d, w, hl) {
  const sec = d.sections.find((s) => s.id === w.section);
  const linked = [...w.links].map((k) => d.byWork[k]);
  const body = `<p class="cx-eyebrow">${esc(w.author)} · ${esc(w.year)}</p>
  <h1 class="cx-title">${esc(w.title)}</h1>
  <p class="lead">${esc(w.about)}</p>
  <div class="cx-actions">${w.pdf ? `<a class="btn secondary" href="${esc(w.pdf)}" target="_blank" rel="noopener">Текст книги, PDF</a>` : ''}<span class="note">${w.order.length} ${termsWord(w.order.length)}</span></div>
  ${w.groups.length > 1 ? `<nav class="lib-toc cx-gtoc" aria-label="Части">${w.groups.map((g) => `<a href="#/terms/w/${w.key}" data-g="${g.idx}">${esc(g.title)}</a>`).join('')}</nav>` : ''}
  ${w.groups.map((g) => `<section class="cx-group" id="g-${g.idx}">${g.title ? `<h2 class="cx-h2">${esc(g.title)}</h2>` : ''}<ol class="cx-tree cx-root">${g.terms.map((id) => cxNode(d, id, hl)).join('')}</ol></section>`).join('')}
  ${linked.length ? `<h2 class="cx-h2">Связанные произведения</h2><ul class="cx-linked">${linked.map((x) => `<li><a href="#/terms/w/${x.key}">${cxWorkLabel(x)}</a></li>`).join('')}</ul>` : ''}`;
  cxShell(d, `<a href="#/terms">Понятия</a><span>${sec ? esc(sec.title) : ''}</span><span>${esc(cxSurname(w.author))}. «${esc(w.title)}»</span>`, body);
  $app.querySelectorAll('.cx-gtoc a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('g-' + a.dataset.g)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
  if (hl) setTimeout(() => document.getElementById('n-' + hl)?.scrollIntoView({ block: 'center' }), 0);
}

function cxTerm(d, id) {
  const t = d.terms[id], w = d.byWork[t.w];
  const g = w.groups[d.group[id]];
  const chain = [];
  for (let p = t.p; p; p = d.terms[p].p) chain.unshift(p);
  const i = w.order.indexOf(id);
  const prev = w.order[i - 1], next = w.order[i + 1];
  const rel = CX_KINDS.filter(([k]) => (t[k] || []).length).map(([k, label, hint]) => `<section class="cx-rel"><h2 class="cx-h3">${label}</h2><p class="note">${hint}</p><div class="cx-chips">${t[k].map((x) => cxRef(d, x)).join('')}</div></section>`).join('');
  const body = `<p class="cx-eyebrow">${esc(w.author)} · «${esc(w.title)}»${t.loc ? ` · ${esc(t.loc)}` : ''}</p>
  <h1 class="cx-title">${esc(t.n)}</h1>
  ${t.aka ? `<p class="note">Также: ${t.aka.map(esc).join('; ')}</p>` : ''}
  <p class="cx-def">${cxDef(d, t.d)}</p>
  ${(t.q || []).map((q) => `<blockquote class="cx-quote"><p>«${esc(q)}»</p><footer>${esc(w.author)}. ${esc(w.title)}${t.loc ? `, ${esc(t.loc)}` : ''}</footer></blockquote>`).join('')}
  ${t.c ? `<section class="cx-rel"><h2 class="cx-h3">Подчинённые понятия</h2><ol class="cx-sub">${t.c.map((c) => `<li><a href="#/terms/t/${c}">${esc(d.terms[c].n)}</a> — ${cxDef(d, d.terms[c].d)}</li>`).join('')}</ol></section>` : ''}
  ${rel || '<p class="note">Связей с понятиями других авторов пока нет.</p>'}
  <div class="cx-actions"><a class="btn secondary" href="#/terms/w/${w.key}?t=${id}">Показать в дереве произведения</a>${w.pdf ? `<a class="btn secondary" href="${esc(w.pdf)}" target="_blank" rel="noopener">Текст книги, PDF</a>` : ''}</div>
  <nav class="cx-pager" aria-label="Соседние понятия">${prev ? `<a href="#/terms/t/${prev}"><span class="note">← Предыдущее</span>${esc(d.terms[prev].n)}</a>` : '<span></span>'}${next ? `<a class="nx" href="#/terms/t/${next}"><span class="note">Следующее →</span>${esc(d.terms[next].n)}</a>` : '<span></span>'}</nav>`;
  const sec = d.sections.find((s) => s.id === w.section);
  cxShell(d, `<a href="#/terms">Понятия</a><span>${sec ? esc(sec.title) : ''}</span><a href="#/terms/w/${w.key}">${esc(cxSurname(w.author))}. «${esc(w.title)}»</a>${g && g.title ? `<span>${esc(g.title)}</span>` : ''}${chain.map((p) => `<a href="#/terms/t/${p}">${esc(d.terms[p].n)}</a>`).join('')}`, body);
}

function cxIndex(d) {
  const items = d.order.map((id) => ({ id, n: d.terms[id].n })).sort((a, b) => a.n.localeCompare(b.n, 'ru'));
  const letters = {};
  for (const it of items) { const L = it.n.replace(/^[«"(]/, '')[0].toUpperCase().replace('Ё', 'Е'); (letters[L] = letters[L] || []).push(it); }
  const keys = Object.keys(letters).sort((a, b) => a.localeCompare(b, 'ru'));
  const body = `<h1>Указатель А–Я</h1>
  <p class="lead">Все ${fmt(items.length)} ${termsWord(items.length)} по алфавиту, с автором и произведением.</p>
  <nav class="cx-letters" aria-label="Буквы">${keys.map((k) => `<a href="#/terms/az" data-l="${esc(k)}">${esc(k)}</a>`).join('')}</nav>
  ${keys.map((k) => `<section class="cx-letter" id="L-${esc(k)}"><h2 class="cx-h2">${esc(k)}</h2><ul class="cx-az-list">${letters[k].map((it) => { const w = d.byWork[d.terms[it.id].w]; return `<li><a href="#/terms/t/${it.id}">${esc(it.n)}</a> <span class="note">— ${cxWorkLabel(w)}</span></li>`; }).join('')}</ul></section>`).join('')}`;
  cxShell(d, '<a href="#/terms">Понятия</a><span>Указатель</span>', body);
  $app.querySelectorAll('.cx-letters a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('L-' + a.dataset.l)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
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
  if (h.startsWith('#/library')) return viewLibrary();
  if (h.startsWith('#/terms')) return viewTerms();
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
