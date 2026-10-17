/* FandomWire — editor de perfil en "Mi cuenta" */
(async () => {
  'use strict';
  try { await MF.ready; } catch { return; }
  const box = document.getElementById('profile-edit');
  if (!box) return;
  if (!MF.me) return; // la página redirige al login
  const { api, esc, toast } = MF;
  const choices = MF.meta.profile;
  const me = MF.me;

  const draft = {
    display_name: me.display_name || '', bio: me.bio || '',
    avatar_emoji: me.avatar.emoji || '', avatar_color: me.avatar.color || '',
    banner_color: me.banner_color || '', fav_topic_id: me.fav_topic_id || ''
  };
  let avatarImg = me.avatar.img || '';
  const HEX = /^#[0-9a-f]{6}$/i;

  box.innerHTML = `
    <div class="pe">
      <div class="pe__preview" aria-live="polite"><div id="pe-prev"></div></div>
      <form class="pe__form" id="pe-form" novalidate>
        <div class="field"><label for="pe-name">Nombre para mostrar</label><input id="pe-name" type="text" maxlength="30" value="${esc(draft.display_name)}" placeholder="${esc(me.username)}"><small>Tu usuario (@${esc(me.username)}) no cambia.</small></div>
        <div class="field"><label for="pe-bio">Bio <span class="muted small" id="pe-count"></span></label><textarea id="pe-bio" rows="3" maxlength="200" placeholder="Cuéntanos qué fandom te gusta…">${esc(draft.bio)}</textarea></div>

        <fieldset class="pe__set"><legend>Avatar</legend>
          <div class="emojis" role="group" aria-label="Emoji del avatar">
            <button type="button" class="emoji" data-emoji="" aria-pressed="${draft.avatar_emoji === ''}" title="Usar mi inicial">Aa</button>
            ${choices.emojis.map((e) => `<button type="button" class="emoji" data-emoji="${esc(e)}" aria-pressed="${draft.avatar_emoji === e}">${esc(e)}</button>`).join('')}
          </div>
          <div class="swatches" role="group" aria-label="Color del avatar">
            ${choices.colors.map((c) => `<button type="button" class="swatch" data-av-color="${c}" style="background:${c}" aria-label="Color ${c}" aria-pressed="${draft.avatar_color === c}"></button>`).join('')}
            <label class="swatch swatch--custom" title="Otro color"><input type="color" id="pe-av-custom" value="${HEX.test(draft.avatar_color) ? draft.avatar_color : '#4a3bff'}"><span aria-hidden="true">＋</span></label>
          </div>
          <div class="pe__photo"><label class="btn btn--sm btn--ghost" for="pe-photo">Subir foto</label><input id="pe-photo" type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden>
            <button type="button" class="btn btn--sm btn--ghost" id="pe-photo-rm" ${avatarImg ? '' : 'hidden'}>Quitar foto</button><small class="muted">png, jpg, gif o webp, hasta 2 MB. Si subes foto, se usa en lugar del emoji.</small></div>
        </fieldset>

        <fieldset class="pe__set"><legend>Banner</legend>
          <div class="swatches" role="group" aria-label="Color del banner">
            <button type="button" class="swatch swatch--none" data-bn-color="" aria-pressed="${draft.banner_color === ''}" aria-label="Sin color propio" title="Color por defecto">∅</button>
            ${choices.colors.map((c) => `<button type="button" class="swatch" data-bn-color="${c}" style="background:${c}" aria-label="Color ${c}" aria-pressed="${draft.banner_color === c}"></button>`).join('')}
            <label class="swatch swatch--custom" title="Otro color"><input type="color" id="pe-bn-custom" value="${HEX.test(draft.banner_color) ? draft.banner_color : '#4a3bff'}"><span aria-hidden="true">＋</span></label>
          </div>
        </fieldset>

        <div class="field"><label for="pe-topic">Tema favorito</label>
          <select id="pe-topic"><option value="">(ninguno)</option>${MF.meta.topics.map((t) => `<option value="${t.id}" ${Number(draft.fav_topic_id) === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div>

        <p class="form-error" id="pe-msg" role="alert"></p>
        <div class="dialog__actions"><button class="btn btn--accent" type="submit">Guardar perfil</button><a class="btn btn--ghost" href="/perfil.html?u=${encodeURIComponent(me.username)}">Ver mi perfil</a></div>
      </form>
    </div>`;

  const $ = (s) => box.querySelector(s);
  const $$ = (s) => [...box.querySelectorAll(s)];

  function preview() {
    const shown = draft.display_name.trim() || me.username;
    const banner = HEX.test(draft.banner_color) ? draft.banner_color : '';
    $('#pe-prev').innerHTML = `<div class="profile profile--mini"><div class="profile__banner" style="${banner ? `background:${banner}` : ''}"></div>
      <div class="profile__head"><div class="profile__avatar">${MF.avatar({ emoji: draft.avatar_emoji, color: draft.avatar_color, img: avatarImg }, shown, 72)}</div>
      <div class="profile__id"><h3>${esc(shown)}</h3><p class="muted small">@${esc(me.username)}</p></div></div>
      ${draft.bio.trim() ? `<p class="small">${esc(draft.bio.trim()).replace(/\n/g, '<br>')}</p>` : ''}</div>`;
    $('#pe-count').textContent = `${draft.bio.length}/200`;
    $$('[data-emoji]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.emoji === draft.avatar_emoji)));
    $$('[data-av-color]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.avColor === draft.avatar_color)));
    $$('[data-bn-color]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.bnColor === draft.banner_color)));
  }

  $('#pe-name').addEventListener('input', (e) => { draft.display_name = e.target.value; preview(); });
  $('#pe-bio').addEventListener('input', (e) => { draft.bio = e.target.value; preview(); });
  $('#pe-topic').addEventListener('change', (e) => { draft.fav_topic_id = e.target.value; });
  box.addEventListener('click', (e) => {
    const em = e.target.closest('[data-emoji]'); if (em) { draft.avatar_emoji = em.dataset.emoji; preview(); }
    const ac = e.target.closest('[data-av-color]'); if (ac) { draft.avatar_color = ac.dataset.avColor; preview(); }
    const bc = e.target.closest('[data-bn-color]'); if (bc) { draft.banner_color = bc.dataset.bnColor; preview(); }
  });
  $('#pe-av-custom').addEventListener('input', (e) => { draft.avatar_color = e.target.value; preview(); });
  $('#pe-bn-custom').addEventListener('input', (e) => { draft.banner_color = e.target.value; preview(); });

  $('#pe-photo').addEventListener('change', async (e) => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('La foto supera los 2 MB.', 'error'); return; }
    try {
      const res = await fetch(`/api/me/avatar?name=${encodeURIComponent(file.name)}`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file, credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      MF.me = data.user; avatarImg = data.user.avatar.img; $('#pe-photo-rm').hidden = false;
      MF.renderHeader(); preview(); toast('Foto actualizada.', 'ok');
    } catch (err) { toast(err.message, 'error'); }
  });
  $('#pe-photo-rm').addEventListener('click', async () => {
    try {
      const r = await api('/api/me/avatar', { method: 'DELETE' });
      MF.me = r.user; avatarImg = ''; $('#pe-photo-rm').hidden = true; MF.renderHeader(); preview();
    } catch (err) { toast(err.message, 'error'); }
  });

  $('#pe-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#pe-msg'); msg.className = 'form-error'; msg.textContent = '';
    try {
      const r = await api('/api/me/profile', { method: 'PUT', body: {
        display_name: draft.display_name, bio: draft.bio, avatar_emoji: draft.avatar_emoji, avatar_color: draft.avatar_color,
        banner_color: draft.banner_color, fav_topic_id: draft.fav_topic_id === '' ? null : Number(draft.fav_topic_id)
      } });
      MF.me = r.user; MF.renderHeader();
      msg.className = 'form-ok'; msg.textContent = 'Perfil guardado.';
    } catch (err) { msg.textContent = err.message; }
  });

  preview();
})();
