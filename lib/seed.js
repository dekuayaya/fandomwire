'use strict';
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const { hashPassword } = require('./util');

/* =====================================================================
   Imágenes de ejemplo (SVG originales, no son arte de ninguna obra real)
   ===================================================================== */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function mix(hex, other, amt) {
  const a = hex.replace('#', ''), b = other.replace('#', '');
  const ch = (i) => Math.round(parseInt(a.substr(i, 2), 16) * (1 - amt) + parseInt(b.substr(i, 2), 16) * amt);
  return '#' + [0, 2, 4].map((i) => ch(i).toString(16).padStart(2, '0')).join('');
}

function motif(kind, c) {
  const light = mix(c, '#ffffff', 0.55), dark = mix(c, '#000000', 0.45);
  switch (kind) {
    case 'wallpaper':
      return `<polygon points="0,450 260,0 380,0 120,450" fill="${light}" opacity=".35"/>
              <polygon points="260,450 520,0 600,0 340,450" fill="${dark}" opacity=".35"/>
              <polygon points="520,450 800,0 800,120 640,450" fill="${light}" opacity=".25"/>`;
    case 'cover':
      return `<circle cx="400" cy="225" r="200" fill="${dark}" opacity=".55"/>
              <circle cx="400" cy="225" r="150" fill="none" stroke="${light}" stroke-width="3" opacity=".6"/>
              <circle cx="400" cy="225" r="105" fill="none" stroke="${light}" stroke-width="3" opacity=".5"/>
              <circle cx="400" cy="225" r="60" fill="${light}" opacity=".85"/>
              <circle cx="400" cy="225" r="10" fill="${dark}"/>`;
    case 'audio': {
      const hs = [60, 120, 200, 140, 260, 180, 90, 230, 150, 70, 190, 110, 240, 130, 80];
      return hs.map((h, i) => `<rect x="${95 + i * 44}" y="${225 - h / 2}" width="26" height="${h}" rx="13" fill="${i % 2 ? light : dark}" opacity=".75"/>`).join('');
    }
    case 'video':
      return `<circle cx="400" cy="225" r="105" fill="${dark}" opacity=".55"/>
              <polygon points="368,170 368,280 456,225" fill="${light}"/>`;
    case 'sprite': {
      let s = '';
      for (let y = 0; y < 6; y++) for (let x = 0; x < 10; x++) {
        if ((x * 7 + y * 13 + x * y) % 3 === 0) s += `<rect x="${150 + x * 50}" y="${75 + y * 50}" width="44" height="44" fill="${(x + y) % 2 ? light : dark}" opacity=".7"/>`;
      }
      return s;
    }
    case 'shield':
      return `<path d="M400 60 L580 120 V240 C580 330 500 385 400 420 C300 385 220 330 220 240 V120 Z" fill="${dark}" opacity=".6"/>
              <path d="M400 95 L545 143 V240 C545 311 482 355 400 385 C318 355 255 311 255 240 V143 Z" fill="none" stroke="${light}" stroke-width="5" opacity=".8"/>
              <circle cx="400" cy="235" r="46" fill="${light}" opacity=".85"/>`;
    default: // product
      return `<rect x="250" y="120" width="300" height="210" rx="18" fill="${dark}" opacity=".55"/>
              <rect x="250" y="120" width="300" height="52" rx="18" fill="${light}" opacity=".7"/>
              <rect x="372" y="120" width="56" height="210" fill="${light}" opacity=".5"/>`;
  }
}

function svg({ kind, title, color }) {
  const top = mix(color, '#ffffff', 0.12), bottom = mix(color, '#000000', 0.25);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" role="img" aria-label="${esc(title)}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>
<rect width="800" height="450" fill="url(#g)"/>
${motif(kind, color)}
<rect x="0" y="378" width="800" height="72" fill="#000" opacity=".38"/>
<text x="32" y="418" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="700" fill="#fff">${esc(title)}</text>
<text x="768" y="418" text-anchor="end" font-family="Segoe UI, Arial, sans-serif" font-size="18" fill="#fff" opacity=".85">imagen de ejemplo</text>
</svg>`;
}

function wavTone() {
  // 4 segundos, acorde de La menor, 44.1 kHz mono 16-bit: solo para probar el reproductor.
  const rate = 44100, secs = 4, n = rate * secs;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  const freqs = [220, 261.63, 329.63];
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const env = Math.min(1, t * 20) * Math.min(1, (secs - t) * 3);
    let v = 0;
    for (const f of freqs) v += Math.sin(2 * Math.PI * f * t);
    buf.writeInt16LE(Math.round((v / freqs.length) * env * 0.35 * 32767), 44 + i * 2);
  }
  return buf;
}

/* =====================================================================
   Datos de ejemplo: un tema por cada serie / banda / juego
   ===================================================================== */
const NOTE = '\n\n(Artículo de ejemplo: edítalo o bórralo desde el panel de administración.)';

const TOPICS = [
  { section: 'series', slug: 'dragon-ball', name: 'Dragon Ball', color: '#FF8A1F', motif: 'wallpaper',
    description: 'La saga de Goku creada por Akira Toriyama: manga, anime, películas y videojuegos.' },
  { section: 'series', slug: 'jojo', name: "JoJo's Bizarre Adventure", color: '#C03CE0', motif: 'wallpaper',
    description: 'La obra de Hirohiko Araki que arrancó en 1987: Stands, poses y generaciones de Joestars.' },
  { section: 'musica', slug: 'twenty-one-pilots', name: 'Twenty One Pilots', color: '#E8423F', motif: 'audio',
    description: 'El dúo de Columbus, Ohio, formado por Tyler Joseph y Josh Dun.' },
  { section: 'musica', slug: 'radiohead', name: 'Radiohead', color: '#3B6BFF', motif: 'cover',
    description: 'La banda británica formada en Abingdon, Oxfordshire, conocida por reinventarse en cada disco.' },
  { section: 'videojuegos', slug: 'brawl-stars', name: 'Brawl Stars', color: '#F5B700', motif: 'sprite',
    description: 'El juego de combates por equipos de Supercell: brawlers, mapas y eventos.' },
  { section: 'videojuegos', slug: 'dls', name: 'Dream League Soccer', color: '#10B27A', motif: 'shield',
    description: 'El juego de fútbol de First Touch Games donde armas y personalizas tu club.' }
];

const ARTICLES = [
  { topic: 'dragon-ball', created: '2026-10-09 18:30:00', title: 'Dragon Ball: guía rápida para empezar en el orden correcto',
    excerpt: 'El manga original se publicó entre 1984 y 1995. En anime, el orden más simple es Dragon Ball, Dragon Ball Z y Dragon Ball Super.',
    content: 'El manga de Dragon Ball se publicó en Weekly Shōnen Jump entre 1984 y 1995, con Akira Toriyama como autor.\n\n## Por dónde empezar\n\nSi prefieres el anime, el orden más simple es: Dragon Ball (1986), Dragon Ball Z (1989) y Dragon Ball Super (2015).\n\n- Dragon Ball: la aventura inicial de Goku de niño.\n- Dragon Ball Z: los combates y las sagas más conocidas.\n- Dragon Ball Super: la continuación moderna.\n\nDesde aquí podrás guardar tus wallpapers y capturas favoritas en la biblioteca.' + NOTE },
  { topic: 'jojo', created: '2026-10-08 16:00:00', title: 'JoJo: qué es un Stand y por qué cambió la serie',
    excerpt: 'A partir de la tercera parte, Stardust Crusaders, los combates giran en torno a los Stands: poderes con forma propia y reglas únicas.',
    content: 'Las dos primeras partes de JoJo se apoyan en la técnica del Hamon. A partir de la tercera, Stardust Crusaders, aparecen los Stands.\n\n## Qué los hace especiales\n\nCada Stand tiene una habilidad concreta y reglas propias. Eso convierte las peleas en pequeños acertijos donde gana quien entiende mejor el poder del rival.\n\nEn la biblioteca irás encontrando wallpapers y capturas organizados por parte.' + NOTE },
  { topic: 'twenty-one-pilots', created: '2026-10-07 20:15:00', title: 'Twenty One Pilots: un recorrido por sus álbumes',
    excerpt: 'Vessel, Blurryface, Trench, Scaled and Icy y Clancy: cinco discos, cinco etapas del dúo de Ohio.',
    content: 'Twenty One Pilots es un dúo de Columbus, Ohio, formado por Tyler Joseph y Josh Dun.\n\n## Discografía reciente\n\n- Vessel (2013)\n- Blurryface (2015)\n- Trench (2018)\n- Scaled and Icy (2021)\n- Clancy (2024)\n\nEn la sección de música podrás reunir instrumentales, cover arts y videoclips de cada era.' + NOTE },
  { topic: 'radiohead', created: '2026-10-06 12:00:00', title: 'Radiohead: tres discos para entender su evolución',
    excerpt: 'OK Computer, Kid A e In Rainbows muestran a una banda que cambia de sonido sin perder identidad.',
    content: 'Radiohead se formó en Abingdon, Inglaterra, y es conocida por cambiar de rumbo disco a disco.\n\n## Tres paradas clave\n\n- OK Computer (1997): guitarras, paranoia y tecnología.\n- Kid A (2000): el giro electrónico.\n- In Rainbows (2007): lanzado en descarga digital con precio a elección del público.\n\nAquí irán sus cover arts y videoclips para que los tengas a mano.' + NOTE },
  { topic: 'brawl-stars', created: '2026-10-05 19:45:00', title: 'Brawl Stars: cómo elegir brawler según el modo de juego',
    excerpt: 'Cada modo premia algo distinto. Entender el objetivo del mapa vale más que usar siempre al brawler de moda.',
    content: 'Brawl Stars, de Supercell, se lanzó a nivel mundial en diciembre de 2018.\n\n## Piensa en el objetivo\n\nEn modos como Gem Grab o Showdown, el mismo brawler puede rendir muy distinto. Antes de elegir, mira el mapa: ¿hay muros para cubrirte o espacios abiertos?\n\nIrás encontrando aquí sprites y skins para tus proyectos de fans.' + NOTE },
  { topic: 'dls', created: '2026-10-04 15:20:00', title: 'Dream League Soccer: ideas para personalizar tu club',
    excerpt: 'Escudo, kits y estadio: tres detalles que le dan identidad a tu equipo desde el primer partido.',
    content: 'Dream League Soccer, de First Touch Games, te deja armar tu plantilla y darle identidad visual al club.\n\n## Personalización\n\n- Escudo: elige formas simples que se lean bien en tamaño pequeño.\n- Kits: usa pocos colores y buen contraste.\n- Imágenes propias: revisa la resolución que pide la versión del juego antes de importarlas.\n\nEn la biblioteca tendrás escudos y kits para descargar.' + NOTE }
];

const ASSETS = [
  { topic: 'dragon-ball', kind: 'image', category: 'Wallpapers', title: 'Wallpaper de ejemplo · Dragon Ball', min_xp: 0, motif: 'wallpaper', fileExt: 'svg',
    description: 'Archivo de ejemplo. Reemplázalo subiendo tu propio wallpaper desde Admin → Assets.' },
  { topic: 'jojo', kind: 'image', category: 'Wallpapers', title: 'Wallpaper de ejemplo · JoJo', min_xp: 0, motif: 'wallpaper', fileExt: 'svg',
    description: 'Archivo de ejemplo para probar la descarga con sesión iniciada.' },
  { topic: 'twenty-one-pilots', kind: 'audio', category: 'Instrumentales', title: 'Instrumental de ejemplo (tono de prueba)', min_xp: 0, motif: 'audio', fileExt: 'wav',
    description: 'Un tono de 4 segundos para probar el reproductor. Sube aquí tus instrumentales (mp3, wav, ogg, flac, m4a).' },
  { topic: 'twenty-one-pilots', kind: 'video', category: 'Videoclips', title: 'Videoclip de ejemplo (pendiente)', min_xp: 0, motif: 'video', fileExt: null, slugSuffix: 'video',
    description: 'Todavía sin archivo. Sube un mp4/webm o pega un enlace de YouTube desde Admin → Assets.' },
  { topic: 'radiohead', kind: 'image', category: 'Cover arts', title: 'Cover art de ejemplo', min_xp: 0, motif: 'cover', fileExt: 'svg',
    description: 'Ejemplo de cómo se verá un cover art en la biblioteca.' },
  { topic: 'brawl-stars', kind: 'image', category: 'Sprites y skins', title: 'Sprite de ejemplo · Brawl Stars', min_xp: 0, motif: 'sprite', fileExt: 'svg',
    description: 'Imagen de ejemplo para la categoría de sprites y skins.' },
  { topic: 'dls', kind: 'image', category: 'Escudos y kits', title: 'Escudo de ejemplo · DLS (se desbloquea con 30 XP)', min_xp: 30, motif: 'shield', fileExt: 'svg',
    description: 'Ejemplo de asset bloqueado: se desbloquea al juntar 30 XP con la misión diaria.' }
];

const PRODUCTS = [
  { topic: 'dragon-ball', name: 'Pack de wallpapers (ejemplo)', price: 3990, stock: 50, description: 'Producto de ejemplo para la sección de ventas.' },
  { topic: 'jojo', name: 'Pack de stickers (ejemplo)', price: 2990, stock: 80, description: 'Producto de ejemplo: cambia nombre, precio, stock e imagen desde el admin.' },
  { topic: 'twenty-one-pilots', name: 'Póster A3 (ejemplo)', price: 6990, stock: 25, description: 'Producto de ejemplo para la sección de ventas.' },
  { topic: 'radiohead', name: 'Vinilo de colección (ejemplo)', price: 29990, stock: 5, description: 'Producto de ejemplo con poco stock.' },
  { topic: 'brawl-stars', name: 'Taza coleccionable (ejemplo)', price: 8990, stock: 30, description: 'Producto de ejemplo para la sección de ventas.' },
  { topic: 'dls', name: 'Pack de escudos y kits (ejemplo)', price: 1990, stock: 100, description: 'Producto de ejemplo para la sección de ventas.' }
];

const TRIVIA = [
  { topic: 'dragon-ball', question: '¿Quién creó Dragon Ball?', options: ['Eiichiro Oda', 'Masashi Kishimoto', 'Akira Toriyama', 'Hirohiko Araki'], answer: 2 },
  { topic: 'jojo', question: '¿Cómo se llaman los poderes con forma propia que aparecen desde la tercera parte de JoJo?', options: ['Stands', 'Haki', 'Nen', 'Chakra'], answer: 0 },
  { topic: 'twenty-one-pilots', question: '¿De qué ciudad de Ohio es Twenty One Pilots?', options: ['Cleveland', 'Cincinnati', 'Dayton', 'Columbus'], answer: 3 },
  { topic: 'radiohead', question: '¿Qué álbum de Radiohead salió en el año 2000?', options: ['OK Computer', 'Kid A', 'In Rainbows', 'The Bends'], answer: 1 },
  { topic: 'brawl-stars', question: '¿Qué empresa desarrolla Brawl Stars?', options: ['Riot Games', 'Epic Games', 'Nintendo', 'Supercell'], answer: 3 },
  { topic: 'dls', question: '¿Qué deporte se juega en Dream League Soccer?', options: ['Baloncesto', 'Fútbol', 'Tenis', 'Béisbol'], answer: 1 }
];

/* ===================================================================== */

function writeIfMissing(file, data) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, data);
}

function ensureAdmin(db) {
  const has = db.prepare("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1").get();
  if (has) return;
  db.prepare('INSERT INTO users (username, email, pass_hash, role) VALUES (?, ?, ?, ?)')
    .run(config.ADMIN_USER, config.ADMIN_EMAIL, hashPassword(config.ADMIN_PASSWORD), 'admin');
  console.log('\n  Cuenta de administrador creada:');
  console.log(`    usuario:    ${config.ADMIN_USER}  (o email ${config.ADMIN_EMAIL})`);
  console.log(`    contraseña: ${config.ADMIN_PASSWORD}`);
  console.log('  Cámbiala en /cuenta.html apenas entres.\n');
}


/* =====================================================================
   Extras: minijuegos, más preguntas y canciones de ejemplo
   (se cargan una sola vez, también en bases de datos ya existentes)
   ===================================================================== */
const MORE_TRIVIA = [
  { topic: 'dragon-ball', question: '¿Cómo se llama la raza guerrera a la que pertenece Goku?', options: ['Namekianos', 'Saiyajin', 'Majin', 'Tsufur'], answer: 1 },
  { topic: 'dragon-ball', question: '¿Cuántas Dragon Balls hay que reunir para invocar a Shenlong?', options: ['5', '7', '9', '12'], answer: 1 },
  { topic: 'jojo', question: '¿Quién es el protagonista de la tercera parte, Stardust Crusaders?', options: ['Jonathan Joestar', 'Joseph Joestar', 'Jotaro Kujo', 'Josuke Higashikata'], answer: 2 },
  { topic: 'jojo', question: '¿Quién creó JoJo\'s Bizarre Adventure?', options: ['Akira Toriyama', 'Hirohiko Araki', 'Tite Kubo', 'Yoshihiro Togashi'], answer: 1 },
  { topic: 'twenty-one-pilots', question: '¿Quién toca la batería en Twenty One Pilots?', options: ['Tyler Joseph', 'Josh Dun', 'Dave Grohl', 'Chad Smith'], answer: 1 },
  { topic: 'twenty-one-pilots', question: '¿Qué álbum de Twenty One Pilots salió en 2015?', options: ['Vessel', 'Blurryface', 'Trench', 'Scaled and Icy'], answer: 1 },
  { topic: 'radiohead', question: '¿Quién es el vocalista de Radiohead?', options: ['Thom Yorke', 'Jonny Greenwood', 'Ed O\'Brien', 'Colin Greenwood'], answer: 0 },
  { topic: 'radiohead', question: '¿Cuál de estos álbumes de Radiohead es de 2007?', options: ['Pablo Honey', 'Kid A', 'In Rainbows', 'Amnesiac'], answer: 2 },
  { topic: 'brawl-stars', question: '¿Cómo se llama el modo en el que se juntan gemas en el centro del mapa?', options: ['Gem Grab', 'Heist', 'Bounty', 'Hot Zone'], answer: 0 },
  { topic: 'brawl-stars', question: '¿Cómo se llama el modo de Brawl Stars parecido al fútbol?', options: ['Knockout', 'Siege', 'Brawl Ball', 'Duels'], answer: 2 },
  { topic: 'dls', question: '¿Qué empresa desarrolla Dream League Soccer?', options: ['First Touch Games', 'Konami', 'EA Sports', 'Gameloft'], answer: 0 },
  { topic: 'dls', question: '¿Qué puedes personalizar en tu club de Dream League Soccer?', options: ['El escudo y los kits', 'El motor de un auto', 'El mapa del mundo', 'El clima'], answer: 0 }
];

const GAMES = [
  { type: 'personaje', topic: 'dragon-ball', prompt: '¿Quién es este personaje? (ejemplo)', answer: 'Goku', aliases: 'Son Goku\nKakaroto',
    hints: 'Es un guerrero criado en la Tierra, pero no nació allí.\nSu transformación más famosa tiene el pelo dorado.\nEs el protagonista de la serie creada por Akira Toriyama.\nSu técnica clásica es el Kamehameha.' },
  { type: 'personaje', topic: 'jojo', prompt: '¿Quién es este personaje? (ejemplo)', answer: 'Jotaro Kujo', aliases: 'Jotaro\nKujo Jotaro',
    hints: 'Su abuelo se llama Joseph Joestar.\nEs el protagonista de la tercera parte, Stardust Crusaders.\nSu frase más repetida es «Yare yare daze».\nSu Stand se llama Star Platinum.' },
  { type: 'cancion', topic: 'twenty-one-pilots', prompt: 'Escucha el clip: ¿de qué banda es? (ejemplo con un tono de prueba)', answer: 'Twenty One Pilots',
    options: 'Twenty One Pilots\nRadiohead\nColdplay\nImagine Dragons', media: 'ejemplo-instrumental.wav' },
  { type: 'cancion', topic: 'radiohead', prompt: '¿Cómo se llama esta canción? (ejemplo con un tono de prueba)', answer: 'Canción de ejemplo A',
    options: 'Canción de ejemplo A\nCanción de ejemplo B\nCanción de ejemplo C\nCanción de ejemplo D', media: 'ejemplo-instrumental.wav' },
  { type: 'imagen', topic: 'brawl-stars', prompt: '¿Qué brawler es este? (ejemplo: sube un recorte tuyo)', answer: 'Brawler de ejemplo',
    options: 'Brawler de ejemplo\nBrawler B\nBrawler C\nBrawler D', media: 'ejemplo-juego-1.svg' },
  { type: 'imagen', topic: 'dls', prompt: '¿De qué club es este escudo? (ejemplo: sube tu imagen)', answer: 'Club de ejemplo',
    options: 'Club de ejemplo\nClub B\nClub C\nClub D', media: 'ejemplo-juego-2.svg' }
];

// Letra de ejemplo ORIGINAL (no pertenece a ninguna canción real) en formato LRC.
const SAMPLE_LRC = [
  '[00:00.00] ♪ (intro de ejemplo)',
  '[00:04.00] Esta es una letra de ejemplo',
  '[00:08.00] que se ilumina línea por línea',
  '[00:12.00] Si el video va adelantado, atrásalo con el control de desfase',
  '[00:18.00] Si la letra llega tarde, adelántala con los botones +0,1 s',
  '[00:24.00] Cuando coincida con tu canción, déjalo así',
  '[00:30.00] Sube tus propias letras en formato LRC desde Admin → Canciones',
  '[00:38.00] Y recuerda: publica solo letras que tengas derecho a usar',
  '[00:46.00] ♪ (final de ejemplo)'
].join('\n');

function gameSvg(color, variant) {
  const light = mix(color, '#ffffff', 0.55), dark = mix(color, '#000000', 0.45);
  const body = variant === 1
    ? `<circle cx="400" cy="190" r="95" fill="${dark}"/><rect x="270" y="270" width="260" height="160" rx="60" fill="${dark}"/><circle cx="360" cy="175" r="14" fill="${light}"/><circle cx="440" cy="175" r="14" fill="${light}"/>`
    : `<path d="M400 50 L600 120 V250 C600 350 510 410 400 440 C290 410 200 350 200 250 V120 Z" fill="${dark}"/><circle cx="400" cy="240" r="70" fill="${light}"/><path d="M400 190 L420 235 L470 240 L432 272 L444 320 L400 295 L356 320 L368 272 L330 240 L380 235 Z" fill="${dark}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" role="img" aria-label="Imagen de ejemplo"><rect width="800" height="450" fill="${mix(color, '#ffffff', 0.25)}"/>${body}</svg>`;
}

function seedExtras(db) {
  if (db.prepare("SELECT 1 FROM settings WHERE key = 'extras_v1'").get()) return;
  const topics = db.prepare('SELECT id, slug, color FROM topics').all();
  if (!topics.length) return;
  const id = Object.fromEntries(topics.map((t) => [t.slug, t.id]));
  const color = Object.fromEntries(topics.map((t) => [t.slug, t.color || '#4a3bff']));
  const A = config.DIRS.assets;

  writeIfMissing(path.join(A, 'ejemplo-instrumental.wav'), wavTone());
  writeIfMissing(path.join(A, 'ejemplo-juego-1.svg'), gameSvg(color['brawl-stars'] || '#F5B700', 1));
  writeIfMissing(path.join(A, 'ejemplo-juego-2.svg'), gameSvg(color['dls'] || '#10B27A', 2));

  if (db.prepare('SELECT COUNT(*) AS n FROM trivia').get().n < 12) {
    const insT = db.prepare('INSERT INTO trivia (topic_id, question, options, answer, xp, active) VALUES (?, ?, ?, ?, 10, 1)');
    for (const q of MORE_TRIVIA) if (id[q.topic]) insT.run(id[q.topic], q.question, JSON.stringify(q.options), q.answer);
  }

  const insG = db.prepare('INSERT INTO games (type, topic_id, prompt, answer, aliases, options, hints, media, xp, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 10, 1)');
  for (const g of GAMES) {
    if (!id[g.topic]) continue;
    insG.run(g.type, id[g.topic], g.prompt, g.answer, g.aliases || '', g.options || '', g.hints || '', g.media || '');
  }

  const hasClip = fs.existsSync(path.join(A, 'ejemplo-clip.mp4'));
  const insS = db.prepare('INSERT INTO songs (topic_id, title, artist, video_url, media, lyrics, active) VALUES (?, ?, ?, ?, ?, ?, 1)');
  if (id['twenty-one-pilots']) insS.run(id['twenty-one-pilots'], 'Canción de ejemplo A', 'Artista de ejemplo', '', hasClip ? 'ejemplo-clip.mp4' : '', SAMPLE_LRC);
  if (id['radiohead']) insS.run(id['radiohead'], 'Canción de ejemplo B', 'Artista de ejemplo', '', '', SAMPLE_LRC);

  db.prepare("INSERT INTO settings (key, value) VALUES ('extras_v1', '1')").run();
}

function seed(db) {
  for (const d of Object.values(config.DIRS)) fs.mkdirSync(d, { recursive: true });
  ensureAdmin(db);

  const hasTopics = db.prepare('SELECT COUNT(*) AS n FROM topics').get().n > 0;
  if (hasTopics) { seedExtras(db); return; }

  // Archivos de ejemplo
  for (const t of TOPICS) {
    writeIfMissing(path.join(config.DIRS.placeholders, `${t.slug}.svg`), svg({ kind: t.motif, title: t.name, color: t.color }));
  }
  const tp = Object.fromEntries(TOPICS.map((t) => [t.slug, t]));
  writeIfMissing(path.join(config.DIRS.placeholders, 'twenty-one-pilots-video.svg'),
    svg({ kind: 'video', title: 'Twenty One Pilots · videoclip', color: tp['twenty-one-pilots'].color }));
  for (const t of TOPICS) {
    writeIfMissing(path.join(config.DIRS.placeholders, `producto-${t.slug}.svg`), svg({ kind: 'product', title: t.name, color: t.color }));
  }
  writeIfMissing(path.join(config.DIRS.assets, 'ejemplo-instrumental.wav'), wavTone());
  for (const a of ASSETS) {
    if (a.fileExt === 'svg') {
      writeIfMissing(path.join(config.DIRS.assets, `ejemplo-${a.topic}.svg`),
        svg({ kind: a.motif, title: a.title.split('(')[0].trim(), color: tp[a.topic].color }));
    }
  }

  const insTopic = db.prepare('INSERT INTO topics (section, slug, name, description, color, cover) VALUES (?, ?, ?, ?, ?, ?)');
  const ids = {};
  for (const t of TOPICS) {
    ids[t.slug] = Number(insTopic.run(t.section, t.slug, t.name, t.description, t.color, `/placeholders/${t.slug}.svg`).lastInsertRowid);
  }

  const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get();
  const insArticle = db.prepare('INSERT INTO articles (section, topic_id, title, excerpt, content, image, author_id, published, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)');
  for (const a of ARTICLES) {
    insArticle.run(tp[a.topic].section, ids[a.topic], a.title, a.excerpt, a.content, `/placeholders/${a.topic}.svg`, admin ? admin.id : null, a.created);
  }

  const insAsset = db.prepare('INSERT INTO assets (section, topic_id, kind, category, title, description, thumb, file, external_url, min_xp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const a of ASSETS) {
    let file = '';
    if (a.fileExt === 'svg') file = `ejemplo-${a.topic}.svg`;
    if (a.fileExt === 'wav') file = 'ejemplo-instrumental.wav';
    const thumb = `/placeholders/${a.topic}${a.slugSuffix ? '-' + a.slugSuffix : ''}.svg`;
    insAsset.run(tp[a.topic].section, ids[a.topic], a.kind, a.category, a.title, a.description, thumb, file, '', a.min_xp);
  }

  const insProduct = db.prepare('INSERT INTO products (section, topic_id, name, description, price, stock, image, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)');
  for (const p of PRODUCTS) {
    insProduct.run(tp[p.topic].section, ids[p.topic], p.name, p.description, p.price, p.stock, `/placeholders/producto-${p.topic}.svg`);
  }

  const insTrivia = db.prepare('INSERT INTO trivia (topic_id, question, options, answer, xp, active) VALUES (?, ?, ?, ?, 10, 1)');
  for (const q of TRIVIA) insTrivia.run(ids[q.topic], q.question, JSON.stringify(q.options), q.answer);

  seedExtras(db);
  console.log('  Datos de ejemplo cargados (6 temas, artículos, assets, productos, preguntas, minijuegos y canciones).');
}

module.exports = { seed };
