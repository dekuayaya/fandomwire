/* FandomWire — temas de color. Se carga en <head> (sin defer) para pintar con tus colores desde el primer instante. */
(() => {
  'use strict';
  const KEY = 'fw_theme';
  const KEYS = ['paper', 'card', 'ink', 'muted', 'line', 'series', 'musica', 'juegos'];
  const LABELS = {
    paper: 'Fondo', card: 'Tarjetas', ink: 'Texto y bordes', muted: 'Texto suave', line: 'Líneas suaves',
    series: 'Color de Series', musica: 'Color de Música', juegos: 'Color de Videojuegos'
  };
  const DEFAULTS = { paper: '#edebf8', card: '#ffffff', ink: '#1b1840', muted: '#5b5882', line: '#c9c5e8', series: '#ff6a2b', musica: '#4a3bff', juegos: '#00b77b' };
  const PRESETS = {
    clasico: { name: 'Clásico', colors: {} },
    oscuro: { name: 'Noche', colors: { paper: '#14122b', card: '#1e1b3d', ink: '#f1efff', muted: '#a7a3d6', line: '#38336b', series: '#ff8a4d', musica: '#8277ff', juegos: '#2fd9a0' } },
    neon: { name: 'Neón', colors: { paper: '#07070f', card: '#10101f', ink: '#e8fff8', muted: '#8fb5aa', line: '#1f3a36', series: '#ff2e88', musica: '#00e5ff', juegos: '#b6ff00' } },
    atardecer: { name: 'Atardecer', colors: { paper: '#fff1e6', card: '#ffffff', ink: '#3b1a1a', muted: '#85504a', line: '#f2c9b0', series: '#ff5a3c', musica: '#c2255c', juegos: '#f59f00' } },
    oceano: { name: 'Océano', colors: { paper: '#e6f4fa', card: '#ffffff', ink: '#0b2a3d', muted: '#476b80', line: '#b9dbe9', series: '#0096c7', musica: '#3a56d4', juegos: '#00a896' } },
    bosque: { name: 'Bosque', colors: { paper: '#eef3e8', card: '#fbfdf8', ink: '#1d2b1a', muted: '#586b52', line: '#cddbc3', series: '#e07a1f', musica: '#5b6bd6', juegos: '#2e9e5b' } },
    retro: { name: 'Retro', colors: { paper: '#fdf6e3', card: '#fffdf5', ink: '#2b2b2b', muted: '#6b6455', line: '#e3d9bd', series: '#d9480f', musica: '#364fc7', juegos: '#2b8a3e' } }
  };
  const HEX = /^#[0-9a-f]{6}$/i;

  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = (h) => { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // Texto legible sobre un color de acento: el que más contraste dé.
  const onColor = (bg) => (contrast(bg, '#14122b') >= contrast(bg, '#ffffff') ? '#14122b' : '#ffffff');

  function sanitize(t) {
    if (!t || typeof t !== 'object') return null;
    const colors = {};
    for (const k of KEYS) if (t.colors && HEX.test(String(t.colors[k] || ''))) colors[k] = String(t.colors[k]).toLowerCase();
    return { preset: PRESETS[t.preset] ? t.preset : 'custom', colors };
  }

  function read() {
    try { return sanitize(JSON.parse(localStorage.getItem(KEY))); } catch { return null; }
  }
  function write(t) {
    try { if (t) localStorage.setItem(KEY, JSON.stringify(t)); else localStorage.removeItem(KEY); } catch { /* sin almacenamiento */ }
  }

  const full = (t) => ({ ...DEFAULTS, ...((t && t.colors) || {}) });

  function apply(t) {
    const root = document.documentElement;
    const c = full(t);
    for (const k of KEYS) {
      if (t && t.colors && t.colors[k]) root.style.setProperty(`--${k}`, c[k]); else root.style.removeProperty(`--${k}`);
    }
    for (const k of ['series', 'musica', 'juegos']) root.style.setProperty(`--on-${k}`, onColor(c[k]));
    root.style.setProperty('--on-ink', onColor(c.ink));
    root.style.colorScheme = lum(c.paper) < 0.25 ? 'dark' : 'light';
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', c.paper);
  }

  let current = read();
  apply(current);

  window.FWTheme = {
    KEYS, LABELS, DEFAULTS, PRESETS, contrast, full, sanitize,
    current: () => current,
    set(t) { current = sanitize(t); write(current); apply(current); return current; },
    /** Aplica el tema guardado en el servidor (si la persona inició sesión en otro equipo). */
    adoptServer(t) {
      const s = sanitize(t);
      if (!s) return;
      if (JSON.stringify(s) !== JSON.stringify(current)) { current = s; write(s); apply(s); }
    }
  };
})();
