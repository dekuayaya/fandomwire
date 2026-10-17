/* FandomWire — panel "Personalizar colores" */
(() => {
  'use strict';
  if (!window.FWTheme || window.__fwThemeUi) return;
  window.__fwThemeUi = true;
  const T = FWTheme;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let dlg = null, saveTimer = null;

  function persist() {
    // Local al instante; en el servidor (si hay sesión) con un pequeño retraso.
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      if (!window.MF || !MF.me) return;
      try { await MF.api('/api/me/profile', { method: 'PUT', body: { theme: T.current() || '' } }); } catch { /* no crítico */ }
    }, 600);
  }

  function warnings(colors) {
    const out = [];
    if (T.contrast(colors.ink, colors.paper) < 4.5) out.push('El texto casi no se distingue del fondo.');
    if (T.contrast(colors.ink, colors.card) < 4.5) out.push('El texto casi no se distingue en las tarjetas.');
    if (T.contrast(colors.muted, colors.paper) < 3) out.push('El texto suave es muy tenue sobre el fondo.');
    return out;
  }

  function render() {
    const cur = T.current();
    const colors = T.full(cur);
    const activePreset = cur ? cur.preset : 'clasico';
    const w = warnings(colors);
    dlg.querySelector('.dialog__body').innerHTML = `
      <h4 class="theme__h">Temas listos</h4>
      <div class="theme__presets" role="group" aria-label="Temas listos">
        ${Object.entries(T.PRESETS).map(([id, p]) => {
          const c = T.full({ colors: p.colors });
          return `<button type="button" class="preset" data-preset="${id}" aria-pressed="${activePreset === id}">
            <span class="preset__sw" style="background:${c.paper};border-color:${c.ink}"><i style="background:${c.series}"></i><i style="background:${c.musica}"></i><i style="background:${c.juegos}"></i><b style="background:${c.card};border-color:${c.ink}"></b></span>
            <span>${esc(p.name)}</span></button>`;
        }).join('')}
      </div>
      <h4 class="theme__h">Tus colores</h4>
      <div class="theme__custom">
        ${T.KEYS.map((k) => `<label class="cpick"><input type="color" data-key="${k}" value="${colors[k]}"><span>${esc(T.LABELS[k])}</span><code>${colors[k]}</code></label>`).join('')}
      </div>
      <p class="form-error" id="theme-warn" role="status">${w.map(esc).join(' ')}</p>
      <div class="dialog__actions">
        <button class="btn btn--sm btn--ghost" type="button" data-random>🎲 Sorpréndeme</button>
        <button class="btn btn--sm btn--ghost" type="button" data-reset>Restablecer</button>
        <small class="muted">${window.MF && MF.me ? 'Se guarda en tu cuenta.' : 'Se guarda en este navegador. Con una cuenta, te acompaña a todos lados.'}</small>
      </div>`;
  }

  function setColors(colors, preset) {
    T.set({ preset: preset || 'custom', colors });
    persist();
    render();
  }

  function ensure() {
    if (dlg) return;
    dlg = document.createElement('dialog');
    dlg.className = 'dialog dialog--theme';
    dlg.setAttribute('aria-label', 'Personalizar colores');
    dlg.innerHTML = `<div class="dialog__bar"><h3>Personalizar colores</h3><button class="btn btn--sm btn--ghost" type="button" data-close>Cerrar</button></div><div class="dialog__body"></div>`;
    document.body.append(dlg);
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg || e.target.closest('[data-close]')) { dlg.close(); return; }
      const p = e.target.closest('[data-preset]');
      if (p) { const id = p.dataset.preset; setColors(id === 'clasico' ? {} : { ...T.PRESETS[id].colors }, id); return; }
      if (e.target.closest('[data-reset]')) { setColors({}, 'clasico'); return; }
      if (e.target.closest('[data-random]')) {
        const h = Math.floor(Math.random() * 360), dark = Math.random() < 0.4;
        const hsl = (hh, s, l) => {
          s /= 100; l /= 100; const a = s * Math.min(l, 1 - l);
          const f = (n) => { const k = (n + hh / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); };
          return `#${f(0)}${f(8)}${f(4)}`;
        };
        setColors({
          paper: dark ? hsl(h, 35, 9) : hsl(h, 55, 94), card: dark ? hsl(h, 30, 14) : '#ffffff',
          ink: dark ? hsl(h, 60, 94) : hsl(h, 55, 14), muted: dark ? hsl(h, 20, 68) : hsl(h, 20, 36), line: dark ? hsl(h, 25, 26) : hsl(h, 40, 82),
          series: hsl((h + 20) % 360, 90, dark ? 62 : 55), musica: hsl((h + 140) % 360, 80, dark ? 68 : 52), juegos: hsl((h + 250) % 360, 75, dark ? 58 : 42)
        });
      }
    });
    // Vista previa en vivo mientras arrastras el selector; guarda al soltar.
    dlg.addEventListener('input', (e) => {
      const inp = e.target.closest('input[type=color]');
      if (!inp) return;
      const colors = { ...(T.current() ? T.current().colors : {}) };
      const all = T.full(T.current());
      for (const k of T.KEYS) colors[k] = k === inp.dataset.key ? inp.value : all[k];
      T.set({ preset: 'custom', colors });
      inp.parentElement.querySelector('code').textContent = inp.value;
      dlg.querySelector('#theme-warn').textContent = warnings(T.full(T.current())).join(' ');
      persist();
    });
    dlg.addEventListener('change', (e) => { if (e.target.closest('input[type=color]')) render(); });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#theme-btn')) return;
    ensure(); render();
    if (!dlg.open) dlg.showModal();
  });
})();
