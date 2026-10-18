'use strict';
/* Contenido propio del sitio (textos, fotos y preguntas) que se aplica UNA VEZ,
   justo después de crear la base de datos con los ejemplos. Los datos están en content.json
   y los archivos en public/uploads (miniaturas) y private/assets (descargas y juegos). */
const fs = require('fs');
const path = require('path');

function applyContent(db) {
  if (db.prepare("SELECT 1 FROM settings WHERE key = 'content_v1'").get()) return;
  let c;
  try { c = JSON.parse(fs.readFileSync(path.join(__dirname, 'content.json'), 'utf8')); } catch { return; }

  const upArticle = db.prepare('UPDATE articles SET content = ?, image = ? WHERE id = ?');
  for (const a of c.articles || []) upArticle.run(a.content, a.image, a.id);

  const upAsset = db.prepare('UPDATE assets SET category = ?, title = ?, description = ?, thumb = ?, file = ?, external_url = ?, min_xp = ? WHERE id = ?');
  for (const a of c.assets || []) upAsset.run(a.category, a.title, a.description, a.thumb, a.file, a.external_url, a.min_xp, a.id);

  if ((c.products || []).length) {
    db.prepare('DELETE FROM products').run();
    const ins = db.prepare('INSERT INTO products (section, topic_id, name, description, price, stock, image, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (const p of c.products) ins.run(p.section, p.topic_id, p.name, p.description, p.price, p.stock, p.image, p.active);
  }

  const upGame = db.prepare('UPDATE games SET prompt = ?, aliases = ?, answer = ?, options = ?, media = ? WHERE id = ?');
  for (const g of c.games || []) upGame.run(g.prompt, g.aliases, g.answer, g.options, g.media, g.id);
  for (const id of c.deleteGames || []) db.prepare('DELETE FROM games WHERE id = ?').run(id);
  for (const id of c.deleteSongs || []) db.prepare('DELETE FROM songs WHERE id = ?').run(id);

  db.prepare("INSERT INTO settings (key, value) VALUES ('content_v1', '1')").run();
}

module.exports = { applyContent };
