/* FandomWire — Spotify: vinculación (OAuth PKCE en el navegador, sin secretos) y "ahora suena".
   Los tokens quedan solo en tu navegador (localStorage). El servidor nunca los ve. */
(() => {
  'use strict';
  if (window.FWMusic) return;
  const KEY = 'fw_spotify', PK = 'fw_spotify_pkce';
  const SCOPES = 'user-read-currently-playing user-read-playback-state';
  const API = 'https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode';
  const TOKEN_URL = 'https://accounts.spotify.com/api/token';
  const listeners = new Set();
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* sin almacenamiento */ } }
  };
  let tokens = null;
  try { tokens = JSON.parse(ls.get(KEY)); } catch { tokens = null; }
  if (tokens && !tokens.refresh) tokens = null;

  let track = null, state = { status: tokens ? 'connecting' : 'off' };
  let timer = null, fast = false, backoffUntil = 0, lastShareId = null, lastShareAt = 0;

  const clientId = () => (window.MF && MF.meta && MF.meta.music && MF.meta.music.spotify_client_id) || '';
  const redirectUri = () => `${location.origin}/escuchando.html`;

  const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const rand = (n) => b64url(crypto.getRandomValues(new Uint8Array(n))).slice(0, n);

  /* ---------- vinculación ---------- */
  async function connect() {
    if (!clientId()) throw new Error('Este sitio todavía no tiene configurado Spotify (falta SPOTIFY_CLIENT_ID).');
    if (!(window.crypto && crypto.subtle)) throw new Error('Spotify necesita que abras el sitio con https:// o desde 127.0.0.1.');
    const verifier = rand(64), st = rand(16);
    const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    try { sessionStorage.setItem(PK, JSON.stringify({ verifier, state: st })); } catch { throw new Error('Tu navegador bloquea el almacenamiento necesario para vincular.'); }
    const u = new URL('https://accounts.spotify.com/authorize');
    u.search = new URLSearchParams({
      client_id: clientId(), response_type: 'code', redirect_uri: redirectUri(), scope: SCOPES,
      code_challenge_method: 'S256', code_challenge: challenge, state: st
    }).toString();
    location.href = u.toString();
  }

  function store(d) {
    tokens = { access: d.access_token, refresh: d.refresh_token || (tokens && tokens.refresh), expires: Date.now() + (Math.max(60, d.expires_in || 3600) - 60) * 1000 };
    ls.set(KEY, JSON.stringify(tokens));
  }

  async function handleCallback() {
    const p = new URLSearchParams(location.search);
    if (!p.has('code') && !p.has('error')) return null;
    history.replaceState(null, '', location.pathname);
    if (p.get('error')) return { error: p.get('error') === 'access_denied' ? 'Cancelaste la vinculación.' : 'Spotify devolvió un error al vincular.' };
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(PK)); sessionStorage.removeItem(PK); } catch { saved = null; }
    if (!saved || saved.state !== p.get('state')) return { error: 'La vinculación expiró o no coincide. Intenta de nuevo.' };
    let res;
    try {
      res = await fetch(TOKEN_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: clientId(), grant_type: 'authorization_code', code: p.get('code'), redirect_uri: redirectUri(), code_verifier: saved.verifier })
      });
    } catch { return { error: 'No se pudo contactar a Spotify.' }; }
    if (!res.ok) return { error: 'Spotify no aceptó la vinculación. Revisa que la dirección de redirección esté registrada en tu app.' };
    store(await res.json());
    state = { status: 'connecting' };
    start();
    return { ok: true };
  }

  async function refresh() {
    const res = await fetch(TOKEN_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokens.refresh, client_id: clientId() })
    });
    if (res.status === 400 || res.status === 401) { disconnect(); throw new Error('expired'); }
    if (!res.ok) throw new Error('token');
    store(await res.json());
  }

  async function accessToken() {
    if (!tokens) throw new Error('off');
    if (tokens.expires <= Date.now()) await refresh();
    return tokens.access;
  }

  function disconnect() {
    tokens = null; track = null; state = { status: 'off' };
    ls.del(KEY);
    clearTimeout(timer); timer = null;
    shareTrack(null, true);
    emit();
  }

  /* ---------- lectura de lo que suena ---------- */
  async function poll() {
    clearTimeout(timer);
    if (!tokens) return;
    if (Date.now() < backoffUntil) { schedule(); return; }
    const t0 = performance.now();
    try {
      const token = await accessToken();
      const res = await fetch(API, { headers: { Authorization: `Bearer ${token}` } });
      const t1 = performance.now();
      if (res.status === 401) { tokens.expires = 0; }
      else if (res.status === 403) { state = { status: 'forbidden' }; track = null; }
      else if (res.status === 429) { backoffUntil = Date.now() + (Number(res.headers.get('Retry-After')) || 10) * 1000; state = { status: 'limited' }; }
      else if (res.status === 204) { state = { status: 'idle' }; track = null; }
      else if (res.ok) {
        const d = await res.json();
        const it = d && d.item;
        if (!it) { state = { status: 'idle' }; track = null; }
        else {
          const imgs = (it.album && it.album.images) || it.images || [];
          const img = imgs.find((i) => i.width && i.width <= 320 && i.width >= 200) || imgs[1] || imgs[0];
          track = {
            id: it.id, title: it.name, album: (it.album && it.album.name) || (it.show && it.show.name) || '',
            artist: (it.artists || []).map((a) => a.name).join(', ') || (it.show && it.show.publisher) || '',
            art: img ? img.url : '', durationMs: it.duration_ms || 0, isPlaying: !!d.is_playing,
            progressMs: d.progress_ms || 0, at: (t0 + t1) / 2, type: it.type
          };
          state = { status: 'ok' };
        }
      } else { state = { status: 'error' }; }
    } catch (err) {
      if (!tokens) return;
      state = { status: navigator.onLine === false ? 'offline' : 'error' };
    }
    shareTrack(track);
    emit();
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    if (!tokens) return;
    const ms = document.hidden ? 30000 : fast ? 2500 : 10000;
    timer = setTimeout(poll, ms);
  }
  function start() { if (tokens && !timer) poll(); }

  /** Posición estimada de la canción, en ms (interpola entre consultas). */
  function position() {
    if (!track) return 0;
    const p = track.isPlaying ? track.progressMs + (performance.now() - track.at) : track.progressMs;
    return Math.max(0, track.durationMs ? Math.min(p, track.durationMs) : p);
  }

  /* ---------- compartir en el perfil (opcional) ---------- */
  function shareTrack(t, force) {
    if (!window.MF || !MF.me || !MF.me.share_np) return;
    const id = t ? t.id : null, now = Date.now();
    if (!force && id === lastShareId && (!t || now - lastShareAt < 4 * 60 * 1000)) return;
    if (!force && !t && lastShareId === null) return;
    lastShareId = id; lastShareAt = now;
    MF.api('/api/me/nowplaying', { method: 'POST', body: { track: t && t.isPlaying ? { title: t.title, artist: t.artist, art: t.art } : null } }).catch(() => {});
  }

  /* ---------- chip del encabezado ---------- */
  function paintChip() {
    const el = document.getElementById('np-chip');
    if (!el) return;
    if (!tokens || !track) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `<a href="/escuchando.html" title="Ahora suena: ${esc(track.title)} — ${esc(track.artist)}"><span aria-hidden="true">${track.isPlaying ? '🎵' : '⏸'}</span> <span class="np-chip__t">${esc(track.title)}</span><span class="np-chip__a"> · ${esc(track.artist)}</span></a>`;
  }

  function emit() { paintChip(); listeners.forEach((fn) => { try { fn(track, state); } catch { /* oyente con error */ } }); }
  function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  /* ---------- coincidencia con las canciones del sitio ---------- */
  const normTitle = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/\s-\s.*$/, ' ').replace(/\b(feat|ft)\.?\s.*$/, ' ')
    .replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();

  function matchSong(songs, t) {
    if (!t) return null;
    const title = normTitle(t.title), artist = normTitle(t.artist);
    let best = null, bestScore = 0;
    for (const s of songs) {
      if (normTitle(s.title) !== title || !title) continue;
      const sa = normTitle(s.artist);
      const score = 2 + (sa && (artist.includes(sa) || sa.includes(artist)) ? 1 : 0);
      if (score > bestScore) { best = s; bestScore = score; }
    }
    return best;
  }

  document.addEventListener('visibilitychange', () => { if (tokens) { if (!document.hidden) poll(); else schedule(); } });

  window.FWMusic = {
    connected: () => !!tokens, clientId, redirectUri, connect, handleCallback, disconnect, onChange,
    track: () => track, status: () => state, position, matchSong, normTitle, paintChip,
    setFast(v) { fast = !!v; if (tokens) schedule(); }, refreshNow: poll
  };
  if (tokens) start();
})();
