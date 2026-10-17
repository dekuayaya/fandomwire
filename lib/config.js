'use strict';
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

module.exports = {
  SITE_NAME: 'FandomWire',
  PORT: Number(process.env.PORT) || 3000,
  TZ: process.env.TZ_NAME || 'America/Santiago',
  CURRENCY: 'CLP',
  ORDER_NOTE: 'Pedido registrado. Te contactaremos para coordinar el pago y la entrega.',

  // Cuenta de administrador inicial (se crea solo si no existe ningún admin).
  ADMIN_USER: process.env.ADMIN_USER || 'admin',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@fandomwire.local',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin2026!',

  DIRS: {
    root: ROOT,
    data: process.env.DATA_DIR || path.join(ROOT, 'data'),
    public: path.join(ROOT, 'public'),
    uploads: path.join(ROOT, 'public', 'uploads'),       // imágenes públicas (portadas, miniaturas)
    placeholders: path.join(ROOT, 'public', 'placeholders'),
    assets: path.join(ROOT, 'private', 'assets')          // archivos protegidos: solo con sesión iniciada
  },

  // Chatbot con IA (opcional). Sin clave funciona en modo básico, buscando en las noticias del sitio.
  CHAT: {
    API_KEY: process.env.ANTHROPIC_API_KEY || '',
    MODEL: process.env.CHAT_MODEL || 'claude-haiku-5-5',
    BASE_URL: (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, '')
  },

  // Música: Client ID público de tu app de Spotify (Spotify Developer Dashboard). Sin él solo funciona el modo manual.
  MUSIC: { SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID || '' },

  // Perfil
  AVATAR_EMOJIS: ['🎧', '🎸', '🥁', '🎤', '🎹', '🎮', '🕹️', '⚽', '🐉', '⭐', '🔥', '⚡', '🌙', '👾', '🦊', '🐺', '🐱', '🐼', '🚀', '💎', '🎭', '🧠', '🍕', '👑'],
  AVATAR_COLORS: ['#ff6a2b', '#4a3bff', '#00b77b', '#f5b700', '#e63e8a', '#1b1840', '#00a3d9', '#8a4fff'],
  MAX_AVATAR_MB: 2,

  // Minijuegos
  QUIZ_LENGTH: 5,
  QUIZ_XP_RUNS_PER_DAY: 3,

  MAX_THUMB_MB: 10,
  MAX_ASSET_MB: Number(process.env.MAX_UPLOAD_MB) || 700,
  SESSION_DAYS: 14,

  SECTIONS: {
    series: {
      name: 'Series',
      color: '#FF6A2B',
      blurb: 'Anime y series: noticias, wallpapers, capturas y clips.',
      categories: ['Wallpapers', 'Capturas', 'Clips', 'Openings']
    },
    musica: {
      name: 'Música',
      color: '#4A3BFF',
      blurb: 'Instrumentales, cover arts y videoclips de tus bandas.',
      categories: ['Instrumentales', 'Cover arts', 'Videoclips', 'Datos y curiosidades']
    },
    videojuegos: {
      name: 'Videojuegos',
      color: '#00B77B',
      blurb: 'Sprites, skins, escudos, kits y capturas.',
      categories: ['Sprites y skins', 'Escudos y kits', 'Capturas', 'Trailers']
    }
  },

  ASSET_KINDS: ['image', 'video', 'audio', 'file'],
  ORDER_STATUSES: ['pendiente', 'pagado', 'entregado', 'cancelado'],

  IMG_EXT: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'],
  ASSET_EXT: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'mp4', 'webm', 'mov', 'mp3', 'wav', 'ogg', 'flac', 'm4a', 'zip', 'pdf'],
  KIND_BY_EXT: {
    png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', gif: 'image', avif: 'image',
    mp4: 'video', webm: 'video', mov: 'video',
    mp3: 'audio', wav: 'audio', ogg: 'audio', flac: 'audio', m4a: 'audio',
    zip: 'file', pdf: 'file'
  },

  MIME: {
    html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8',
    json: 'application/json; charset=utf-8', svg: 'image/svg+xml', ico: 'image/x-icon', txt: 'text/plain; charset=utf-8',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac', m4a: 'audio/mp4',
    zip: 'application/zip', pdf: 'application/pdf'
  }
};
