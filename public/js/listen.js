/* FandomWire — "Ahora suena": Spotify, videoclip y letra sincronizados, con ajuste manual */
(async () => {
  'use strict';
  try { await MF.ready; } catch { return; }

  const { api, esc, toast } = MF;
  const M = window.FWMusic;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = $('#listen-root');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }
  };
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!MF.me) {
    root.innerHTML = `<div class="gate sec-musica"><div><h3>Inicia sesión para sincronizar</h3><p>Los videoclips y las letras son para cuentas registradas. Es gratis y toma un minuto.</p></div>
      <div class="hero__cta"><a class="btn" href="${MF.loginUrl('register')}">Crear cuenta</a><a class="btn" href="${MF.loginUrl()}">Ya tengo cuenta</a></div></div>`;
    return;
  }

  /* ---------- estado ---------- */
  const S = {
    mode: M && M.connected() ? 'auto' : 'manual',
    songs: [], song: null, detail: null, pinned: false,
    off: { v: 0, l: 0 }, linked: true, muted: true,
    manual: { playing: false, base: 0, t0: 0 },
    lines: { timed: false, lines: [] }, lyricIdx: -2,
    video: null, lastSeek: 0, ytTime: null, ytPlaying: null, ytReady: false
  };
  const savedMode = store.get('fw_listen_mode');
  if (savedMode === 'manual') S.mode = 'manual';
  if (S.mode === 'auto' && !(M && M.connected())) S.mode = 'manual';

  const fmtT = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const fmtOff = (ms) => `${ms >= 0 ? '+' : '−'}${(Math.abs(ms) / 1000).toFixed(1).replace('.', ',')} s`;

  /* ---------- armazón ---------- */
  root.innerHTML = `
    <div class="listen">
      <section class="panel" id="src" aria-live="polite"></section>
      <div class="listen__grid">
        <div class="listen__main">
          <section class="panel stage" id="stage" aria-label="Video y letra"></section>
        </div>
        <aside class="listen__side">
          <section class="panel" id="picker"></section>
          <section class="panel" id="sync"></section>
        </aside>
      </div>
      <details class="panel" id="apple"><summary><b>¿Usas Apple Music u otra app?</b></summary>
        <p>Apple Music no permite que una página web lea qué canción suena en tu app del celular o computador, y su reproductor para webs exige una cuenta de desarrollador de pago, por eso aquí solo se vincula Spotify.</p>
        <p>No te quedas fuera: usa el <b>modo manual</b>. Elige la canción, pon play en el sitio y en tu app al mismo tiempo, y con los botones de desfase lo afinas hasta que coincidan. El ajuste queda guardado para la próxima vez.</p></details>
    </div>`;

  /* ---------- fuente: Spotify ---------- */
  function renderSource() {
    const el = $('#src');
    const connected = M && M.connected();
    let body = '';
    if (!M || !M.clientId()) {
      body = `<h2>Spotify</h2><div class="notice"><p><b>Este sitio aún no tiene Spotify configurado.</b> Quien administra el sitio debe crear una app gratuita en el panel de desarrolladores de Spotify y definir <code>SPOTIFY_CLIENT_ID</code> al iniciar el servidor (el README lo explica paso a paso).</p><p>Mientras tanto puedes usar el <b>modo manual</b>.</p></div>`;
    } else if (!connected) {
      body = `<h2>Spotify</h2><p>Al vincular, el sitio solo puede ver <b>qué canción está sonando</b> y en qué minuto. No accede a tus playlists ni puede reproducir nada. Puedes desvincular cuando quieras.</p>
        <button class="btn btn--accent" type="button" id="sp-connect">Vincular Spotify</button><p class="form-error" id="sp-err" role="alert"></p>`;
    } else {
      const t = M.track(), st = M.status();
      let line;
      if (t) {
        line = `<div class="nowcard">${t.art ? `<img src="${esc(t.art)}" alt="">` : '<span class="nowcard__noart" aria-hidden="true">🎵</span>'}
          <div class="nowcard__txt"><b>${esc(t.title)}</b><span>${esc(t.artist)}${t.album ? ' · ' + esc(t.album) : ''}</span>
          <small class="muted">${t.isPlaying ? 'Sonando ahora' : 'En pausa'}</small>
          <div class="progress" aria-hidden="true"><i id="sp-bar" style="width:0%"></i></div></div></div>`;
      } else {
        const msg = { forbidden: 'Spotify no permitió leer tu reproducción. Si la app del sitio está en modo desarrollo, el administrador debe agregar tu correo de Spotify en su panel de desarrolladores.', limited: 'Spotify pidió ir más despacio. Reintentando en unos segundos.', offline: 'Sin conexión a internet.', error: 'No se pudo consultar a Spotify. Reintentando.', connecting: 'Conectando con Spotify…' }[st.status];
        line = `<p class="muted">${esc(msg || 'No hay nada sonando en Spotify ahora. Pon una canción en cualquiera de tus dispositivos y aparecerá aquí.')}</p>`;
      }
      body = `<div class="src__head"><h2>Spotify <span class="chip chip--solid">Vinculado</span></h2><button class="btn btn--sm btn--ghost" type="button" id="sp-disc">Desvincular</button></div>${line}
        <label class="check"><input type="checkbox" id="sp-share" ${MF.me.share_np ? 'checked' : ''}> Mostrar en mi perfil lo que estoy escuchando</label>`;
    }
    el.innerHTML = body;
    const c = $('#sp-connect');
    if (c) c.addEventListener('click', async () => { try { await M.connect(); } catch (e) { $('#sp-err').textContent = e.message; } });
    const d = $('#sp-disc');
    if (d) d.addEventListener('click', () => { M.disconnect(); S.mode = 'manual'; renderAll(); toast('Spotify desvinculado.'); });
    const sh = $('#sp-share');
    if (sh) sh.addEventListener('change', async () => {
      try { const r = await api('/api/me/profile', { method: 'PUT', body: { share_np: sh.checked } }); MF.me.share_np = r.user.share_np; if (sh.checked && M.track()) M.refreshNow(); toast(sh.checked ? 'Ahora tu perfil muestra lo que escuchas.' : 'Tu perfil ya no muestra lo que escuchas.'); }
      catch (e) { sh.checked = !sh.checked; toast(e.message, 'error'); }
    });
  }

  /* ---------- tiempo ---------- */
  function currentPos() { // segundos en la línea de tiempo de la canción
    if (S.mode === 'auto' && M) return M.position() / 1000;
    const m = S.manual;
    return m.base + (m.playing ? (performance.now() - m.t0) / 1000 : 0);
  }
  function isPlaying() {
    if (S.mode === 'auto') { const t = M && M.track(); return !!(t && t.isPlaying); }
    return S.manual.playing;
  }
  function setManual(posSec, playing) {
    S.manual = { base: Math.max(0, posSec), playing, t0: performance.now() };
  }
  function duration() {
    const t = M && M.track();
    if (S.mode === 'auto' && t && t.durationMs) return t.durationMs / 1000;
    if (S.video && S.video.kind === 'file' && S.video.el && isFinite(S.video.el.duration)) return Math.max(S.video.el.duration - S.off.v / 1000, 30);
    const last = S.lines.lines.length ? S.lines.lines[S.lines.lines.length - 1].t : 0;
    return Math.max(300, (last || 0) + 30);
  }

  /* ---------- letra ---------- */
  function parseLrc(text) {
    const out = []; let timed = false;
    for (const raw of String(text || '').split(/\r?\n/)) {
      const tags = [...raw.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
      const txt = raw.replace(/\[[^\]]*\]/g, '').trim();
      if (tags.length) { timed = true; for (const x of tags) out.push({ t: +x[1] * 60 + +x[2] + (x[3] ? +('0.' + x[3]) : 0), text: txt }); }
      else if (txt) out.push({ t: null, text: txt });
    }
    return timed ? { timed: true, lines: out.filter((l) => l.t !== null).sort((a, b) => a.t - b.t) } : { timed: false, lines: out };
  }
  function lineIndexAt(T) {
    const L = S.lines.lines; let lo = 0, hi = L.length - 1, ans = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (L[mid].t <= T) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans;
  }
  function paintLyrics(idx) {
    const box = $('#lyrics'); if (!box) return;
    $$('li', box).forEach((li, i) => { li.classList.toggle('is-now', i === idx); li.classList.toggle('is-past', i < idx); });
    const li = box.querySelector(`li[data-i="${idx}"]`);
    if (li) box.scrollTo({ top: li.offsetTop - box.clientHeight / 2 + li.clientHeight / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* ---------- video ---------- */
  const YT = 'https://www.youtube-nocookie.com';
  function ytSend(func, args = []) {
    const f = S.video && S.video.el;
    if (f && f.contentWindow) f.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), YT);
  }
  window.addEventListener('message', (e) => {
    if (e.origin !== YT || !S.video || S.video.kind !== 'youtube') return;
    let d; try { d = JSON.parse(e.data); } catch { return; }
    if (d.event === 'onReady') { S.ytReady = true; if (S.muted) ytSend('mute'); else ytSend('unMute'); }
    if (d.event === 'infoDelivery' && d.info) {
      if (typeof d.info.currentTime === 'number') S.ytTime = d.info.currentTime;
      if (typeof d.info.playerState === 'number') S.ytPlaying = d.info.playerState === 1;
    }
  });

  function buildStage() {
    const el = $('#stage');
    S.video = null; S.lyricIdx = -2; S.ytTime = null; S.ytPlaying = null; S.ytReady = false;
    if (!S.detail) {
      const t = M && M.track();
      el.innerHTML = `<div class="stage__empty">${t && t.art ? `<img src="${esc(t.art)}" alt="">` : '<span aria-hidden="true">🎶</span>'}
        <p>${S.mode === 'auto' && t ? 'Esta canción todavía no está en FandomWire. Elige una de la lista para sincronizarla igual.' : 'Elige una canción de la lista para ver su videoclip y su letra.'}</p></div>`;
      return;
    }
    const d = S.detail, v = d.video;
    let media = '';
    if (v && v.type === 'file') media = `<video id="vid" src="${esc(v.url)}" muted playsinline preload="auto" aria-label="Videoclip"></video>`;
    else if (v && v.type === 'youtube') media = `<iframe id="vid" title="Videoclip" src="${YT}/embed/${esc(v.id)}?enablejsapi=1&controls=0&mute=1&playsinline=1&rel=0&modestbranding=1&disablekb=1&origin=${encodeURIComponent(location.origin)}" allow="autoplay; encrypted-media" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    S.lines = parseLrc(d.lyrics);
    const lyr = S.lines.lines.length
      ? `<ol class="lyrics" id="lyrics" tabindex="0" aria-label="Letra">${S.lines.lines.map((l, i) => `<li data-i="${i}"${S.lines.timed ? ` data-t="${l.t}"` : ''}>${esc(l.text)}</li>`).join('')}</ol>${S.lines.timed ? '' : '<p class="muted small">Esta letra no tiene tiempos, así que no se puede sincronizar.</p>'}`
      : '<div class="stage__empty"><p>Esta canción todavía no tiene letra.</p></div>';
    el.innerHTML = `<div class="stage__head"><div><h2>${esc(d.song.title)}</h2><span class="muted">${esc(d.song.artist)}</span></div>
        <label class="check"><input type="checkbox" id="vid-mute" ${S.muted ? 'checked' : ''}> Video sin sonido</label></div>
      <div class="stage__grid"><div class="stage__video">${media || '<div class="stage__novideo"><span aria-hidden="true">🎞</span><p>Esta canción no tiene videoclip todavía.</p></div>'}</div>${lyr}</div>`;
    if (v && v.type === 'file') {
      const vid = $('#vid'); S.video = { kind: 'file', el: vid };
      vid.addEventListener('loadedmetadata', renderSync);
    } else if (v && v.type === 'youtube') {
      const fr = $('#vid'); S.video = { kind: 'youtube', el: fr };
      fr.addEventListener('load', () => { fr.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 'fw', channel: 'widget' }), YT); });
    }
    const mu = $('#vid-mute');
    if (mu) mu.addEventListener('change', () => {
      S.muted = mu.checked;
      if (S.video && S.video.kind === 'file') S.video.el.muted = S.muted;
      if (S.video && S.video.kind === 'youtube') ytSend(S.muted ? 'mute' : 'unMute');
    });
    const ly = $('#lyrics');
    if (ly) ly.addEventListener('click', (e) => {
      const li = e.target.closest('li[data-t]'); if (!li) return;
      if (S.mode === 'auto') { toast('En modo automático el tiempo lo manda Spotify. Pasa a manual para saltar.'); return; }
      setManual(+li.dataset.t - S.off.l / 1000, S.manual.playing);
    });
  }

  function syncVideo(pos, playing) {
    const v = S.video; if (!v) return;
    const want = pos + S.off.v / 1000, now = performance.now();
    if (v.kind === 'file') {
      const el = v.el, dur = el.duration;
      if (want < 0 || (isFinite(dur) && want > dur)) { if (!el.paused) el.pause(); if (want < 0 && el.currentTime > 0.05) el.currentTime = 0; return; }
      const drift = Math.abs(el.currentTime - want);
      if (playing) {
        if (drift > 0.35 && now - S.lastSeek > 700) { el.currentTime = want; S.lastSeek = now; }
        if (el.paused) el.play().catch(() => {});
      } else {
        if (!el.paused) el.pause();
        if (drift > 0.1 && now - S.lastSeek > 200) { el.currentTime = want; S.lastSeek = now; }
      }
    } else if (v.kind === 'youtube') {
      if (want < 0) { if (S.ytPlaying) ytSend('pauseVideo'); return; }
      const known = typeof S.ytTime === 'number';
      const drift = known ? Math.abs(S.ytTime - want) : 99;
      if ((drift > 0.6 || !known) && now - S.lastSeek > (known ? 1200 : 8000)) { ytSend('seekTo', [want, true]); S.lastSeek = now; }
      if (playing && S.ytPlaying !== true && now - (S.lastCmd || 0) > 1500) { ytSend('playVideo'); S.lastCmd = now; }
      if (!playing && S.ytPlaying !== false && now - (S.lastCmd || 0) > 1500) { ytSend('pauseVideo'); S.lastCmd = now; }
    }
  }

  /* ---------- selector de canción ---------- */
  function renderPicker() {
    const el = $('#picker');
    const t = M && M.track();
    const auto = S.mode === 'auto';
    const match = auto && t ? M.matchSong(S.songs, t) : null;
    let status = '';
    if (auto && t) {
      status = match
        ? `<p class="small">Suena <b>${esc(t.title)}</b> → coincide con <b>${esc(match.title)}</b>.</p>`
        : `<p class="small muted">Suena <b>${esc(t.title)}</b>, pero no está en el sitio.</p>`;
    }
    el.innerHTML = `
      <h2>Canción</h2>
      <div class="seg" role="group" aria-label="Modo"><button type="button" data-mode="auto" aria-pressed="${auto}" ${M && M.connected() ? '' : 'disabled title="Vincula Spotify para usar el modo automático"'}>Automático</button><button type="button" data-mode="manual" aria-pressed="${!auto}">Manual</button></div>
      ${status}
      <div class="field"><label for="song-sel">Canciones del sitio</label>
        <select id="song-sel"><option value="">— elige una —</option>${S.songs.map((s) => `<option value="${s.id}" ${S.song === s.id ? 'selected' : ''}>${esc(s.title)} — ${esc(s.artist)}${s.has_video ? '' : ' (sin video)'}</option>`).join('')}</select></div>
      ${auto && S.pinned ? '<button class="btn btn--sm btn--ghost" type="button" id="unpin">Volver a elegir automáticamente</button>' : ''}
      ${S.songs.length ? '' : '<p class="muted small">Todavía no hay canciones. El administrador puede agregarlas en Admin → Canciones.</p>'}`;
    $$('[data-mode]', el).forEach((b) => b.addEventListener('click', () => switchMode(b.dataset.mode)));
    $('#song-sel').addEventListener('change', (e) => { S.pinned = true; loadSong(e.target.value ? +e.target.value : null); });
    const up = $('#unpin'); if (up) up.addEventListener('click', () => { S.pinned = false; autoPick(); renderPicker(); });
  }

  function switchMode(mode) {
    if (mode === S.mode) return;
    if (mode === 'auto' && !(M && M.connected())) return;
    const pos = currentPos(), playing = isPlaying();
    S.mode = mode; store.set('fw_listen_mode', mode);
    if (mode === 'manual') setManual(pos, playing); else autoPick();
    renderAll(false);
  }

  /* ---------- desfases ---------- */
  const offKey = (id) => `fw_off_${id}`;
  function loadOffsets(d) {
    let o = null;
    try { o = JSON.parse(store.get(offKey(d.song.id))); } catch { o = null; }
    S.off = o && Number.isFinite(o.v) && Number.isFinite(o.l) ? { v: o.v, l: o.l } : { v: d.offsets.video_ms, l: d.offsets.lyrics_ms };
    S.hasSaved = !!o;
  }
  function saveOffsets() { if (S.song) { store.set(offKey(S.song), JSON.stringify(S.off)); S.hasSaved = true; } }
  const clampOff = (ms) => Math.max(-30000, Math.min(30000, Math.round(ms / 100) * 100));

  function changeOff(key, newVal) {
    newVal = clampOff(newVal);
    const delta = newVal - S.off[key];
    S.off[key] = newVal;
    if (S.linked) { const other = key === 'v' ? 'l' : 'v'; S.off[other] = clampOff(S.off[other] + delta); }
    S.lastSeek = 0;
    saveOffsets(); paintOffsets();
  }
  function paintOffsets() {
    ['v', 'l'].forEach((k) => {
      const out = $(`[data-out="${k}"]`), rng = $(`[data-range="${k}"]`);
      if (out) out.textContent = fmtOff(S.off[k]);
      if (rng) rng.value = S.off[k] / 1000;
    });
    const note = $('#off-note'); if (note) note.textContent = S.song ? 'Tu ajuste queda guardado para esta canción en este navegador.' : '';
  }

  function offBlock(k, title, hint) {
    return `<div class="off"><div class="off__head"><b>${title}</b><output data-out="${k}">${fmtOff(S.off[k])}</output></div>
      <div class="off__btns">
        <button type="button" class="btn btn--sm btn--ghost" data-step="${k}" data-d="-1000" aria-label="${title}: retrasar 1 segundo">−1 s</button>
        <button type="button" class="btn btn--sm btn--ghost" data-step="${k}" data-d="-100" aria-label="${title}: retrasar 0,1 segundos">−0,1</button>
        <button type="button" class="btn btn--sm btn--ghost" data-step="${k}" data-d="100" aria-label="${title}: adelantar 0,1 segundos">+0,1</button>
        <button type="button" class="btn btn--sm btn--ghost" data-step="${k}" data-d="1000" aria-label="${title}: adelantar 1 segundo">+1 s</button>
      </div>
      <input type="range" min="-30" max="30" step="0.1" value="${S.off[k] / 1000}" data-range="${k}" aria-label="${title}: desfase en segundos">
      <small class="muted">${hint}</small></div>`;
  }

  function renderSync() {
    const el = $('#sync');
    const manual = S.mode === 'manual';
    const dur = duration();
    el.innerHTML = `
      <h2>Sincronía</h2>
      <p class="small muted">Si el video o la letra van <b>atrasados</b> respecto a tu canción, usa <b>+</b> para adelantarlos. Si van <b>adelantados</b>, usa <b>−</b>.</p>
      ${offBlock('v', 'Video', 'Mueve el videoclip.')}
      ${offBlock('l', 'Letra', 'Mueve solo la letra.')}
      <label class="check"><input type="checkbox" id="link" ${S.linked ? 'checked' : ''}> Mover video y letra juntos</label>
      <div class="dialog__actions">
        <button class="btn btn--sm btn--ghost" type="button" id="resync">Resincronizar ahora</button>
        <button class="btn btn--sm btn--ghost" type="button" id="off-reset">Restablecer ajuste</button>
      </div>
      <p class="muted small" id="off-note"></p>
      <p class="muted small">Atajos: <kbd>[</kbd> y <kbd>]</kbd> mueven 0,1 s; con <kbd>Shift</kbd>, 1 s.</p>
      <div class="transport" ${manual ? '' : 'hidden'}>
        <h3>Control manual</h3>
        <p class="small muted">Pon play aquí y en tu app a la vez, y afina con el desfase.</p>
        <div class="transport__btns">
          <button class="btn btn--sm btn--ghost" type="button" data-tr="start" aria-label="Volver al inicio">⏮</button>
          <button class="btn btn--sm btn--ghost" type="button" data-tr="-5" aria-label="Retroceder 5 segundos">−5 s</button>
          <button class="btn btn--sm btn--accent" type="button" data-tr="toggle" id="tr-toggle">${S.manual.playing ? '⏸ Pausa' : '▶ Play'}</button>
          <button class="btn btn--sm btn--ghost" type="button" data-tr="5" aria-label="Avanzar 5 segundos">+5 s</button>
        </div>
        <div class="transport__bar"><span id="tr-now">0:00</span><input type="range" id="tr-seek" min="0" max="${Math.round(dur)}" step="1" value="0" aria-label="Posición"><span id="tr-dur">${fmtT(dur)}</span></div>
      </div>
      ${manual ? '' : '<p class="muted small">En modo automático el tiempo lo manda Spotify. Para controlar tú el tiempo, pasa a <b>Manual</b>.</p>'}`;
    paintOffsets();
    $$('[data-step]', el).forEach((b) => b.addEventListener('click', () => changeOff(b.dataset.step, S.off[b.dataset.step] + +b.dataset.d)));
    $$('[data-range]', el).forEach((r) => r.addEventListener('input', () => changeOff(r.dataset.range, Math.round(+r.value * 1000))));
    $('#link').addEventListener('change', (e) => { S.linked = e.target.checked; });
    $('#resync').addEventListener('click', () => { S.lastSeek = 0; S.ytTime = null; toast('Sincronizando…'); });
    $('#off-reset').addEventListener('click', () => {
      if (!S.detail) return;
      S.off = { v: S.detail.offsets.video_ms, l: S.detail.offsets.lyrics_ms };
      try { localStorage.removeItem(offKey(S.song)); } catch { /* sin almacenamiento */ }
      S.hasSaved = false; S.lastSeek = 0; paintOffsets();
    });
    $$('[data-tr]', el).forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.tr, pos = currentPos();
      if (a === 'start') setManual(0, S.manual.playing);
      else if (a === 'toggle') setManual(pos, !S.manual.playing);
      else setManual(pos + +a, S.manual.playing);
      const tg = $('#tr-toggle'); if (tg) tg.textContent = S.manual.playing ? '⏸ Pausa' : '▶ Play';
    }));
    const sk = $('#tr-seek');
    if (sk) {
      sk.addEventListener('input', () => { sk.dataset.drag = '1'; $('#tr-now').textContent = fmtT(+sk.value); });
      sk.addEventListener('change', () => { setManual(+sk.value, S.manual.playing); delete sk.dataset.drag; });
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input[type=text],input[type=search],textarea,select')) return;
    if ((e.key !== '[' && e.key !== ']') || !S.song) return;
    const step = (e.shiftKey ? 1000 : 100) * (e.key === ']' ? 1 : -1);
    changeOff('v', S.off.v + step);
    e.preventDefault();
  });

  /* ---------- cargar canción ---------- */
  let loadToken = 0;
  async function loadSong(id) {
    const token = ++loadToken;
    S.song = id; S.detail = null; S.lines = { timed: false, lines: [] };
    if (!id) { buildStage(); renderSync(); renderPicker(); return; }
    try {
      const d = await api(`/api/songs/${id}`);
      if (token !== loadToken) return;
      if (d.locked) { toast('Inicia sesión para ver esta canción.', 'error'); return; }
      S.detail = d; loadOffsets(d);
    } catch (err) { toast(err.message, 'error'); S.song = null; }
    buildStage(); renderSync(); renderPicker();
  }

  function autoPick() {
    if (S.mode !== 'auto' || S.pinned || !M) return;
    const match = M.matchSong(S.songs, M.track());
    const id = match ? match.id : null;
    if (id !== S.song) loadSong(id);
  }

  /* ---------- bucle ---------- */
  let lastTrackId = null;
  function tick() {
    const pos = currentPos(), playing = isPlaying();
    if (S.lines.timed && S.lines.lines.length) {
      const idx = lineIndexAt(pos + S.off.l / 1000);
      if (idx !== S.lyricIdx) { S.lyricIdx = idx; paintLyrics(idx); }
    }
    syncVideo(pos, playing);
    const tn = $('#tr-now'), sk = $('#tr-seek');
    if (tn && sk && !sk.dataset.drag) { tn.textContent = fmtT(pos); sk.max = Math.round(duration()); sk.value = Math.round(pos); }
    const bar = $('#sp-bar'), t = M && M.track();
    if (bar && t && t.durationMs) bar.style.width = `${Math.min(100, (M.position() / t.durationMs) * 100)}%`;
  }
  setInterval(tick, 100);

  function renderAll(reloadStage = true) {
    renderSource(); renderPicker(); renderSync();
    if (reloadStage) buildStage();
  }

  /* ---------- arranque ---------- */
  if (M) {
    const cb = await M.handleCallback();
    if (cb && cb.error) toast(cb.error, 'error');
    if (cb && cb.ok) { S.mode = 'auto'; store.set('fw_listen_mode', 'auto'); toast('¡Spotify vinculado!'); }
    M.setFast(true);
    window.addEventListener('pagehide', () => M.setFast(false));
    M.onChange((track) => {
      const id = track ? track.id : null;
      const first = lastTrackId === null && id !== null;
      if (id !== lastTrackId) { lastTrackId = id; renderSource(); renderPicker(); autoPick(); if (first) renderSync(); }
      else renderSource();
    });
  }
  try { S.songs = (await api('/api/songs')).items; } catch { S.songs = []; }
  renderAll();
  autoPick(); // Spotify pudo responder antes de que llegara la lista de canciones
  if (M && M.connected()) { M.refreshNow(); }
  if (S.mode === 'manual' && S.songs.length === 1) { S.pinned = true; loadSong(S.songs[0].id); }
})();
