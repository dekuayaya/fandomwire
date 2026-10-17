/* FandomWire — lógica compartida y de cada página pública */
(() => {
  'use strict';

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SECTION_ORDER = ['series', 'musica', 'videojuegos'];
  const KIND_LABEL = { image: 'Imagen', video: 'Video', audio: 'Audio', file: 'Archivo' };

  const MF = { me: null, meta: null };
  window.MF = MF;

  /* ---------- utilidades ---------- */
  async function api(path, opts = {}) {
    const init = { method: opts.method || 'GET', headers: {}, credentials: 'same-origin' };
    if (opts.body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    const res = await fetch(path, init);
    let data = null;
    try { data = await res.json(); } catch { /* sin cuerpo */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Error ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function toast(message, type = '') {
    let box = $('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.append(box); }
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ` toast--${type}` : '');
    t.textContent = message;
    box.append(t);
    setTimeout(() => t.remove(), 4200);
  }

  const parseDate = (s) => new Date(String(s).replace(' ', 'T') + 'Z');
  const fmtDate = (s) => parseDate(s).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  const fmtMoney = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: MF.meta.currency, maximumFractionDigits: 0 }).format(n);
  const qs = () => new URLSearchParams(location.search);
  const secClass = (k) => (k ? `sec-${esc(k)}` : '');
  const topicBySlug = (slug) => MF.meta.topics.find((t) => t.slug === slug);
  const loginUrl = (tab) => `/login.html?${tab ? `tab=${tab}&` : ''}next=${encodeURIComponent(location.pathname + location.search)}`;
  const empty = (msg) => `<div class="empty">${esc(msg)}</div>`;

  function formatProse(text) {
    return String(text || '').split(/\n{2,}/).map((block) => {
      const lines = block.split('\n').map((l) => l.trimEnd()).filter(Boolean);
      if (!lines.length) return '';
      if (lines.length === 1 && lines[0].startsWith('## ')) return `<h2>${esc(lines[0].slice(3))}</h2>`;
      if (lines.every((l) => l.startsWith('- '))) return `<ul>${lines.map((l) => `<li>${esc(l.slice(2))}</li>`).join('')}</ul>`;
      return `<p>${lines.map(esc).join('<br>')}</p>`;
    }).join('');
  }

  /* ---------- avatar ---------- */
  function avatarHtml(av, name, size = 40) {
    const a = av || {};
    const initial = esc((String(name || '?').trim()[0] || '?').toUpperCase());
    const px = `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.52)}px`;
    if (a.img) return `<span class="avatar" style="${px}"><img src="${esc(a.img)}" alt=""></span>`;
    const bg = /^#[0-9a-f]{6}$/i.test(a.color || '') ? a.color : '';
    const fg = bg && window.FWTheme ? (FWTheme.contrast(bg, '#14122b') >= FWTheme.contrast(bg, '#ffffff') ? '#14122b' : '#ffffff') : '';
    return `<span class="avatar" style="${px}${bg ? `;background:${bg};color:${fg}` : ''}" aria-hidden="true">${a.emoji ? esc(a.emoji) : initial}</span>`;
  }

  /* ---------- cabecera y pie ---------- */
  function activeKey() {
    const page = document.body.dataset.page;
    if (page === 'article') return 'news';
    if (page === 'mission') return 'games';
    if (page === 'games') return 'games';
    if (page === 'listen') return 'listen';
    if (page === 'profile' || page === 'account') return null;
    if (page === 'section') return qs().get('s');
    if (page === 'topic') { const t = topicBySlug(qs().get('t')); return t ? t.section : null; }
    return page;
  }

  function renderHeader() {
    const links = [
      ['home', 'Inicio', '/'], ['news', 'Noticias', '/noticias.html'],
      ...SECTION_ORDER.map((k) => [k, MF.meta.sections[k].name, `/seccion.html?s=${k}`]),
      ['library', 'Biblioteca', '/biblioteca.html'], ['shop', 'Ventas', '/ventas.html'], ['games', 'Minijuegos', '/juegos.html'], ['listen', 'Ahora suena', '/escuchando.html']
    ];
    const active = activeKey();
    const me = MF.me;
    const themeBtn = '<button class="iconbtn" id="theme-btn" type="button" aria-label="Personalizar colores" title="Personalizar colores">🎨</button>';
    const auth = me
      ? `<span class="np-chip" id="np-chip" hidden></span>${themeBtn}
         <a class="xpchip" href="/mision.html" title="Tu progreso"><b>${me.xp}</b><span>XP</span> · <b>${me.streak}</b><span>días</span></a>
         <a class="userlink userlink--avatar" href="/perfil.html?u=${encodeURIComponent(me.username)}" title="Mi perfil">${avatarHtml(me.avatar, me.display_name || me.username, 30)}<span>${esc(me.display_name || me.username)}</span></a>
         <a class="btn btn--sm btn--ghost" href="/cuenta.html">Mi cuenta</a>
         ${me.role === 'admin' ? '<a class="btn btn--sm" href="/admin.html">Admin</a>' : ''}
         <button class="btn btn--sm btn--ghost" id="logout-btn" type="button">Salir</button>`
      : `<span class="np-chip" id="np-chip" hidden></span>${themeBtn}<a class="userlink" href="${loginUrl()}">Entrar</a><a class="btn btn--sm btn--accent" href="${loginUrl('register')}">Crear cuenta</a>`;
    $('#site-header').className = 'site-header';
    $('#site-header').innerHTML = `<div class="wrap site-header__row">
      <a class="brand" href="/"><span class="brand__dots" aria-hidden="true"><i></i><i></i><i></i></span>${esc(MF.meta.site)}</a>
      <nav class="nav" aria-label="Principal">${links.map(([k, label, href]) => `<a href="${href}"${k === active ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('')}</nav>
      <div class="auth">${auth}</div></div>`;
    if (window.FWMusic) FWMusic.paintChip();
    const out = $('#logout-btn');
    if (out) out.addEventListener('click', async () => { await api('/api/logout', { method: 'POST', body: {} }); location.href = '/'; });
  }

  function renderFooter() {
    const f = $('#site-footer');
    if (!f) return;
    f.className = 'site-footer';
    f.innerHTML = `<div class="wrap site-footer__row">
      <span>${esc(MF.meta.site)} · sitio de fans, hecho por fans.</span>
      <nav aria-label="Pie"><a href="/noticias.html">Noticias</a><a href="/biblioteca.html">Biblioteca</a><a href="/ventas.html">Ventas</a><a href="/juegos.html">Minijuegos</a><a href="/mision.html">Misión diaria</a><a href="/escuchando.html">Ahora suena</a></nav></div>`;
  }

  /* ---------- tarjetas ---------- */
  function newsCard(a) {
    const img = a.image ? `<img class="news-card__img" src="${esc(a.image)}" alt="" loading="lazy">` : '<div class="news-card__img"></div>';
    return `<a class="news-card ${secClass(a.section)}" href="/articulo.html?id=${a.id}">
      ${img}
      <div class="news-card__body">
        <div class="news-card__meta">${a.topic ? `<span class="chip">${esc(a.topic.name)}</span>` : ''}<span>${esc(fmtDate(a.created_at))}</span></div>
        <h3>${esc(a.title)}</h3>
        <p class="news-card__excerpt">${esc(a.excerpt)}</p>
        <span class="news-card__more">${MF.me ? 'Leer completo' : '<i class="lock" aria-hidden="true"></i> Inicia sesión para leer completo'}</span>
      </div></a>`;
  }

  function assetCard(a) {
    const locked = a.min_xp > 0 && (!MF.me || (MF.me.role !== 'admin' && MF.me.xp < a.min_xp));
    const thumb = a.thumb ? `<img src="${esc(a.thumb)}" alt="" loading="lazy">` : '';
    return `<button class="asset-card ${secClass(a.section)}" type="button" data-asset="${a.id}">
      <span class="asset-thumb">${thumb}<span class="badge">${esc(KIND_LABEL[a.kind] || a.kind)}</span>${locked ? `<span class="badge badge--lock"><i class="lock" aria-hidden="true"></i>${a.min_xp} XP</span>` : ''}</span>
      <span class="asset-card__body">
        <span class="asset-card__cat">${esc(a.category)}${a.topic ? ' · ' + esc(a.topic.name) : ''}</span>
        <h3>${esc(a.title)}</h3>
      </span></button>`;
  }

  function bindAssetCards(root = document) {
    $$('[data-asset]', root).forEach((b) => b.addEventListener('click', () => openAsset(Number(b.dataset.asset))));
  }

  function groupByCategory(items, order) {
    const groups = new Map();
    for (const c of order) groups.set(c, []);
    for (const a of items) { if (!groups.has(a.category)) groups.set(a.category, []); groups.get(a.category).push(a); }
    return [...groups].filter(([, list]) => list.length);
  }

  function categoryRows(items, order) {
    if (!items.length) return empty('Todavía no hay assets aquí. Se agregan desde el panel de administración.');
    return groupByCategory(items, order).map(([cat, list]) =>
      `<div class="cat-row"><h3>${esc(cat)} <span class="muted small">${list.length}</span></h3><div class="grid">${list.map(assetCard).join('')}</div></div>`).join('');
  }

  /* ---------- visor de assets (diálogo) ---------- */
  async function openAsset(id) {
    let dlg = $('#asset-dialog');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'asset-dialog';
      dlg.className = 'dialog';
      dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener('close', () => { dlg.innerHTML = ''; });
      document.body.append(dlg);
    }
    let data;
    try { data = await api(`/api/assets/${id}`); } catch (e) { toast(e.message, 'error'); return; }
    const { asset: a, media: m } = data;

    let viewer = '', actions = '';
    if (m.state === 'ok' && m.type === 'file') {
      if (a.kind === 'image') viewer = `<div class="viewer"><img src="${esc(m.url)}" alt="${esc(a.title)}"></div>`;
      else if (a.kind === 'video') viewer = `<div class="viewer"><video controls preload="metadata" src="${esc(m.url)}"></video></div>`;
      else if (a.kind === 'audio') viewer = `<div class="viewer viewer--audio"><audio controls preload="metadata" src="${esc(m.url)}"></audio></div>`;
      else viewer = '<div class="viewer viewer--empty">Archivo listo para descargar.</div>';
      actions = `<a class="btn btn--accent" href="${esc(m.download)}">Descargar</a>`;
    } else if (m.state === 'ok' && m.type === 'embed') {
      viewer = `<div class="viewer"><iframe src="${esc(m.url)}" title="${esc(a.title)}" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>`;
      actions = `<a class="btn btn--ghost" href="${esc(m.link)}" target="_blank" rel="noopener noreferrer">Abrir en YouTube</a>`;
    } else if (m.state === 'ok') {
      viewer = '<div class="viewer viewer--empty">Este asset está en un sitio externo.</div>';
      actions = `<a class="btn btn--accent" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">Abrir enlace</a>`;
    } else if (m.state === 'login') {
      viewer = `<div class="viewer viewer--empty">${a.thumb ? `<img src="${esc(a.thumb)}" alt="" style="max-height:220px;margin:0 auto 16px;border:2px solid var(--ink);border-radius:12px">` : ''}Inicia sesión para ver y descargar este archivo.</div>`;
      actions = `<a class="btn btn--accent" href="${loginUrl('register')}">Crear cuenta gratis</a><a class="btn btn--ghost" href="${loginUrl()}">Ya tengo cuenta</a>`;
    } else if (m.state === 'xp') {
      viewer = `<div class="viewer viewer--empty">Bloqueado: te faltan ${m.need - m.have} XP (tienes ${m.have} de ${m.need}).<br>Responde la misión diaria para juntar más.</div>`;
      actions = '<a class="btn btn--accent" href="/mision.html">Ir a la misión de hoy</a>';
    } else {
      viewer = '<div class="viewer viewer--empty">Archivo pendiente: todavía no se ha subido.</div>';
    }

    dlg.className = `dialog ${secClass(a.section)}`;
    dlg.innerHTML = `<div class="dialog__bar"><h3>${esc(a.title)}</h3><button class="btn btn--sm btn--ghost" type="button" id="dlg-close">Cerrar</button></div>
      <div class="dialog__body">
        ${viewer}
        <p><span class="chip">${esc(KIND_LABEL[a.kind] || a.kind)}</span> <span class="chip chip--plain">${esc(a.category)}</span>
        ${a.topic ? `<a class="chip chip--plain" href="/tema.html?t=${encodeURIComponent(a.topic.slug)}">${esc(a.topic.name)}</a>` : ''}</p>
        ${a.description ? `<p>${esc(a.description)}</p>` : ''}
        <p class="muted small">${a.downloads} descargas${a.min_xp ? ` · requiere ${a.min_xp} XP` : ''}</p>
        <div class="dialog__actions">${actions}</div>
      </div>`;
    $('#dlg-close', dlg).addEventListener('click', () => dlg.close());
    dlg.showModal();
  }

  /* ---------- páginas ---------- */
  const pages = {};

  function renderTicket(mission) {
    const el = $('#ticket');
    if (!el) return;
    const me = MF.me, q = mission.question;
    const streak = me ? me.streak : 0;
    let body;
    if (!q) body = '<p>Hoy no hay pregunta. Vuelve pronto.</p>';
    else if (mission.answered) {
      body = `<p>${mission.answered.correct ? '¡Misión cumplida!' : 'Misión hecha, pero fallaste.'} Ganaste <b>${mission.answered.xp_gained} XP</b>. La próxima pregunta aparece mañana.</p>
        <div class="ticket__meta"><span class="muted small">Tu racha sigue viva</span><a class="btn btn--sm" href="/mision.html">Ver ranking</a></div>`;
    } else {
      body = `<p>${esc(q.text)}</p>
        <div class="ticket__meta"><span class="chip">+${q.xp} XP</span>
        ${me ? '<a class="btn btn--accent btn--sm" href="/mision.html">Responder ahora</a>' : `<a class="btn btn--accent btn--sm" href="${loginUrl('register')}">Entrar para responder</a>`}</div>`;
    }
    el.innerHTML = `<div class="ticket__top"><div><div class="ticket__title">Misión de hoy</div><span class="muted small">${q && q.topic ? esc(q.topic) : 'Una pregunta por día'}</span></div>
      <div class="ticket__streak"><b>${streak}</b><span>días de racha</span></div></div>
      <div class="ticket__q">${body}</div>`;
  }

  function moreLabel() {
    return MF.me ? 'Leer completo' : '<i class="lock" aria-hidden="true"></i> Inicia sesión para leer completo';
  }

  function leadStory(a) {
    const img = a.image ? `<img src="${esc(a.image)}" alt="">` : '<span></span>';
    return `<a class="lead ${secClass(a.section)}" href="/articulo.html?id=${a.id}">
      <div class="lead__img">${img}</div>
      <div class="lead__body">
        <div class="news-card__meta"><span class="chip chip--solid">Última noticia</span>${a.topic ? `<span class="chip">${esc(a.topic.name)}</span>` : ''}<span>${esc(fmtDate(a.created_at))}</span></div>
        <h2>${esc(a.title)}</h2>
        <p>${esc(a.excerpt)}</p>
        <span class="news-card__more">${moreLabel()}</span>
      </div></a>`;
  }

  function headlineItem(a, showTopic = true) {
    const thumb = a.image ? `<img src="${esc(a.image)}" alt="" loading="lazy">` : '<span></span>';
    return `<a class="headline ${secClass(a.section)}" href="/articulo.html?id=${a.id}">
      <span class="headline__thumb">${thumb}</span>
      <span class="headline__text"><span class="headline__meta">${showTopic && a.topic ? esc(a.topic.name) + ' · ' : ''}${esc(fmtDate(a.created_at))}</span>
      <strong>${esc(a.title)}</strong></span></a>`;
  }

  pages.home = async () => {
    const meta = MF.meta, me = MF.me;
    $('#hero-cta').innerHTML = me
      ? '<a class="btn btn--accent" href="/noticias.html">Todas las noticias</a>'
      : `<a class="btn btn--accent" href="${loginUrl('register')}">Crear cuenta gratis</a><a class="btn btn--ghost" href="${loginUrl()}">Iniciar sesión</a>`;
    $('#topic-strip').innerHTML = meta.topics.map((t) => `<a class="chip chip--plain" href="/tema.html?t=${encodeURIComponent(t.slug)}">${esc(t.name)}</a>`).join('');

    const [latest, drop, assets, mission, ...bySection] = await Promise.all([
      api('/api/articles?limit=10'), api('/api/drop'), api('/api/assets?limit=4'), api('/api/mission'),
      ...SECTION_ORDER.map((k) => api(`/api/articles?section=${k}&limit=3`))
    ]);

    // Portada: la más reciente + titulares
    const items = latest.items;
    if (items.length) {
      $('#lead').innerHTML = leadStory(items[0]);
      const side = items.slice(1, 5);
      $('#headlines').innerHTML = side.length ? side.map((a) => headlineItem(a)).join('') : '<p class="muted small">Pronto habrá más noticias.</p>';
    } else {
      $('#lead').innerHTML = empty('Aún no hay noticias. Publica la primera desde el panel de administración.');
      $('#headlines').innerHTML = '';
    }

    // Noticias por sección
    $('#sec-cols').innerHTML = SECTION_ORDER.map((k, i) => {
      const s = meta.sections[k], list = bySection[i].items;
      return `<div class="sec-col ${secClass(k)}">
        <div class="sec-col__head"><h3>${esc(s.name)}</h3><a href="/seccion.html?s=${k}">Ver todo</a></div>
        ${list.length ? list.map((a) => headlineItem(a)).join('') : '<p class="muted small">Todavía no hay noticias en esta sección.</p>'}
      </div>`;
    }).join('');

    // Últimas publicaciones (resto, sin repetir la portada)
    const rest = items.slice(5);
    $('#latest').hidden = rest.length < 3;
    $('#news-grid').innerHTML = rest.map(newsCard).join('');

    // Extras: misión, asset del día, biblioteca
    renderTicket(mission);
    const d = drop.asset;
    $('#drop').innerHTML = d ? `<img src="${esc(d.thumb)}" alt="">
      <div class="drop__body ${secClass(d.section)}"><span class="chip">Asset del día · ${esc(d.category)}${d.topic ? ' · ' + esc(d.topic.name) : ''}</span>
        <h3>${esc(d.title)}</h3><p class="muted">${esc(d.description || '')}</p>
        <button class="btn btn--accent" type="button" data-asset="${d.id}">${me ? 'Ver y descargar' : 'Ver detalles'}</button></div>` : empty('Cuando haya assets, uno se destacará cada día.');
    $('#assets-grid').innerHTML = assets.items.length ? assets.items.map(assetCard).join('') : empty('La biblioteca está vacía.');
    bindAssetCards();

    $('#perks').hidden = !!me;
  };

  pages.news = async () => {
    const params = qs();
    const state = { section: params.get('s') || '', topic: params.get('t') || '', q: params.get('q') || '', offset: 0 };
    const grid = $('#news-grid'), more = $('#news-more'), count = $('#news-count');
    const secSel = $('#f-section'), topSel = $('#f-topic'), search = $('#f-q');
    secSel.innerHTML = '<option value="">Todas las secciones</option>' + SECTION_ORDER.map((k) => `<option value="${k}">${esc(MF.meta.sections[k].name)}</option>`).join('');
    const fillTopics = () => {
      const list = MF.meta.topics.filter((t) => !state.section || t.section === state.section);
      topSel.innerHTML = '<option value="">Todos los temas</option>' + list.map((t) => `<option value="${esc(t.slug)}">${esc(t.name)}</option>`).join('');
      if (!list.some((t) => t.slug === state.topic)) state.topic = '';
      topSel.value = state.topic;
    };
    secSel.value = state.section; fillTopics(); search.value = state.q;

    async function load(reset) {
      if (reset) { state.offset = 0; grid.innerHTML = ''; }
      const p = new URLSearchParams({ limit: 9, offset: state.offset });
      if (state.section) p.set('section', state.section);
      if (state.topic) p.set('topic', state.topic);
      if (state.q) p.set('q', state.q);
      const data = await api(`/api/articles?${p}`);
      if (reset && !data.items.length) grid.innerHTML = empty('No encontramos noticias con esos filtros.');
      else grid.insertAdjacentHTML('beforeend', data.items.map(newsCard).join(''));
      state.offset += data.items.length;
      more.hidden = state.offset >= data.total;
      count.textContent = `${data.total} ${data.total === 1 ? 'noticia' : 'noticias'}`;
    }
    secSel.addEventListener('change', () => { state.section = secSel.value; fillTopics(); load(true); });
    topSel.addEventListener('change', () => { state.topic = topSel.value; load(true); });
    let timer;
    search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { state.q = search.value.trim(); load(true); }, 300); });
    more.addEventListener('click', () => load(false));
    await load(true);
    if (!MF.me) $('#news-gate').hidden = false;
  };

  pages.article = async () => {
    const id = Number(qs().get('id'));
    const root = $('#article');
    let data;
    try { data = await api(`/api/articles/${id}`); } catch (e) { root.innerHTML = empty(e.message); return; }
    const a = data.article;
    document.title = `${a.title} · ${MF.meta.site}`;
    root.className = `article ${secClass(a.section)}`;
    const sec = MF.meta.sections[a.section];
    const head = `<div class="crumbs"><a href="/noticias.html">Noticias</a> / <a href="/seccion.html?s=${esc(a.section)}">${esc(sec.name)}</a>${a.topic ? ` / <a href="/tema.html?t=${encodeURIComponent(a.topic.slug)}">${esc(a.topic.name)}</a>` : ''}</div>
      <h1 style="font-size:clamp(2rem,5vw,3.4rem)">${esc(a.title)}</h1>
      <p class="muted" style="margin-top:14px">${esc(fmtDate(a.created_at))}</p>
      ${a.image ? `<img class="article__img" src="${esc(a.image)}" alt="">` : '<div style="height:28px"></div>'}`;
    if (data.locked) {
      root.innerHTML = `${head}<p class="article__lead">${esc(a.excerpt)}</p>
        <div class="paywall"><div class="paywall__fade"></div></div>
        <div class="gate"><div><h3>Sigue leyendo con una cuenta gratis</h3><p>Crea tu cuenta o inicia sesión para leer la noticia completa, descargar assets y sumar XP con la misión diaria.</p></div>
        <div class="hero__cta"><a class="btn" href="${loginUrl('register')}">Crear cuenta</a><a class="btn" href="${loginUrl()}">Iniciar sesión</a></div></div>`;
    } else {
      root.innerHTML = `${head}<div class="prose">${formatProse(a.content)}</div>`;
      if (a.topic) {
        const rel = await api(`/api/articles?topic=${encodeURIComponent(a.topic.slug)}&limit=4`);
        const others = rel.items.filter((x) => x.id !== a.id).slice(0, 3);
        if (others.length) root.insertAdjacentHTML('beforeend', `<div class="block"><h2>Más de ${esc(a.topic.name)}</h2><div class="grid grid--news" style="margin-top:20px">${others.map(newsCard).join('')}</div></div>`);
      }
    }
  };

  pages.section = async () => {
    const key = qs().get('s');
    const sec = MF.meta.sections[key];
    if (!sec) { $('#section-root').innerHTML = `<div class="wrap">${empty('Esa sección no existe.')}</div>`; return; }
    document.title = `${sec.name} · ${MF.meta.site}`;
    document.body.className = secClass(key);
    $('#section-head').innerHTML = `<div class="wrap"><h1>${esc(sec.name)}</h1><p>${esc(sec.blurb)}</p></div>`;
    const topics = MF.meta.topics.filter((t) => t.section === key);
    $('#topics-grid').innerHTML = topics.length ? topics.map((t) => `<a class="topic-card" href="/tema.html?t=${encodeURIComponent(t.slug)}">
        <img src="${esc(t.cover)}" alt=""><div><h3>${esc(t.name)}</h3><p>${t.articles} noticias · ${t.assets} assets</p></div></a>`).join('') : empty('Aún no hay temas en esta sección. Créalos desde el panel de administración.');
    const [news, assets] = await Promise.all([api(`/api/articles?section=${key}&limit=6`), api(`/api/assets?section=${key}&limit=100`)]);
    $('#news-grid').innerHTML = news.items.length ? news.items.map(newsCard).join('') : empty('Todavía no hay noticias en esta sección.');
    $('#assets-root').innerHTML = categoryRows(assets.items, sec.categories);
    bindAssetCards();
  };

  pages.topic = async () => {
    const slug = qs().get('t');
    const t = topicBySlug(slug);
    if (!t) { $('#topic-root').innerHTML = `<div class="wrap">${empty('Ese tema no existe.')}</div>`; return; }
    const sec = MF.meta.sections[t.section];
    document.title = `${t.name} · ${MF.meta.site}`;
    document.body.className = secClass(t.section);
    $('#topic-head').innerHTML = `<div class="wrap"><div class="crumbs"><a href="/seccion.html?s=${esc(t.section)}">${esc(sec.name)}</a> / <span>${esc(t.name)}</span></div>
      <div class="topic-hero">${t.cover ? `<img src="${esc(t.cover)}" alt="">` : '<span></span>'}<div><h1>${esc(t.name)}</h1><p>${esc(t.description)}</p></div></div></div>`;
    const [news, assets] = await Promise.all([api(`/api/articles?topic=${encodeURIComponent(slug)}&limit=12`), api(`/api/assets?topic=${encodeURIComponent(slug)}&limit=100`)]);
    $('#news-grid').innerHTML = news.items.length ? news.items.map(newsCard).join('') : empty('Todavía no hay noticias de este tema.');
    $('#assets-root').innerHTML = categoryRows(assets.items, sec.categories);
    bindAssetCards();
  };

  pages.library = async () => {
    const params = qs();
    const state = { section: params.get('s') || '', topic: params.get('t') || '', kind: params.get('k') || '', category: params.get('c') || '', q: params.get('q') || '', offset: 0 };
    const grid = $('#assets-grid'), more = $('#assets-more'), count = $('#assets-count');
    const f = { s: $('#f-section'), t: $('#f-topic'), k: $('#f-kind'), c: $('#f-category'), q: $('#f-q') };
    f.s.innerHTML = '<option value="">Todas las secciones</option>' + SECTION_ORDER.map((k) => `<option value="${k}">${esc(MF.meta.sections[k].name)}</option>`).join('');
    f.k.innerHTML = '<option value="">Todos los tipos</option>' + Object.entries(KIND_LABEL).map(([k, l]) => `<option value="${k}">${l}</option>`).join('');

    const fillDependent = () => {
      const topics = MF.meta.topics.filter((t) => !state.section || t.section === state.section);
      f.t.innerHTML = '<option value="">Todos los temas</option>' + topics.map((t) => `<option value="${esc(t.slug)}">${esc(t.name)}</option>`).join('');
      if (!topics.some((t) => t.slug === state.topic)) state.topic = '';
      f.t.value = state.topic;
      const cats = [...new Set((state.section ? MF.meta.sections[state.section].categories : SECTION_ORDER.flatMap((k) => MF.meta.sections[k].categories)))];
      f.c.innerHTML = '<option value="">Todas las categorías</option>' + cats.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
      if (state.category && !cats.includes(state.category)) f.c.insertAdjacentHTML('beforeend', `<option value="${esc(state.category)}">${esc(state.category)}</option>`);
      f.c.value = state.category;
    };
    f.s.value = state.section; f.k.value = state.kind; f.q.value = state.q; fillDependent();

    async function load(reset) {
      if (reset) { state.offset = 0; grid.innerHTML = ''; }
      const p = new URLSearchParams({ limit: 24, offset: state.offset });
      if (state.section) p.set('section', state.section);
      if (state.topic) p.set('topic', state.topic);
      if (state.kind) p.set('kind', state.kind);
      if (state.category) p.set('category', state.category);
      if (state.q) p.set('q', state.q);
      const data = await api(`/api/assets?${p}`);
      if (reset && !data.items.length) grid.innerHTML = empty('No hay assets con esos filtros.');
      else grid.insertAdjacentHTML('beforeend', data.items.map(assetCard).join(''));
      bindAssetCards(grid);
      state.offset += data.items.length;
      more.hidden = state.offset >= data.total;
      count.textContent = `${data.total} ${data.total === 1 ? 'asset' : 'assets'}`;
    }
    f.s.addEventListener('change', () => { state.section = f.s.value; fillDependent(); load(true); });
    f.t.addEventListener('change', () => { state.topic = f.t.value; load(true); });
    f.k.addEventListener('change', () => { state.kind = f.k.value; load(true); });
    f.c.addEventListener('change', () => { state.category = f.c.value; load(true); });
    let timer;
    f.q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { state.q = f.q.value.trim(); load(true); }, 300); });
    more.addEventListener('click', () => load(false));
    await load(true);
    if (!MF.me) $('#library-gate').hidden = false;
  };

  pages.shop = async () => {
    const root = $('#products');
    const data = await api('/api/products');
    if (!data.items.length) { root.innerHTML = empty('Todavía no hay productos a la venta.'); return; }
    root.innerHTML = data.items.map((p) => {
      const out = p.stock <= 0;
      return `<article class="product ${secClass(p.section)}">
        ${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : ''}
        <div class="product__body">
          ${p.topic ? `<span class="chip" style="align-self:flex-start">${esc(p.topic.name)}</span>` : ''}
          <h3>${esc(p.name)}</h3>
          <p class="muted small" style="margin:0">${esc(p.description)}</p>
          <div class="product__price">${esc(fmtMoney(p.price))}</div>
          <div class="product__stock ${p.stock > 0 && p.stock <= 5 ? 'product__stock--low' : ''}">${out ? 'Agotado' : p.stock <= 5 ? `Quedan ${p.stock}` : `${p.stock} disponibles`}</div>
          <button class="btn" type="button" data-buy="${p.id}" ${out ? 'disabled' : ''}>${out ? 'Agotado' : 'Pedir'}</button>
        </div></article>`;
    }).join('');

    const items = Object.fromEntries(data.items.map((p) => [p.id, p]));
    $$('[data-buy]', root).forEach((btn) => btn.addEventListener('click', () => {
      if (!MF.me) { location.href = loginUrl(); return; }
      openOrderDialog(items[btn.dataset.buy]);
    }));
  };

  function openOrderDialog(p) {
    let dlg = $('#order-dialog');
    if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'order-dialog'; dlg.className = 'dialog'; dlg.style.maxWidth = '460px'; document.body.append(dlg); }
    dlg.innerHTML = `<div class="dialog__bar"><h3>Pedir: ${esc(p.name)}</h3><button class="btn btn--sm btn--ghost" type="button" id="od-close">Cerrar</button></div>
      <form class="dialog__body" id="order-form">
        <p class="muted">${esc(fmtMoney(p.price))} por unidad · ${p.stock} disponibles</p>
        <div class="field"><label for="od-qty">Cantidad</label><input id="od-qty" name="qty" type="number" min="1" max="${Math.min(20, p.stock)}" value="1" required></div>
        <p id="od-total" style="font-weight:700"></p><p class="form-error" id="od-err" role="alert"></p>
        <button class="btn btn--accent" type="submit">Confirmar pedido</button>
      </form>`;
    const qty = $('#od-qty', dlg), total = $('#od-total', dlg);
    const upd = () => { total.textContent = `Total: ${fmtMoney(p.price * (Number(qty.value) || 0))}`; };
    qty.addEventListener('input', upd); upd();
    $('#od-close', dlg).addEventListener('click', () => dlg.close());
    $('#order-form', dlg).addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = e.submitter; btn.disabled = true;
      try {
        const r = await api('/api/orders', { method: 'POST', body: { product_id: p.id, qty: Number(qty.value) } });
        dlg.close();
        toast(`Pedido #${r.order.id}. ${r.message}`, 'ok');
        pages.shop();
      } catch (err) { $('#od-err', dlg).textContent = err.message; btn.disabled = false; }
    });
    dlg.showModal();
  }

  pages.mission = async () => {
    const me = MF.me;
    const m = await api('/api/mission');
    const q = m.question;
    const quiz = $('#quiz');

    function renderQuiz(answered) {
      if (!q) { quiz.innerHTML = `<h2>Misión de hoy</h2>${empty('Hoy no hay pregunta disponible. Vuelve mañana.')}`; return; }
      const keys = ['A', 'B', 'C', 'D'];
      quiz.innerHTML = `<h2>Misión de hoy</h2>
        <span class="chip">${q.topic ? esc(q.topic) + ' · ' : ''}+${q.xp} XP</span>
        <p class="quiz__q">${esc(q.text)}</p>
        <div class="options">${q.options.map((o, i) => {
          let cls = '';
          if (answered) { if (i === answered.correct_index) cls = ' option--right'; else if (i === answered.choice) cls = ' option--wrong'; }
          return `<button class="option${cls}" type="button" data-choice="${i}" ${answered ? 'disabled' : ''}><span class="option__key">${keys[i]}</span>${esc(o)}</button>`;
        }).join('')}</div>
        <div id="quiz-result"></div>
        ${me ? '' : `<div class="gate" style="margin-top:20px"><div><h3>Entra para jugar</h3><p>Crea tu cuenta gratis para responder, sumar XP y subir en el ranking.</p></div><a class="btn" href="${loginUrl('register')}">Crear cuenta</a></div>`}`;
      if (answered) showResult(answered);
      $$('[data-choice]', quiz).forEach((b) => b.addEventListener('click', () => answer(Number(b.dataset.choice))));
    }

    function showResult(r) {
      const unlocked = r.unlocked && r.unlocked.length ? ` Desbloqueaste: ${r.unlocked.join(', ')}.` : '';
      $('#quiz-result').innerHTML = `<div class="result">${r.correct ? '¡Correcto!' : 'Esta vez no fue.'} Ganaste ${r.xp_gained} XP.${esc(unlocked)} Vuelve mañana para mantener tu racha.</div>`;
    }

    async function answer(choice) {
      if (!me) { location.href = loginUrl('register'); return; }
      $$('[data-choice]', quiz).forEach((b) => { b.disabled = true; });
      try {
        const r = await api('/api/mission/answer', { method: 'POST', body: { choice } });
        MF.me.xp = r.xp; MF.me.streak = r.streak;
        renderHeader();
        renderQuiz({ choice, ...r });
        renderProgress(r.xp, r.streak);
        const lb = await api('/api/mission'); renderBoard(lb.leaderboard); renderNext(lb.next_unlock, r.xp);
      } catch (err) { toast(err.message, 'error'); renderQuiz(m.answered); }
    }

    function renderProgress(xp, streak) {
      $('#my-stats').innerHTML = me ? `<div class="stats3"><div class="stat"><b>${xp}</b><span>XP</span></div><div class="stat"><b>${streak}</b><span>racha</span></div><div class="stat"><b>${me.best_streak > streak ? me.best_streak : streak}</b><span>mejor racha</span></div></div>` : '';
    }

    function renderNext(next, xp) {
      $('#next-unlock').innerHTML = next ? `<p class="small" style="margin:0">Próximo desbloqueo: <b>${esc(next.title)}</b></p>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${next.min_xp}" aria-valuenow="${Math.min(xp, next.min_xp)}"><i style="width:${Math.min(100, Math.round((xp / next.min_xp) * 100))}%"></i></div>
        <p class="muted small" style="margin:0">${Math.min(xp, next.min_xp)} / ${next.min_xp} XP</p>` : '<p class="muted small" style="margin:0">No hay assets bloqueados por XP por ahora.</p>';
    }

    function renderBoard(list) {
      $('#board').innerHTML = list.length ? `<table class="board"><thead><tr><th></th><th>Jugador</th><th>Racha</th><th>XP</th></tr></thead><tbody>${list.map((r, i) =>
        `<tr class="${me && r.username === me.username ? 'me' : ''}"><td class="rank">${i + 1}</td><td><a href="/perfil.html?u=${encodeURIComponent(r.username)}">${esc(r.username)}</a></td><td>${r.streak}</td><td>${r.xp}</td></tr>`).join('')}</tbody></table>` : empty('Nadie ha sumado XP todavía. Sé el primero.');
    }

    renderQuiz(m.answered);
    renderProgress(me ? me.xp : 0, me ? me.streak : 0);
    renderNext(m.next_unlock, me ? me.xp : 0);
    renderBoard(m.leaderboard);
  };

  pages.login = async () => {
    const params = qs();
    let next = params.get('next') || '/';
    if (!next.startsWith('/') || next.startsWith('//')) next = '/';
    if (MF.me) { location.replace(next); return; }
    const tabs = $$('[data-tab]'), forms = { login: $('#form-login'), register: $('#form-register') };
    const show = (name) => {
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
      for (const [k, f] of Object.entries(forms)) f.hidden = k !== name;
    };
    tabs.forEach((t) => t.addEventListener('click', () => show(t.dataset.tab)));
    show(params.get('tab') === 'register' ? 'register' : 'login');

    async function submit(form, path, body) {
      const err = $('.form-error', form), btn = $('button[type=submit]', form);
      err.textContent = ''; btn.disabled = true;
      try { await api(path, { method: 'POST', body }); location.href = next; }
      catch (e) { err.textContent = e.message; btn.disabled = false; }
    }
    forms.login.addEventListener('submit', (e) => {
      e.preventDefault();
      submit(forms.login, '/api/login', { identifier: $('[name=identifier]', forms.login).value, password: $('[name=password]', forms.login).value });
    });
    forms.register.addEventListener('submit', (e) => {
      e.preventDefault();
      const g = (n) => $(`[name=${n}]`, forms.register).value;
      submit(forms.register, '/api/register', { username: g('username'), email: g('email'), password: g('password') });
    });
  };

  pages.account = async () => {
    if (!MF.me) { location.replace(loginUrl()); return; }
    const me = MF.me;
    $('#account-info').innerHTML = `<div class="stats3"><div class="stat"><b>${me.xp}</b><span>XP</span></div><div class="stat"><b>${me.streak}</b><span>racha</span></div><div class="stat"><b>${me.best_streak}</b><span>mejor racha</span></div></div>
      <p><b>${esc(me.username)}</b> · ${esc(me.email)} ${me.role === 'admin' ? '<span class="chip">Admin</span>' : ''}</p>
      ${me.role === 'admin' ? '<p><a class="btn btn--sm" href="/admin.html">Abrir panel de administración</a></p>' : ''}`;
    const orders = await api('/api/orders');
    $('#orders').innerHTML = orders.items.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>#</th><th>Producto</th><th>Cant.</th><th>Total</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>${orders.items.map((o) =>
      `<tr><td>${o.id}</td><td>${esc(o.product_name)}</td><td>${o.qty}</td><td>${esc(fmtMoney(o.total))}</td><td><span class="status-pill">${esc(o.status)}</span></td><td>${esc(fmtDate(o.created_at))}</td></tr>`).join('')}</tbody></table></div>` : empty('Aún no has hecho pedidos.');
    $('#pw-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.currentTarget, msg = $('#pw-msg');
      msg.className = 'form-error'; msg.textContent = '';
      try {
        await api('/api/me/password', { method: 'PUT', body: { current: f.current.value, next: f.next.value } });
        msg.className = 'form-ok'; msg.textContent = 'Contraseña actualizada.'; f.reset();
      } catch (err) { msg.textContent = err.message; }
    });
  };

  /* ---------- arranque ---------- */
  MF.api = api; MF.esc = esc; MF.toast = toast; MF.fmtDate = fmtDate; MF.fmtMoney = fmtMoney; MF.renderHeader = renderHeader;
  MF.avatar = avatarHtml; MF.loginUrl = loginUrl; MF.empty = empty; MF.secClass = secClass; MF.qs = qs;

  function loadScript(src) {
    return new Promise((resolve) => {
      const el = document.createElement('script');
      el.src = src; el.onload = resolve; el.onerror = resolve;
      document.head.append(el);
    });
  }

  MF.ready = (async () => {
    try {
      const [me, meta] = await Promise.all([api('/api/me'), api('/api/meta')]);
      MF.me = me.user; MF.meta = meta;
    } catch (err) {
      const main = $('#main') || document.body;
      main.innerHTML = `<div class="wrap"><div class="empty" style="margin-top:40px">No se pudo conectar con el servidor. Inicia el sitio con <b>npm start</b> y abre <b>http://localhost:3000</b>.</div></div>`;
      throw err;
    }
    if (MF.me && MF.me.theme && window.FWTheme) FWTheme.adoptServer(MF.me.theme);
    let wantsMusic = false;
    try { wantsMusic = !!localStorage.getItem('fw_spotify') || document.body.dataset.page === 'listen'; } catch { /* sin almacenamiento */ }
    if (wantsMusic) await loadScript('/js/music.js');
    renderHeader();
    renderFooter();
    loadScript('/js/theme-ui.js');
    loadScript('/js/chat.js');
    const fn = pages[document.body.dataset.page];
    if (fn) { try { await fn(); } catch (err) { console.error(err); toast(err.message || 'Algo salió mal.', 'error'); } }
  })();
})();
