/* FandomWire — minijuegos: personaje, canción, imagen y quiz */
(async () => {
  'use strict';
  try { await MF.ready; } catch { return; }
  const { api, esc, toast } = MF;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = $('#games-root');
  const KEYS = ['A', 'B', 'C', 'D'];
  const TYPES = {
    personaje: { icon: '🕵️', title: 'Adivina el personaje', blurb: 'Te damos pistas de a una. Mientras menos pistas uses, más XP ganas.' },
    cancion: { icon: '🎧', title: 'Adivina la canción', blurb: 'Escucha un clip corto y elige la respuesta correcta.' },
    imagen: { icon: '🖼️', title: 'Adivina la imagen', blurb: 'La imagen aparece borrosa y se va revelando. Revelar más cuesta XP.' }
  };
  const BLUR = [30, 16, 7, 0];
  let data = null, dlg = null;

  /* ---------- portada de juegos ---------- */
  async function load() {
    data = await api('/api/games');
    render();
  }

  function stateChip(s, xp) {
    if (!s || !s.done) return `<span class="chip chip--plain">+${xp} XP</span>`;
    return s.correct ? `<span class="chip">✓ +${s.points} XP</span>` : '<span class="chip chip--plain">✗ Fallado</span>';
  }

  function render() {
    const me = MF.me;
    const q = data.quiz;
    const byType = (t) => data.items.filter((i) => i.type === t);
    const pending = data.items.filter((i) => i.available && !(i.state && i.state.done)).length;
    root.innerHTML = `
      <div class="hub">
        <section class="panel hub__quiz sec-musica">
          <h2>Quiz de ${q.length} preguntas</h2>
          <p>Preguntas al azar de todos los temas, o elige uno. Cada acierto da 3 XP y un quiz perfecto suma 5 más.</p>
          <div class="hub__row">
            <label class="sr-only" for="quiz-topic">Tema del quiz</label>
            <select id="quiz-topic"><option value="">Todos los temas</option>${MF.meta.topics.map((t) => `<option value="${esc(t.slug)}">${esc(t.name)}</option>`).join('')}</select>
            <button class="btn btn--accent" type="button" id="quiz-go" ${q.questions < 3 ? 'disabled' : ''}>Jugar quiz</button>
          </div>
          <small>${me ? `Te quedan <b>${q.xp_runs_left}</b> de ${q.per_day} partidas con XP hoy; después juegas por diversión.` : 'Entra con tu cuenta para sumar XP.'}</small>
          <div id="quiz-resume"></div>
        </section>
        <section class="panel hub__mission sec-series">
          <h2>Misión diaria</h2>
          <p>Una pregunta nueva cada día. Mantén tu racha para ganar bonus de XP.</p>
          <a class="btn btn--accent" href="/mision.html">Ir a la misión</a>
        </section>
        <section class="panel hub__score">
          <h2>Ranking de minijuegos</h2>
          ${data.leaderboard.length ? `<table class="board"><thead><tr><th></th><th>Jugador</th><th>Puntos</th></tr></thead><tbody>${data.leaderboard.map((r, i) =>
            `<tr class="${me && r.username === me.username ? 'me' : ''}"><td class="rank">${i + 1}</td><td><a href="/perfil.html?u=${encodeURIComponent(r.username)}">${esc(r.name)}</a></td><td>${r.points}</td></tr>`).join('')}</tbody></table>` : MF.empty('Nadie ha sumado puntos todavía.')}
        </section>
      </div>
      ${me ? `<p class="muted">Tienes <b>${pending}</b> juego${pending === 1 ? '' : 's'} sin completar.</p>` : `<div class="gate sec-videojuegos"><div><h3>Crea tu cuenta para jugar</h3><p>Es gratis. Con ella sumas XP, apareces en el ranking y ganas insignias.</p></div><div class="hero__cta"><a class="btn" href="${MF.loginUrl('register')}">Crear cuenta</a><a class="btn" href="${MF.loginUrl()}">Ya tengo cuenta</a></div></div>`}
      ${Object.entries(TYPES).map(([t, info]) => `
        <section class="block" aria-labelledby="h-${t}">
          <div class="block__head"><div><h2 id="h-${t}">${info.icon} ${esc(info.title)}</h2><p>${esc(info.blurb)}</p></div></div>
          ${byType(t).length ? `<div class="games-grid">${byType(t).map((g) => `
            <button class="game-card ${MF.secClass(g.topic ? (MF.meta.topics.find((x) => x.slug === g.topic.slug) || {}).section : '')}" type="button" data-game="${g.id}" ${g.available ? '' : 'disabled'}>
              <span class="game-card__icon" aria-hidden="true">${info.icon}</span>
              <span class="game-card__body"><span class="game-card__topic">${g.topic ? esc(g.topic.name) : 'General'}</span><b>${esc(g.prompt)}</b></span>
              ${stateChip(g.state, g.xp)}
            </button>`).join('')}</div>` : MF.empty('Todavía no hay juegos de este tipo. El administrador puede agregarlos en Admin → Minijuegos.')}
        </section>`).join('')}`;

    $('#quiz-go').addEventListener('click', () => startQuiz(false));
    $$('[data-game]').forEach((b) => b.addEventListener('click', () => openGame(Number(b.dataset.game))));
    if (me) checkQuizResume();
  }

  async function checkQuizResume() {
    try {
      const { current } = await api('/api/quiz/current');
      if (current) {
        $('#quiz-resume').innerHTML = `<p class="notice">Tienes un quiz a medias (pregunta ${current.index + 1} de ${current.total}). <button class="btn btn--sm" type="button" id="quiz-continue">Continuar</button> <button class="btn btn--sm btn--ghost" type="button" id="quiz-new">Empezar uno nuevo</button></p>`;
        $('#quiz-continue').addEventListener('click', () => startQuiz(false));
        $('#quiz-new').addEventListener('click', () => startQuiz(true));
      }
    } catch { /* sin quiz pendiente */ }
  }

  /* ---------- diálogo ---------- */
  function dialog(title) {
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.className = 'dialog dialog--game';
      document.body.append(dlg);
      dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
      dlg.addEventListener('close', () => { const a = dlg.querySelector('audio'); if (a) a.pause(); load(); });
    }
    dlg.innerHTML = `<div class="dialog__bar"><h3>${esc(title)}</h3><button class="btn btn--sm btn--ghost" type="button" data-close>Cerrar</button></div><div class="dialog__body" id="dlg-body" aria-live="polite"></div>`;
    if (!dlg.open) dlg.showModal();
    return $('#dlg-body', dlg);
  }

  const loginGate = () => `<div class="gate sec-musica"><div><h3>Entra para jugar</h3><p>Crea tu cuenta gratis para sumar XP y aparecer en el ranking.</p></div><div class="hero__cta"><a class="btn" href="${MF.loginUrl('register')}">Crear cuenta</a><a class="btn" href="${MF.loginUrl()}">Iniciar sesión</a></div></div>`;

  function afterAnswer(r) {
    if (typeof r.xp === 'number') { MF.me.xp = r.xp; MF.renderHeader(); }
  }
  const unlockedMsg = (u) => (u && u.length ? ` ¡Desbloqueaste: ${u.map(esc).join(', ')}!` : '');

  function nextPending(currentId) {
    const list = data.items.filter((i) => i.available && !(i.state && i.state.done) && i.id !== currentId);
    return list.length ? list[0].id : null;
  }

  /* ---------- juegos de adivinar ---------- */
  async function openGame(id) {
    const info = data.items.find((i) => i.id === id);
    const body = dialog(info ? TYPES[info.type].title : 'Minijuego');
    if (!MF.me) { body.innerHTML = loginGate(); return; }
    body.innerHTML = '<div class="skeleton"></div>';
    try { drawGame(body, await api(`/api/games/${id}`)); }
    catch (err) { body.innerHTML = MF.empty(err.message); }
  }

  function resultHtml(st, extra = {}) {
    const done = st.done || extra.done;
    if (!done) return '';
    const correct = extra.correct ?? st.correct;
    const pts = extra.points ?? st.points;
    const next = nextPending(st.game.id);
    return `<div class="result">${correct ? '¡Correcto!' : 'Esta vez no fue.'} La respuesta era <b>${esc(st.answer || extra.answer)}</b>.${correct ? ` Ganaste <b>${pts} XP</b>.` : ''}${unlockedMsg(extra.unlocked)}
      <div class="dialog__actions">${next ? '<button class="btn btn--sm btn--accent" type="button" data-next>Siguiente juego</button>' : ''}<button class="btn btn--sm btn--ghost" type="button" data-close>Cerrar</button></div></div>`;
  }

  function drawGame(body, st, extra = {}) {
    const g = st.game;
    if (st.locked) { body.innerHTML = loginGate(); return; }
    if (extra.answer && !st.answer) st.answer = extra.answer;
    const done = st.done || extra.done;
    const topic = g.topic ? `<span class="chip">${esc(g.topic.name)}</span> ` : '';
    let inner = `${topic}<span class="chip chip--plain">hasta ${g.xp} XP</span><p class="quiz__q">${esc(g.prompt)}</p>`;

    if (g.type === 'personaje') {
      inner += `<ol class="hints">${st.hints.map((h, i) => `<li><span>Pista ${i + 1}</span>${esc(h)}</li>`).join('')}</ol>`;
      if (!done) {
        const more = st.hints_used < st.hints_total - 1;
        inner += `<div class="dialog__actions">${more ? '<button class="btn btn--sm btn--ghost" type="button" data-hint>Pedir otra pista (−20% XP)</button>' : '<small class="muted">No quedan más pistas.</small>'}</div>
          <form class="guess" id="guess-form"><label class="sr-only" for="guess">Tu respuesta</label><input id="guess" type="text" maxlength="80" autocomplete="off" placeholder="¿Quién es?" required><button class="btn btn--accent" type="submit">Adivinar</button></form>
          <small class="muted">Intentos: ${st.tries} de ${st.tries_max}. ${extra.msg ? `<b>${esc(extra.msg)}</b>` : ''}</small>`;
      }
    } else {
      if (g.type === 'cancion') inner += `<audio controls controlsList="nodownload" preload="auto" src="${esc(st.media_url)}">Tu navegador no puede reproducir audio.</audio>`;
      else inner += `<div class="imgbox"><img src="${esc(st.media_url)}" alt="Imagen del juego" style="filter:blur(${BLUR[st.reveal] ?? 0}px)"></div>
        ${!done && st.reveal < st.max_reveal ? '<div class="dialog__actions"><button class="btn btn--sm btn--ghost" type="button" data-hint>Revelar más (−25% XP)</button></div>' : ''}`;
      inner += `<div class="options">${st.options.map((o, i) => {
        let cls = '';
        const ans = st.answer || extra.answer;
        if (done && ans) { if (o === ans) cls = ' option--right'; else if (extra.choiceText === o) cls = ' option--wrong'; }
        return `<button class="option${cls}" type="button" data-choice="${i}" data-text="${esc(o)}" ${done ? 'disabled' : ''}><span class="option__key">${KEYS[i]}</span>${esc(o)}</button>`;
      }).join('')}</div>`;
    }
    inner += resultHtml(st, extra);
    body.innerHTML = inner;

    const hint = $('[data-hint]', body);
    if (hint) hint.addEventListener('click', async () => {
      hint.disabled = true;
      try { drawGame(body, await api(`/api/games/${g.id}/hint`, { method: 'POST', body: {} })); } catch (err) { toast(err.message, 'error'); hint.disabled = false; }
    });
    const form = $('#guess-form', body);
    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const guess = $('#guess', body).value;
      try {
        const r = await api(`/api/games/${g.id}/answer`, { method: 'POST', body: { guess } });
        afterAnswer(r);
        const fresh = await api(`/api/games/${g.id}`);
        drawGame(body, fresh, { ...r, msg: r.correct || r.done ? '' : `Esa no es. Te quedan ${r.tries_left} intento${r.tries_left === 1 ? '' : 's'}.` });
      } catch (err) { toast(err.message, 'error'); }
    });
    $$('[data-choice]', body).forEach((b) => b.addEventListener('click', async () => {
      $$('[data-choice]', body).forEach((x) => { x.disabled = true; });
      try {
        const r = await api(`/api/games/${g.id}/answer`, { method: 'POST', body: { choice: Number(b.dataset.choice) } });
        afterAnswer(r);
        const fresh = await api(`/api/games/${g.id}`);
        drawGame(body, fresh, { ...r, choiceText: b.dataset.text });
      } catch (err) { toast(err.message, 'error'); $$('[data-choice]', body).forEach((x) => { x.disabled = false; }); }
    }));
    const nx = $('[data-next]', body);
    if (nx) nx.addEventListener('click', async () => {
      const cur = data.items.find((i) => i.id === g.id);
      if (cur) cur.state = { done: true };
      const id = nextPending(g.id);
      if (id) { body.innerHTML = '<div class="skeleton"></div>'; try { drawGame(body, await api(`/api/games/${id}`)); } catch (err) { body.innerHTML = MF.empty(err.message); } }
    });
  }

  /* ---------- quiz ---------- */
  async function startQuiz(restart) {
    const body = dialog('Quiz');
    if (!MF.me) { body.innerHTML = loginGate(); return; }
    body.innerHTML = '<div class="skeleton"></div>';
    try {
      const topic = $('#quiz-topic') ? $('#quiz-topic').value : '';
      drawQuiz(body, await api('/api/quiz/start', { method: 'POST', body: { topic: topic || undefined, restart } }));
    } catch (err) { body.innerHTML = MF.empty(err.message); }
  }

  function drawQuiz(body, cur, feedback) {
    const q = cur.question;
    const pct = Math.round((cur.index / cur.total) * 100);
    body.innerHTML = `<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${cur.total}" aria-valuenow="${cur.index}"><i style="width:${pct}%"></i></div>
      <p class="muted small">Pregunta ${cur.index + 1} de ${cur.total} · Aciertos: ${cur.score}${q.topic ? ` · ${esc(q.topic)}` : ''}</p>
      <p class="quiz__q">${esc(q.text)}</p>
      <div class="options">${q.options.map((o, i) => {
        let cls = '';
        if (feedback) { if (i === feedback.correct_index) cls = ' option--right'; else if (i === feedback.choice) cls = ' option--wrong'; }
        return `<button class="option${cls}" type="button" data-q="${i}" ${feedback ? 'disabled' : ''}><span class="option__key">${KEYS[i]}</span>${esc(o)}</button>`;
      }).join('')}</div>
      ${feedback ? `<div class="result">${feedback.correct ? '¡Correcto!' : 'Esta vez no fue.'}<div class="dialog__actions"><button class="btn btn--sm btn--accent" type="button" data-qnext>${feedback.done ? 'Ver resultado' : 'Siguiente'}</button></div></div>` : ''}`;
    $$('[data-q]', body).forEach((b) => b.addEventListener('click', async () => {
      $$('[data-q]', body).forEach((x) => { x.disabled = true; });
      const choice = Number(b.dataset.q);
      try {
        const r = await api(`/api/quiz/${cur.run}/answer`, { method: 'POST', body: { choice } });
        const shown = { index: cur.index, total: cur.total, run: cur.run, question: q, score: r.score };
        drawQuiz(body, shown, { ...r, choice });
        const nx = $('[data-qnext]', body);
        nx.addEventListener('click', () => { if (r.done) { afterAnswer(r); drawQuizEnd(body, r); } else drawQuiz(body, r.next); });
      } catch (err) { toast(err.message, 'error'); $$('[data-q]', body).forEach((x) => { x.disabled = false; }); }
    }));
  }

  function drawQuizEnd(body, r) {
    const perfect = r.score === r.total;
    body.innerHTML = `<h2>${perfect ? '¡Quiz perfecto! 🎉' : 'Quiz terminado'}</h2>
      <div class="stats3"><div class="stat"><b>${r.score}/${r.total}</b><span>aciertos</span></div><div class="stat"><b>+${r.xp_gained}</b><span>XP</span></div><div class="stat"><b>${r.xp}</b><span>XP total</span></div></div>
      ${r.practice ? '<p class="notice">Ya usaste tus partidas con XP de hoy. Esta fue de práctica; vuelve mañana para sumar de nuevo.</p>' : ''}
      ${r.unlocked && r.unlocked.length ? `<p class="result">¡Desbloqueaste: ${r.unlocked.map(esc).join(', ')}!</p>` : ''}
      <div class="dialog__actions"><button class="btn btn--accent" type="button" id="quiz-again">Jugar otro</button><button class="btn btn--ghost" type="button" data-close>Cerrar</button></div>`;
    $('#quiz-again', body).addEventListener('click', () => startQuiz(true));
  }

  await load();
})();
