/* FandomWire — asistente flotante (Claude si el servidor tiene clave; modo básico si no) */
(() => {
  'use strict';
  if (window.__fwChat || !window.MF || !MF.meta) return;
  window.__fwChat = true;
  const esc = MF.esc;
  const KEY = 'fw_chat';
  const SUGGEST = ['¿Qué hay de nuevo?', '¿Cómo gano XP?', 'Cuéntame de JoJo', '¿Cómo sincronizo la letra?'];
  let msgs = [];
  try { msgs = JSON.parse(sessionStorage.getItem(KEY)) || []; } catch { msgs = []; }
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30))); } catch { /* sin almacenamiento */ } };

  const fab = document.createElement('button');
  fab.className = 'chat-fab'; fab.type = 'button';
  fab.setAttribute('aria-label', 'Abrir asistente'); fab.setAttribute('aria-expanded', 'false');
  fab.innerHTML = '<span aria-hidden="true">💬</span>';
  const panel = document.createElement('section');
  panel.className = 'chat'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Asistente');
  panel.innerHTML = `
    <header class="chat__bar"><div><strong>Asistente</strong> <span class="chat__badge">${MF.meta.chat && MF.meta.chat.ai ? 'IA' : 'Básico'}</span></div>
      <div><button class="iconbtn" type="button" data-clear aria-label="Borrar conversación" title="Borrar conversación">🗑</button><button class="iconbtn" type="button" data-close aria-label="Cerrar">✕</button></div></header>
    <div class="chat__log" role="log" aria-live="polite"></div>
    <div class="chat__sugg"></div>
    <form class="chat__form"><label class="sr-only" for="chat-in">Tu mensaje</label><input id="chat-in" type="text" maxlength="500" autocomplete="off" placeholder="Pregunta lo que quieras…"><button class="btn btn--sm btn--accent" type="submit">Enviar</button></form>`;
  document.body.append(fab, panel);
  const log = panel.querySelector('.chat__log'), form = panel.querySelector('form'), input = panel.querySelector('input'), sugg = panel.querySelector('.chat__sugg');

  const PATH = /(\/(?:articulo|tema|seccion|noticias|biblioteca|ventas|mision|juegos|escuchando|cuenta|perfil)\.html[^\s<)"']*)/g;
  function fmt(text) {
    return esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(PATH, '<a href="$1">$1</a>').replace(/\n/g, '<br>');
  }
  function bubble(m) {
    const links = (m.links || []).map((l) => `<a class="chip chip--plain" href="${esc(l.url)}">${esc(l.title)}</a>`).join('');
    return `<div class="msg msg--${m.role === 'user' ? 'me' : 'bot'}"><div class="msg__text">${m.role === 'user' ? esc(m.content).replace(/\n/g, '<br>') : fmt(m.content)}</div>${links ? `<div class="msg__links">${links}</div>` : ''}${m.note ? `<small class="muted">${esc(m.note)}</small>` : ''}</div>`;
  }
  function paint() {
    if (!msgs.length) {
      log.innerHTML = `<div class="msg msg--bot"><div class="msg__text">¡Hola! Soy el asistente de ${esc(MF.meta.site)}. Pregúntame por las noticias de cada fandom, la misión diaria, los minijuegos o cómo vincular tu música.</div></div>`;
    } else log.innerHTML = msgs.map(bubble).join('');
    sugg.innerHTML = msgs.length ? '' : SUGGEST.map((s) => `<button type="button" class="chip chip--plain" data-s="${esc(s)}">${esc(s)}</button>`).join('');
    log.scrollTop = log.scrollHeight;
  }

  let busy = false;
  async function send(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    msgs.push({ role: 'user', content: text }); save(); paint();
    log.insertAdjacentHTML('beforeend', '<div class="msg msg--bot" id="typing"><div class="msg__text typing"><i></i><i></i><i></i></div></div>');
    log.scrollTop = log.scrollHeight;
    try {
      const r = await MF.api('/api/chat', { method: 'POST', body: { messages: msgs.map(({ role, content }) => ({ role, content })) } });
      msgs.push({ role: 'assistant', content: r.reply, links: (r.links || []).slice(0, 3), note: r.note || '' });
    } catch (err) {
      msgs.push({ role: 'assistant', content: err.status === 429 ? 'Estás escribiendo muy rápido. Espera un momento y vuelve a intentar.' : 'No pude responder ahora. Intenta de nuevo en unos segundos.' });
    }
    busy = false; save(); paint();
  }

  const open = () => { panel.hidden = false; fab.setAttribute('aria-expanded', 'true'); paint(); input.focus(); };
  const close = () => { panel.hidden = true; fab.setAttribute('aria-expanded', 'false'); fab.focus(); };
  fab.addEventListener('click', () => (panel.hidden ? open() : close()));
  panel.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) close();
    if (e.target.closest('[data-clear]')) { msgs = []; save(); paint(); }
    const s = e.target.closest('[data-s]');
    if (s) send(s.dataset.s);
  });
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  form.addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; send(v); });
})();
