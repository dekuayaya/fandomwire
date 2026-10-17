'use strict';
const crypto = require('node:crypto');
const config = require('./config');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (message, status = 400) => new HttpError(status, message);

function slugify(text) {
  return String(text || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/* ---------- contraseñas (scrypt, sin dependencias) ---------- */
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function checkPassword(password, stored) {
  try {
    const [alg, saltHex, hashHex] = String(stored).split('$');
    if (alg !== 'scrypt') return false;
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/* ---------- fechas (zona horaria del sitio) ---------- */
function today() {
  return new Date().toLocaleDateString('en-CA', { timeZone: config.TZ }); // YYYY-MM-DD
}
function dayNumber(day) {
  return Math.floor(Date.parse(day + 'T00:00:00Z') / 86400000);
}
function previousDay(day) {
  return new Date(Date.parse(day + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
}

/* ---------- videos externos (YouTube / Vimeo) ---------- */
function embedUrl(raw) {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, '');
    let id = null;
    if (host === 'youtu.be') id = u.pathname.slice(1);
    else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      else if (/^\/(embed|shorts)\//.test(u.pathname)) id = u.pathname.split('/')[2];
    }
    if (id && /^[\w-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
    if (host === 'vimeo.com') {
      const vid = u.pathname.split('/').filter(Boolean)[0];
      if (/^\d+$/.test(vid || '')) return `https://player.vimeo.com/video/${vid}`;
    }
  } catch { /* url inválida */ }
  return null;
}

function youtubeId(raw) {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, '');
    let id = null;
    if (host === 'youtu.be') id = u.pathname.slice(1);
    else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      else if (/^\/(embed|shorts)\//.test(u.pathname)) id = u.pathname.split('/')[2];
    }
    return id && /^[\w-]{6,20}$/.test(id) ? id : null;
  } catch { return null; }
}

module.exports = { youtubeId, HttpError, fail, slugify, hashPassword, checkPassword, today, dayNumber, previousDay, embedUrl };
