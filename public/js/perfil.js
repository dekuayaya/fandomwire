/* FandomWire — perfil público */
(async () => {
  'use strict';
  try { await MF.ready; } catch { return; }
  const { api, esc } = MF;
  const root = document.getElementById('profile-root');
  const name = MF.qs().get('u') || (MF.me && MF.me.username);

  if (!name) {
    root.innerHTML = `<div class="gate sec-musica"><div><h3>Inicia sesión para ver tu perfil</h3><p>También puedes ver el de otra persona desde el ranking.</p></div><a class="btn" href="${MF.loginUrl()}">Iniciar sesión</a></div>`;
    return;
  }
  let d;
  try { d = await api(`/api/users/${encodeURIComponent(name)}`); }
  catch (err) { root.innerHTML = MF.empty(err.status === 404 ? 'Ese perfil no existe.' : err.message); return; }

  const p = d.profile, s = d.stats;
  document.title = `${p.display_name || p.username} · Perfil · ${MF.meta.site}`;
  const banner = /^#[0-9a-f]{6}$/i.test(p.banner_color) ? p.banner_color : '';
  const shown = p.display_name || p.username;
  const np = d.now_playing;
  const stat = (n, l) => `<div class="stat"><b>${esc(n)}</b><span>${esc(l)}</span></div>`;

  root.innerHTML = `<article class="profile">
    <div class="profile__banner" style="${banner ? `background:${banner}` : ''}"></div>
    <div class="profile__head">
      <div class="profile__avatar">${MF.avatar(p.avatar, shown, 104)}</div>
      <div class="profile__id">
        <h1>${esc(shown)}</h1>
        <p class="muted">@${esc(p.username)} ${p.role === 'admin' ? '<span class="chip chip--solid">Admin</span>' : ''}</p>
      </div>
      ${d.is_me ? '<a class="btn btn--sm btn--ghost" href="/cuenta.html">Editar perfil</a>' : ''}
    </div>
    ${p.bio ? `<p class="profile__bio">${esc(p.bio).replace(/\n/g, '<br>')}</p>` : (d.is_me ? '<p class="muted">Aún no escribiste una bio. Puedes hacerlo en Mi cuenta.</p>' : '')}
    ${np ? `<div class="nowcard nowcard--profile">${np.art ? `<img src="${esc(np.art)}" alt="">` : '<span class="nowcard__noart" aria-hidden="true">🎵</span>'}<div class="nowcard__txt"><small class="muted">Escuchando ahora</small><b>${esc(np.title)}</b><span>${esc(np.artist)}</span></div></div>` : ''}
    <div class="stats4">${stat(s.xp, 'XP')}${stat(s.streak, 'racha')}${stat(s.best_streak, 'mejor racha')}${stat(s.rank ? `#${s.rank}` : '—', 'ranking')}</div>
    <div class="profile__cols">
      <section class="panel"><h2>Insignias</h2>
        ${d.badges.length ? `<ul class="badges">${d.badges.map((b) => `<li class="badge-card" title="${esc(b.desc)}"><span aria-hidden="true">${esc(b.icon)}</span><b>${esc(b.label)}</b><small>${esc(b.desc)}</small></li>`).join('')}</ul>` : MF.empty('Todavía sin insignias. Juega y suma XP para ganarlas.')}
      </section>
      <section class="panel"><h2>Actividad</h2>
        <ul class="plain">
          <li><b>${s.games_correct}</b> de <b>${s.games_done}</b> minijuegos acertados</li>
          <li><b>${s.quizzes}</b> quizzes jugados (<b>${s.quizzes_perfect}</b> perfectos)</li>
          ${p.fav_topic ? `<li>Tema favorito: <a class="chip" href="/tema.html?t=${encodeURIComponent(p.fav_topic.slug)}">${esc(p.fav_topic.name)}</a></li>` : ''}
          <li class="muted">Miembro desde ${esc(MF.fmtDate(p.joined))}</li>
        </ul>
        <a class="btn btn--sm btn--ghost" href="/juegos.html">Ir a los minijuegos</a>
      </section>
    </div>
  </article>`;
})();
