'use strict';
/* Definición única de los recursos que se administran desde el panel.
   El servidor la usa para validar y el panel la usa (vía /api/admin/schema) para armar los formularios. */
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const { fail, slugify } = require('./util');

const SECTION_KEYS = Object.keys(config.SECTIONS);
const GAME_TYPES = ['personaje', 'cancion', 'imagen'];
const AUDIO_EXT = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'svg'];
const lines = (v, max) => String(v || '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, max);

const RESOURCES = {
  topics: {
    table: 'topics', label: 'Temas', singular: 'tema', hasTopic: false,
    listColumns: ['name', 'section', 'slug'],
    fields: [
      { name: 'section', label: 'Sección', type: 'select', values: SECTION_KEYS, required: true },
      { name: 'name', label: 'Nombre', type: 'text', max: 80, required: true, help: 'Ej: Dragon Ball, Radiohead, Brawl Stars' },
      { name: 'description', label: 'Descripción', type: 'textarea', max: 1000 },
      { name: 'color', label: 'Color (hex)', type: 'color', help: 'Opcional. Ej: #FF8A1F' },
      { name: 'cover', label: 'Portada', type: 'thumb' }
    ]
  },
  articles: {
    table: 'articles', label: 'Artículos', singular: 'artículo', hasTopic: true,
    listColumns: ['title', 'section', 'topic_name', 'published', 'created_at'],
    fields: [
      { name: 'section', label: 'Sección', type: 'select', values: SECTION_KEYS, required: true },
      { name: 'topic_id', label: 'Tema', type: 'topic' },
      { name: 'title', label: 'Título', type: 'text', max: 140, required: true },
      { name: 'excerpt', label: 'Resumen (lo que ve el público)', type: 'textarea', max: 300, help: 'Si lo dejas vacío se genera con el inicio del contenido.' },
      { name: 'content', label: 'Contenido completo (solo con sesión)', type: 'textarea', max: 20000, required: true, rows: 12,
        help: 'Separa párrafos con una línea en blanco. "## " crea un subtítulo y "- " una lista.' },
      { name: 'image', label: 'Imagen de portada', type: 'thumb' },
      { name: 'published', label: 'Publicado', type: 'bool', default: 1 }
    ]
  },
  assets: {
    table: 'assets', label: 'Assets', singular: 'asset', hasTopic: true,
    listColumns: ['title', 'section', 'topic_name', 'category', 'kind', 'min_xp', 'downloads'],
    fields: [
      { name: 'section', label: 'Sección', type: 'select', values: SECTION_KEYS, required: true },
      { name: 'topic_id', label: 'Tema', type: 'topic' },
      { name: 'category', label: 'Categoría', type: 'category', max: 40, required: true, help: 'Ej: Instrumentales, Cover arts, Videoclips, Wallpapers…' },
      { name: 'title', label: 'Título', type: 'text', max: 120, required: true },
      { name: 'description', label: 'Descripción', type: 'textarea', max: 1500 },
      { name: 'kind', label: 'Tipo', type: 'select', values: config.ASSET_KINDS, required: true },
      { name: 'file', label: 'Archivo (protegido: solo con sesión)', type: 'asset', help: 'Imágenes, video, audio, zip o pdf.' },
      { name: 'external_url', label: 'o enlace de YouTube / Vimeo', type: 'url', max: 500 },
      { name: 'thumb', label: 'Miniatura pública', type: 'thumb' },
      { name: 'min_xp', label: 'XP necesarios para desbloquear', type: 'int', min: 0, max: 100000, default: 0, help: '0 = disponible para cualquier cuenta.' }
    ]
  },
  products: {
    table: 'products', label: 'Productos', singular: 'producto', hasTopic: true,
    listColumns: ['name', 'section', 'price', 'stock', 'active'],
    fields: [
      { name: 'section', label: 'Sección', type: 'select', values: SECTION_KEYS, allowEmpty: true },
      { name: 'topic_id', label: 'Tema', type: 'topic' },
      { name: 'name', label: 'Nombre', type: 'text', max: 120, required: true },
      { name: 'description', label: 'Descripción', type: 'textarea', max: 1000 },
      { name: 'price', label: `Precio (${config.CURRENCY})`, type: 'int', min: 0, max: 100000000, required: true },
      { name: 'stock', label: 'Stock', type: 'int', min: 0, max: 100000, default: 0 },
      { name: 'image', label: 'Imagen', type: 'thumb' },
      { name: 'active', label: 'A la venta', type: 'bool', default: 1 }
    ]
  },
  games: {
    table: 'games', label: 'Minijuegos', singular: 'minijuego', hasTopic: true,
    listColumns: ['prompt', 'type', 'topic_name', 'answer', 'xp', 'active'],
    fields: [
      { name: 'type', label: 'Tipo de juego', type: 'select', values: GAME_TYPES, required: true,
        help: 'personaje = adivinar escribiendo con pistas · cancion = adivinar con un clip de audio · imagen = adivinar con una imagen que se va revelando.' },
      { name: 'topic_id', label: 'Tema', type: 'topic' },
      { name: 'prompt', label: 'Pregunta', type: 'text', max: 160, required: true, help: 'Ej: ¿Quién es este personaje? / ¿Cómo se llama esta canción?' },
      { name: 'answer', label: 'Respuesta correcta', type: 'text', max: 80, required: true },
      { name: 'aliases', label: 'Otros nombres aceptados (uno por línea)', type: 'textarea', max: 400, rows: 3, help: 'Solo para "personaje": apodos o formas de escribirlo.' },
      { name: 'options', label: 'Opciones (una por línea, de 2 a 4)', type: 'textarea', max: 600, rows: 4, help: 'Para "cancion" e "imagen". La respuesta correcta debe estar entre ellas.' },
      { name: 'hints', label: 'Pistas (una por línea, hasta 5)', type: 'textarea', max: 1000, rows: 5, help: 'Para "personaje" (obligatorio): de la más difícil a la más fácil. Se muestran de a una.' },
      { name: 'media', label: 'Archivo (clip de audio o imagen)', type: 'asset', help: 'Para "cancion" un audio (mp3, wav, ogg, m4a). Para "imagen" una imagen. Se sirve protegido: el nombre del archivo no se muestra.' },
      { name: 'xp', label: 'XP por acertar', type: 'int', min: 1, max: 100, default: 10 },
      { name: 'active', label: 'Activo', type: 'bool', default: 1 }
    ]
  },
  songs: {
    table: 'songs', label: 'Canciones', singular: 'canción', hasTopic: true,
    listColumns: ['title', 'artist', 'topic_name', 'active'],
    fields: [
      { name: 'topic_id', label: 'Tema', type: 'topic' },
      { name: 'title', label: 'Título de la canción', type: 'text', max: 120, required: true,
        help: 'Escríbelo igual que aparece en Spotify para que se reconozca sola.' },
      { name: 'artist', label: 'Artista', type: 'text', max: 120, required: true },
      { name: 'video_url', label: 'Videoclip (enlace de YouTube)', type: 'url', max: 500, help: 'Se sincroniza con tu canción. Sin volumen: el audio viene de tu app.' },
      { name: 'media', label: 'o archivo de video propio', type: 'asset', help: 'mp4 o webm. Solo se ve con sesión iniciada.' },
      { name: 'lyrics', label: 'Letra con tiempos (formato LRC)', type: 'textarea', max: 30000, rows: 14,
        help: 'Una línea por verso: [mm:ss.xx] texto. Sin tiempos también sirve (se muestra sin sincronizar). Usa solo letras que tengas derecho a publicar.' },
      { name: 'video_offset_ms', label: 'Desfase base del video (ms)', type: 'int', min: -60000, max: 60000, default: 0, help: 'Positivo = el video va más adelantado que el audio.' },
      { name: 'lyrics_offset_ms', label: 'Desfase base de la letra (ms)', type: 'int', min: -60000, max: 60000, default: 0 },
      { name: 'active', label: 'Visible', type: 'bool', default: 1 }
    ]
  },
  trivia: {
    table: 'trivia', label: 'Preguntas', singular: 'pregunta', hasTopic: true,
    listColumns: ['question', 'topic_name', 'xp', 'active'],
    fields: [
      { name: 'topic_id', label: 'Tema', type: 'topic' },
      { name: 'question', label: 'Pregunta', type: 'text', max: 200, required: true },
      { name: 'options', label: 'Opciones (2 a 4)', type: 'options' },
      { name: 'answer', label: 'Número de la respuesta correcta', type: 'answer', help: 'Se elige con el botón de la opción correcta.' },
      { name: 'xp', label: 'XP por acertar', type: 'int', min: 1, max: 100, default: 10 },
      { name: 'active', label: 'Activa', type: 'bool', default: 1 }
    ]
  }
};

function empty(v) { return v === undefined || v === null || v === ''; }

function cleanField(f, raw, db) {
  const label = f.label;
  switch (f.type) {
    case 'text': case 'textarea': case 'category': {
      const v = String(raw ?? '').trim();
      if (f.required && !v) throw fail(`"${label}" es obligatorio.`);
      if (f.max && v.length > f.max) throw fail(`"${label}" admite hasta ${f.max} caracteres.`);
      return v;
    }
    case 'select': {
      const v = String(raw ?? '').trim();
      if (!v && f.allowEmpty) return '';
      if (!f.values.includes(v)) throw fail(`Valor inválido en "${label}".`);
      return v;
    }
    case 'topic': {
      if (empty(raw)) return null;
      const id = Number(raw);
      if (!Number.isInteger(id) || !db.prepare('SELECT 1 FROM topics WHERE id = ?').get(id)) throw fail('El tema elegido no existe.');
      return id;
    }
    case 'int': {
      if (empty(raw)) {
        if (f.required) throw fail(`"${label}" es obligatorio.`);
        return f.default ?? 0;
      }
      const n = Number(raw);
      if (!Number.isInteger(n) || n < f.min || n > f.max) throw fail(`"${label}" debe ser un entero entre ${f.min} y ${f.max}.`);
      return n;
    }
    case 'bool':
      return raw === true || raw === 1 || raw === '1' || raw === 'true' ? 1 : 0;
    case 'color': {
      const v = String(raw ?? '').trim();
      if (v && !/^#[0-9a-fA-F]{6}$/.test(v)) throw fail('El color debe tener formato #RRGGBB.');
      return v;
    }
    case 'thumb': {
      const v = String(raw ?? '').trim();
      if (v && !/^\/(uploads|placeholders)\/[\w.\-]+$/.test(v)) throw fail(`Imagen inválida en "${label}".`);
      return v;
    }
    case 'asset': {
      const v = String(raw ?? '').trim();
      if (!v) return '';
      if (!/^[\w.\-]+$/.test(v) || !fs.existsSync(path.join(config.DIRS.assets, v))) throw fail('El archivo del asset no existe. Vuelve a subirlo.');
      return v;
    }
    case 'url': {
      const v = String(raw ?? '').trim();
      if (!v) return '';
      if (v.length > (f.max || 500)) throw fail(`"${label}" es demasiado largo.`);
      let u;
      try { u = new URL(v); } catch { throw fail(`"${label}" no es una URL válida.`); }
      if (!/^https?:$/.test(u.protocol)) throw fail(`"${label}" debe empezar con http:// o https://`);
      return v;
    }
    case 'options': {
      const arr = Array.isArray(raw) ? raw.map((s) => String(s ?? '').trim()).filter(Boolean) : [];
      if (arr.length < 2 || arr.length > 4) throw fail('La pregunta necesita entre 2 y 4 opciones.');
      if (arr.some((s) => s.length > 120)) throw fail('Cada opción admite hasta 120 caracteres.');
      return JSON.stringify(arr);
    }
    case 'answer': {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0 || n > 3) throw fail('Elige cuál es la respuesta correcta.');
      return n;
    }
    default:
      throw fail(`Campo desconocido: ${f.name}`, 500);
  }
}

/** Valida y normaliza un cuerpo JSON contra la definición del recurso. */
function cleanBody(key, body, db, { partial }) {
  const res = RESOURCES[key];
  const out = {};
  for (const f of res.fields) {
    let raw = body[f.name];
    if (raw === undefined) {
      if (partial) continue;
      raw = f.default ?? (f.type === 'options' ? [] : '');
    }
    out[f.name] = cleanField(f, raw, db);
  }

  if (key === 'articles' && 'excerpt' in out && !out.excerpt && out.content) {
    out.excerpt = out.content.replace(/^## /gm, '').replace(/^- /gm, '').replace(/\s+/g, ' ').slice(0, 200).trim();
  }
  if (key === 'topics' && out.color === '' && out.section) out.color = config.SECTIONS[out.section].color;
  if (key === 'trivia' && 'options' in out && 'answer' in out) {
    if (out.answer >= JSON.parse(out.options).length) throw fail('La respuesta correcta debe ser una de las opciones.');
  }
  if (key === 'games') validateGame(out);
  if (key === 'songs' && 'video_url' in out && out.video_url && !require('./util').youtubeId(out.video_url)) {
    throw fail('Por ahora el enlace del videoclip debe ser de YouTube. También puedes subir un archivo de video.');
  }
  if (key === 'songs' && out.media) {
    const ext = path.extname(out.media).slice(1).toLowerCase();
    if (!['mp4', 'webm', 'mov'].includes(ext)) throw fail('El video debe ser mp4 o webm.');
  }
  return out;
}

const norm = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Reglas propias de cada tipo de minijuego. Normaliza los campos de varias líneas. */
function validateGame(out) {
  for (const k of ['aliases', 'options', 'hints']) {
    if (k in out) {
      const max = k === 'options' ? 4 : k === 'hints' ? 5 : 8;
      const arr = lines(out[k], max);
      if (arr.some((l) => l.length > 200)) throw fail('Cada línea admite hasta 200 caracteres.');
      out[k] = arr.join('\n');
    }
  }
  if (!('type' in out)) return;
  const opts = lines(out.options, 4);
  if (out.type === 'personaje') {
    if (!lines(out.hints, 5).length) throw fail('Un juego de personaje necesita al menos una pista.');
    out.options = ''; out.media = '';
    return;
  }
  if (opts.length < 2) throw fail('Este tipo de juego necesita entre 2 y 4 opciones (una por línea).');
  if (!opts.some((o) => norm(o) === norm(out.answer))) throw fail('La respuesta correcta debe estar escrita igual entre las opciones.');
  if (!out.media) throw fail(out.type === 'cancion' ? 'Sube el clip de audio.' : 'Sube la imagen.');
  const ext = path.extname(out.media).slice(1).toLowerCase();
  if (out.type === 'cancion' && !AUDIO_EXT.includes(ext)) throw fail('Para "cancion" el archivo debe ser de audio (mp3, wav, ogg, m4a).');
  if (out.type === 'imagen' && !IMAGE_EXT.includes(ext)) throw fail('Para "imagen" el archivo debe ser una imagen.');
  out.aliases = '';
  if (out.type === 'cancion') out.hints = '';
}

function uniqueSlug(db, name) {
  const base = slugify(name) || 'tema';
  let slug = base, i = 2;
  while (db.prepare('SELECT 1 FROM topics WHERE slug = ?').get(slug)) slug = `${base}-${i++}`;
  return slug;
}

function schemaForClient() {
  return {
    sections: Object.fromEntries(SECTION_KEYS.map((k) => [k, { name: config.SECTIONS[k].name, categories: config.SECTIONS[k].categories }])),
    resources: Object.fromEntries(Object.entries(RESOURCES).map(([k, r]) => [k, {
      label: r.label, singular: r.singular, hasTopic: r.hasTopic, listColumns: r.listColumns, fields: r.fields
    }]))
  };
}

module.exports = { norm, GAME_TYPES, RESOURCES, cleanBody, uniqueSlug, schemaForClient };
