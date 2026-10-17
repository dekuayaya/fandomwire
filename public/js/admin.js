/* FandomWire — panel de administración */
(async () => {
  'use strict';
  try { await MF.ready; } catch { return; }

  const { api, esc, toast, fmtDate, fmtMoney } = MF;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = $('#admin-root');

  if (!MF.me) {
    root.innerHTML = `<div class="gate sec-musica" style="margin-top:40px"><div><h3>Zona de administración</h3><p>Inicia sesión con la cuenta de administrador.</p></div><a class="btn" href="/login.html?next=/admin.html">Iniciar sesión</a></div>`;
    return;
  }
  if (MF.me.role !== 'admin') {
    root.innerHTML = `<div class="empty" style="margin-top:40px">Esta zona es solo para administradores.</div>`;
    return;
  }

  const schema = await api('/api/admin/schema');
  const KIND_LABEL = { image: 'Imagen', video: 'Video', audio: 'Audio', file: 'Archivo' };
  const COL_LABEL = {
    name: 'Nombre', title: 'Título', section: 'Sección', topic_name: 'Tema', published: 'Estado', created_at: 'Fecha', category: 'Categoría',
    kind: 'Tipo', min_xp: 'XP', downloads: 'Descargas', price: 'Precio', stock: 'Stock', active: 'Estado', question: 'Pregunta', xp: 'XP', slug: 'Slug', prompt: 'Pregunta', type: 'Juego', answer: 'Respuesta', artist: 'Artista'
  };
  const GAME_LABEL = { personaje: 'Personaje', cancion: 'Canción', imagen: 'Imagen' };
  const TABS = [
    ['articles', 'Artículos'], ['assets', 'Assets'], ['products', 'Productos'], ['trivia', 'Preguntas'],
    ['games', 'Minijuegos'], ['songs', 'Canciones'], ['topics', 'Temas'], ['orders', 'Pedidos'], ['users', 'Usuarios']
  ];
  const sectionName = (k) => (schema.sections[k] ? schema.sections[k].name : k || '—');
  const ORDER_STATUSES = ['pendiente', 'pagado', 'entregado', 'cancelado'];

  let tab = new URLSearchParams(location.search).get('tab') || 'articles';
  if (!TABS.some(([k]) => k === tab)) tab = 'articles';
  let topics = [];
  let stats = {};
  let sectionFilter = '';

  async function refreshMeta() {
    [stats, topics] = await Promise.all([api('/api/admin/stats'), api('/api/admin/topics').then((r) => r.items)]);
  }

  /* ---------- armazón ---------- */
  function shell() {
    root.innerHTML = `<div class="admin">
      <nav class="admin__side" role="tablist" aria-label="Administración">
        ${TABS.map(([k, label]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${k === tab}">${esc(label)}</button>`).join('')}
      </nav>
      <section id="admin-main" aria-live="polite"></section></div>`;
    $$('[data-tab]').forEach((b) => b.addEventListener('click', () => {
      tab = b.dataset.tab; sectionFilter = '';
      history.replaceState(null, '', `?tab=${tab}`);
      $$('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      render();
    }));
  }

  function statsBand() {
    const items = [['Artículos', stats.articles], ['Assets', stats.assets], ['Productos', stats.products], ['Usuarios', stats.users], ['Minijuegos', stats.games], ['Canciones', stats.songs], ['Pedidos pendientes', stats.orders_pending]];
    return `<div class="admin__stats">${items.map(([l, n]) => `<div class="stat"><b>${n}</b><span>${esc(l)}</span></div>`).join('')}</div>`;
  }

  async function render() {
    const main = $('#admin-main');
    main.innerHTML = '<div class="skeleton"></div>';
    try {
      await refreshMeta();
      if (tab === 'orders') await renderOrders(main);
      else if (tab === 'users') await renderUsers(main);
      else await renderResource(main, tab);
    } catch (err) { main.innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
  }

  /* ---------- listados de recursos ---------- */
  function cell(key, col, row) {
    const v = row[col];
    switch (col) {
      case 'section': return esc(sectionName(v));
      case 'created_at': return esc(fmtDate(v));
      case 'published': case 'active': return `<span class="status-pill ${v ? 'status-pill--on' : 'status-pill--off'}">${key === 'products' ? (v ? 'A la venta' : 'Oculto') : (v ? (key === 'trivia' || key === 'games' ? 'Activo' : key === 'songs' ? 'Visible' : 'Publicado') : (key === 'trivia' || key === 'games' ? 'Pausado' : key === 'songs' ? 'Oculta' : 'Borrador'))}</span>`;
      case 'price': return esc(fmtMoney(v));
      case 'kind': return esc(KIND_LABEL[v] || v);
      case 'type': return esc(GAME_LABEL[v] || v);
      case 'answer': return esc(v);
      case 'topic_name': return v ? esc(v) : '<span class="muted">—</span>';
      case 'min_xp': return v ? `${v} XP` : '<span class="muted">libre</span>';
      default: return esc(v);
    }
  }

  async function renderResource(main, key) {
    const def = schema.resources[key];
    const { items } = await api(`/api/admin/${key}`);
    const hasSection = def.fields.some((f) => f.name === 'section');
    const rows = sectionFilter ? items.filter((r) => r.section === sectionFilter) : items;
    const filter = hasSection ? `<div class="tabs" style="margin-bottom:16px">
      ${[['', 'Todas'], ...Object.entries(schema.sections).map(([k, s]) => [k, s.name])].map(([k, label]) => `<button class="tab" type="button" data-filter="${k}" aria-pressed="${sectionFilter === k}">${esc(label)}</button>`).join('')}</div>` : '';
    main.innerHTML = `${statsBand()}
      <div class="admin__head"><h2>${esc(def.label)} <span class="muted small">${rows.length}</span></h2>
        <button class="btn btn--accent" type="button" id="new-btn">Nuevo ${esc(def.singular)}</button></div>
      ${filter}
      ${rows.length ? `<div class="table-wrap"><table class="data"><thead><tr>${def.listColumns.map((c) => `<th>${esc(COL_LABEL[c] || c)}</th>`).join('')}<th></th></tr></thead>
        <tbody>${rows.map((r) => `<tr>${def.listColumns.map((c) => `<td>${cell(key, c, r)}</td>`).join('')}
          <td><div class="actions"><button class="btn btn--sm btn--ghost" type="button" data-edit="${r.id}">Editar</button><button class="btn btn--sm btn--ghost" type="button" data-del="${r.id}">Borrar</button></div></td></tr>`).join('')}</tbody></table></div>`
        : `<div class="empty">Todavía no hay ${esc(def.label.toLowerCase())}${sectionFilter ? ' en esta sección' : ''}. Crea el primero con el botón de arriba.</div>`}`;

    $('#new-btn').addEventListener('click', () => openForm(key, null));
    $$('[data-filter]', main).forEach((b) => b.addEventListener('click', () => { sectionFilter = b.dataset.filter; renderResource(main, key); }));
    $$('[data-edit]', main).forEach((b) => b.addEventListener('click', () => openForm(key, items.find((r) => r.id === Number(b.dataset.edit)))));
    $$('[data-del]', main).forEach((b) => b.addEventListener('click', async () => {
      const row = items.find((r) => r.id === Number(b.dataset.del));
      const name = row.title || row.name || row.question || row.prompt || `#${row.id}`;
      if (!confirm(`¿Borrar "${name}"? No se puede deshacer.`)) return;
      try { await api(`/api/admin/${key}/${row.id}`, { method: 'DELETE' }); toast('Eliminado.', 'ok'); render(); }
      catch (err) { toast(err.message, 'error'); }
    }));
  }

  /* ---------- formulario ---------- */
  function upload(file, kind, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/admin/upload?kind=${kind}&name=${encodeURIComponent(file.name)}`);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
      xhr.onload = () => {
        let d = null; try { d = JSON.parse(xhr.responseText); } catch { /* sin cuerpo */ }
        if (xhr.status >= 200 && xhr.status < 300) resolve(d); else reject(new Error((d && d.error) || `Error ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error('Se cortó la conexión durante la subida.'));
      xhr.send(file);
    });
  }

  const mb = (n) => `${(n / 1048576).toFixed(n > 10485760 ? 0 : 1)} MB`;

  function fieldHtml(f, v) {
    const id = `f-${f.name}`;
    const label = `<label for="${id}">${esc(f.label)}${f.required ? ' *' : ''}</label>`;
    const help = f.help ? `<small>${esc(f.help)}</small>` : '';
    const wrap = (inner, cls = '') => `<div class="field ${cls}">${inner}</div>`;
    switch (f.type) {
      case 'text': return wrap(`${label}<input id="${id}" name="${f.name}" type="text" maxlength="${f.max || 200}" value="${esc(v ?? '')}">${help}`);
      case 'textarea': return wrap(`${label}<textarea id="${id}" name="${f.name}" rows="${f.rows || 4}" maxlength="${f.max || 2000}">${esc(v ?? '')}</textarea>${help}`, 'field--wide');
      case 'color': return wrap(`${label}<input id="${id}" name="${f.name}" type="text" placeholder="#RRGGBB" maxlength="7" value="${esc(v ?? '')}">${help}`);
      case 'url': return wrap(`${label}<input id="${id}" name="${f.name}" type="url" placeholder="https://" value="${esc(v ?? '')}">${help}`);
      case 'int': return wrap(`${label}<input id="${id}" name="${f.name}" type="number" min="${f.min}" max="${f.max}" value="${esc(v ?? f.default ?? 0)}">${help}`);
      case 'bool': return wrap(`<input id="${id}" name="${f.name}" type="checkbox" ${(v ?? f.default) ? 'checked' : ''}><label for="${id}">${esc(f.label)}</label>`, 'field--check');
      case 'select': {
        const opts = [...(f.allowEmpty ? [''] : []), ...f.values];
        const nm = (o) => (o === '' ? '(general)' : f.name === 'section' ? sectionName(o) : f.name === 'kind' ? KIND_LABEL[o] || o : f.name === 'type' ? GAME_LABEL[o] || o : o);
        return wrap(`${label}<select id="${id}" name="${f.name}">${opts.map((o) => `<option value="${esc(o)}" ${o === v ? 'selected' : ''}>${esc(nm(o))}</option>`).join('')}</select>${help}`);
      }
      case 'topic': return wrap(`${label}<select id="${id}" name="${f.name}"></select>${help}`);
      case 'category': return wrap(`${label}<input id="${id}" name="${f.name}" type="text" list="dl-category" maxlength="${f.max || 40}" value="${esc(v ?? '')}"><datalist id="dl-category"></datalist>${help}`);
      case 'thumb': case 'asset': {
        const isThumb = f.type === 'thumb';
        const accept = isThumb ? 'image/png,image/jpeg,image/webp,image/gif,image/avif' : '.png,.jpg,.jpeg,.webp,.gif,.avif,.mp4,.webm,.mov,.mp3,.wav,.ogg,.flac,.m4a,.zip,.pdf';
        return wrap(`<label for="${id}">${esc(f.label)}</label>
          <div class="upload" data-upload="${isThumb ? 'thumb' : 'asset'}">
            <div data-preview>${v ? (isThumb ? `<img class="upload__preview" src="${esc(v)}" alt="">` : `<small>Archivo actual: ${esc(v)}</small>`) : ''}</div>
            <div class="upload__row"><input id="${id}" type="file" accept="${accept}"><button class="btn btn--sm btn--ghost" type="button" data-clear>Quitar</button></div>
            <progress max="100" value="0" hidden></progress><small data-status></small>
            <input type="hidden" name="${f.name}" value="${esc(v ?? '')}">
          </div>${help}`, 'field--wide');
      }
      case 'options': return ''; // se arma junto con "answer"
      case 'answer': return '';
      default: return '';
    }
  }

  function optionsHtml(options, answer) {
    const rows = [0, 1, 2, 3].map((i) => `<div class="opt-row"><input type="radio" name="answer" value="${i}" ${answer === i ? 'checked' : ''} aria-label="Opción ${i + 1} es la correcta">
      <input type="text" data-opt maxlength="120" placeholder="Opción ${i + 1}${i < 2 ? ' (obligatoria)' : ''}" value="${esc(options[i] ?? '')}"></div>`).join('');
    return `<div class="field field--wide"><label>Opciones (marca la correcta) *</label>${rows}<small>Completa al menos 2 opciones y marca con el círculo cuál es la correcta.</small></div>`;
  }

  function openForm(key, row) {
    const def = schema.resources[key];
    const editing = !!row;
    let dlg = $('#admin-dialog');
    if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'admin-dialog'; dlg.className = 'dialog'; document.body.append(dlg); }

    const body = def.fields.map((f) => {
      if (f.type === 'options') return optionsHtml(row ? row.options : [], row ? row.answer : 0);
      return fieldHtml(f, row ? row[f.name] : undefined);
    }).join('');

    dlg.innerHTML = `<div class="dialog__bar"><h3>${editing ? 'Editar' : 'Nuevo'} ${esc(def.singular)}</h3><button class="btn btn--sm btn--ghost" type="button" data-close>Cerrar</button></div>
      <form class="dialog__body" id="admin-form" novalidate><div class="form-grid">${body}</div>
        <p class="form-error" role="alert" id="admin-err"></p>
        <div class="dialog__actions"><button class="btn btn--accent" type="submit">${editing ? 'Guardar cambios' : 'Crear'}</button><button class="btn btn--ghost" type="button" data-close>Cancelar</button></div></form>`;
    $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));
    const form = $('#admin-form', dlg);

    /* sección ↔ tema ↔ categorías */
    const secSel = $('[name=section]', form), topSel = $('[name=topic_id]', form), dl = $('#dl-category', form);
    const wantedTopic = row ? row.topic_id : null;
    function fillTopics(selected) {
      if (!topSel) return;
      const sec = secSel ? secSel.value : '';
      const list = topics.filter((t) => !sec || t.section === sec);
      topSel.innerHTML = `<option value="">(sin tema)</option>${list.map((t) => `<option value="${t.id}" ${t.id === selected ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}`;
    }
    function fillCategories() {
      if (!dl) return;
      const sec = secSel ? secSel.value : '';
      const cats = sec && schema.sections[sec] ? schema.sections[sec].categories : Object.values(schema.sections).flatMap((s) => s.categories);
      dl.innerHTML = [...new Set(cats)].map((c) => `<option value="${esc(c)}"></option>`).join('');
    }
    fillTopics(wantedTopic); fillCategories();
    if (secSel) secSel.addEventListener('change', () => { fillTopics(null); fillCategories(); });
    if (topSel && secSel) topSel.addEventListener('change', () => {
      const t = topics.find((x) => x.id === Number(topSel.value));
      if (t) { secSel.value = t.section; fillCategories(); }
    });

    /* subidas */
    $$('[data-upload]', form).forEach((box) => {
      const type = box.dataset.upload;
      const fileInput = $('input[type=file]', box), hidden = $('input[type=hidden]', box);
      const prog = $('progress', box), status = $('[data-status]', box), preview = $('[data-preview]', box);
      $('[data-clear]', box).addEventListener('click', () => { hidden.value = ''; fileInput.value = ''; preview.innerHTML = ''; status.textContent = ''; });
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;
        prog.hidden = false; prog.value = 0; status.textContent = `Subiendo ${file.name} (${mb(file.size)})…`;
        const submitBtn = $('[type=submit]', form); submitBtn.disabled = true;
        try {
          const r = await upload(file, type, (p) => { prog.value = p; });
          hidden.value = r.path;
          status.textContent = `Listo: ${r.original} (${mb(r.size)})`;
          if (type === 'thumb') preview.innerHTML = `<img class="upload__preview" src="${esc(r.path)}" alt="">`;
          else {
            preview.innerHTML = `<small>Archivo subido: ${esc(r.file)}</small>`;
            const kindSel = $('[name=kind]', form), titleIn = $('[name=title]', form);
            if (kindSel && r.kind) kindSel.value = r.kind;
            if (titleIn && !titleIn.value) titleIn.value = r.original.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
          }
        } catch (err) { status.textContent = ''; toast(err.message, 'error'); fileInput.value = ''; }
        prog.hidden = true; submitBtn.disabled = false;
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const out = {};
      for (const f of def.fields) {
        if (f.type === 'options') {
          out.options = $$('[data-opt]', form).map((i) => i.value.trim());
          const checked = $('[name=answer]:checked', form);
          const idxs = out.options.map((o, i) => (o ? i : -1)).filter((i) => i >= 0);
          const picked = checked ? Number(checked.value) : -1;
          out.options = out.options.filter(Boolean);
          out.answer = idxs.indexOf(picked);   // posición dentro de las opciones no vacías
          continue;
        }
        if (f.type === 'answer') continue;
        const el = $(`[name=${f.name}]`, form);
        if (!el) continue;
        out[f.name] = f.type === 'bool' ? el.checked : f.type === 'int' ? (el.value === '' ? '' : Number(el.value)) : el.value;
      }
      const err = $('#admin-err', form), btn = $('[type=submit]', form);
      err.textContent = ''; btn.disabled = true;
      try {
        if (editing) await api(`/api/admin/${key}/${row.id}`, { method: 'PUT', body: out });
        else await api(`/api/admin/${key}`, { method: 'POST', body: out });
        dlg.close();
        toast(editing ? 'Cambios guardados.' : 'Creado.', 'ok');
        render();
      } catch (e2) { err.textContent = e2.message; btn.disabled = false; }
    });
    dlg.showModal();
  }

  /* ---------- pedidos ---------- */
  async function renderOrders(main) {
    const { items } = await api('/api/admin/orders');
    main.innerHTML = `${statsBand()}<div class="admin__head"><h2>Pedidos <span class="muted small">${items.length}</span></h2></div>
      ${items.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>#</th><th>Cliente</th><th>Producto</th><th>Cant.</th><th>Total</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>
        ${items.map((o) => `<tr><td>${o.id}</td><td>${esc(o.username)}<br><span class="muted small">${esc(o.email)}</span></td><td>${esc(o.product_name)}</td><td>${o.qty}</td><td>${esc(fmtMoney(o.total))}</td><td>${esc(fmtDate(o.created_at))}</td>
        <td><select data-order="${o.id}" aria-label="Estado del pedido ${o.id}">${ORDER_STATUSES.map((s) => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>`
        : '<div class="empty">Todavía no hay pedidos.</div>'}`;
    $$('[data-order]', main).forEach((s) => s.addEventListener('change', async () => {
      try { await api(`/api/admin/orders/${s.dataset.order}`, { method: 'PUT', body: { status: s.value } }); toast('Estado actualizado.', 'ok'); }
      catch (err) { toast(err.message, 'error'); render(); }
    }));
  }

  /* ---------- usuarios ---------- */
  async function renderUsers(main) {
    const { items } = await api('/api/admin/users');
    main.innerHTML = `${statsBand()}<div class="admin__head"><h2>Usuarios <span class="muted small">${items.length}</span></h2></div>
      <div class="table-wrap"><table class="data"><thead><tr><th>Usuario</th><th>Email</th><th>XP</th><th>Racha</th><th>Registro</th><th>Rol</th><th></th></tr></thead><tbody>
      ${items.map((u) => `<tr><td>${esc(u.username)}</td><td>${esc(u.email)}</td><td>${u.xp}</td><td>${u.streak}</td><td>${esc(fmtDate(u.created_at))}</td>
        <td><select data-role="${u.id}" aria-label="Rol de ${esc(u.username)}" ${u.id === MF.me.id ? 'disabled' : ''}><option value="user" ${u.role === 'user' ? 'selected' : ''}>usuario</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option></select></td>
        <td><div class="actions">${u.id === MF.me.id ? '<span class="muted small">tú</span>' : `<button class="btn btn--sm btn--ghost" type="button" data-deluser="${u.id}" data-name="${esc(u.username)}">Eliminar</button>`}</div></td></tr>`).join('')}
      </tbody></table></div>`;
    $$('[data-role]', main).forEach((s) => s.addEventListener('change', async () => {
      try { await api(`/api/admin/users/${s.dataset.role}`, { method: 'PUT', body: { role: s.value } }); toast('Rol actualizado.', 'ok'); }
      catch (err) { toast(err.message, 'error'); render(); }
    }));
    $$('[data-deluser]', main).forEach((b) => b.addEventListener('click', async () => {
      if (!confirm(`¿Eliminar la cuenta de "${b.dataset.name}"? Se borran también sus pedidos.`)) return;
      try { await api(`/api/admin/users/${b.dataset.deluser}`, { method: 'DELETE' }); toast('Usuario eliminado.', 'ok'); render(); }
      catch (err) { toast(err.message, 'error'); }
    }));
  }

  shell();
  render();
})();
