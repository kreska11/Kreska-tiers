// Wspólny kod dla index.html i edytor.html
window.KT = (() => {
  const TIERS = ['HT1','LT1','HT2','LT2','HT3','LT3','HT4','LT4','HT5','LT5'];
  const TITLES = ['', '', 'Combat Ace', 'Combat Specialist', 'Combat Cadet', 'Combat Novice'];
  const REG = {EU:['Europa','#4fc27f'],NA:['Ameryka Płn.','#ef5d67'],SA:['Ameryka Płd.','#f0954a'],AS:['Azja','#b77ae6'],AU:['Oceania','#45b3e6'],ME:['Bliski Wschód','#e0b54a'],AF:['Afryka','#c8c56a']};
  const NICK = /^[A-Za-z0-9_]{3,16}$/;
  // Progi punktowe tierów (można je zmienić w config.js -> progi).
  const DEF_PROGI = {HT1:60,LT1:45,HT2:30,LT2:20,HT3:10,LT3:6,HT4:4,LT4:3,HT5:2,LT5:1};
  const PROGI = (() => {
    const c = window.KT_CONFIG && window.KT_CONFIG.progi;
    if (!c) return DEF_PROGI;
    const ok = TIERS.every((t, i) => Number.isInteger(c[t]) && c[t] >= 1 && c[t] <= 9999 && (i === 0 || c[t] < c[TIERS[i - 1]]));
    if (!ok) { console.warn('Błędne progi w config.js – używam domyślnych.'); return DEF_PROGI; }
    return Object.fromEntries(TIERS.map(t => [t, c[t]]));
  })();
  const tierFor = pts => TIERS.find(t => pts >= PROGI[t]) || null;
  const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tnum = t => t ? +t[2] : 0;
  const title = t => !t ? 'Bez tieru' : t === 'HT1' ? 'Combat Grandmaster' : t === 'LT1' ? 'Combat Master' : TITLES[tnum(t)];
  const tb = t => t ? `<span class="tb t${tnum(t)} ${t[0] === 'H' ? 'ht' : 'lt'}">${t}</span>` : '<span class="tb t0" title="Bez tieru">—</span>';
  const reg = k => `<span class="reg" style="--c:${REG[k][1]}" title="${REG[k][0]}">${k}</span>`;

  // Główka z gry: mc-heads.net, zapasowo minotar.net, a na końcu rysowana główka.
  const enc = encodeURIComponent;
  const avatar = nick => `<img class="head" src="https://mc-heads.net/avatar/${enc(nick)}/64" data-alt="https://minotar.net/helm/${enc(nick)}/64.png" data-nick="${esc(nick)}" alt="" width="40" height="40" loading="lazy" referrerpolicy="no-referrer">`;
  const body = nick => `<img class="body" src="https://mc-heads.net/body/${enc(nick)}/240" data-alt="https://minotar.net/armor/body/${enc(nick)}/240.png" data-nick="${esc(nick)}" data-kind="body" alt="Skin gracza ${esc(nick)}" referrerpolicy="no-referrer">`;

  const gen = new Map();
  function genHead(nick) {
    const key = nick.toLowerCase();
    if (gen.has(key)) return gen.get(key);
    let s = 2166136261;
    for (const ch of key) { s ^= ch.charCodeAt(0); s = Math.imul(s, 16777619) >>> 0; }
    const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const skins = [[247,203,164],[226,175,132],[196,140,98],[160,104,68],[236,190,150]];
    const hairs = [[60,40,24],[30,24,22],[120,74,36],[214,170,82],[160,48,36],[70,70,78]];
    const eyes = [[60,90,200],[50,120,60],[90,60,30],[40,40,40]];
    const sk = skins[Math.floor(rnd() * skins.length)], hr = hairs[Math.floor(rnd() * hairs.length)], ey = eyes[Math.floor(rnd() * eyes.length)];
    let r = '';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      let c = sk;
      if (y < 2 || (y === 2 && (x === 0 || x === 7))) c = hr;
      else if (y === 4 && (x === 1 || x === 6)) c = [245,245,245];
      else if (y === 4 && (x === 2 || x === 5)) c = ey;
      else if (y === 5 && (x === 3 || x === 4)) c = sk.map(v => v * .85);
      else if (y === 6 && x >= 2 && x <= 5) c = sk.map(v => v * .7);
      const f = .9 + rnd() * .14;
      r += `<rect x="${x}" y="${y}" width="1" height="1" fill="rgb(${c.map(v => Math.max(0, Math.min(255, Math.round(v * f)))).join(',')})"/>`;
    }
    const svg = `<svg class="head" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
    gen.set(key, svg);
    return svg;
  }
  // Gdy obrazek się nie wczyta: najpierw zapasowy serwis, potem rysowana główka.
  document.addEventListener('error', e => {
    const im = e.target;
    if (!(im instanceof HTMLImageElement) || !im.dataset.nick) return;
    if (im.dataset.alt && !im.dataset.fb) { im.dataset.fb = '1'; im.src = im.dataset.alt; return; }
    const box = document.createElement('div');
    box.innerHTML = genHead(im.dataset.nick);
    const svg = box.firstChild;
    if (im.dataset.kind === 'body') svg.classList.add('big');
    im.replaceWith(svg);
  }, true);

  // Czyta starą listę z gracze.js (do jednorazowego importu) i odrzuca błędne wpisy.
  function load() {
    const raw = Array.isArray(window.GRACZE) ? window.GRACZE : [];
    const out = [], bad = [], seen = new Set();
    raw.forEach((p, i) => {
      const nick = p && typeof p.nick === 'string' ? p.nick.trim() : '';
      const tier = p && typeof p.tier === 'string' ? p.tier.trim().toUpperCase() : '';
      const region = p && typeof p.region === 'string' ? p.region.trim().toUpperCase() : 'EU';
      if (!NICK.test(nick)) { bad.push(`wpis ${i + 1}: zły nick`); return; }
      if (!TIERS.includes(tier)) { bad.push(`${nick}: zły tier „${tier}”`); return; }
      if (seen.has(nick.toLowerCase())) { bad.push(`${nick}: gracz jest na liście dwa razy`); return; }
      seen.add(nick.toLowerCase());
      out.push({ nick, tier, region: Object.hasOwn(REG, region) ? region : 'EU' });
    });
    return { list: out, bad, missing: !Array.isArray(window.GRACZE) };
  }
  const sort = list => [...list].sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier) || a.nick.toLowerCase().localeCompare(b.nick.toLowerCase()));

  return { TIERS, PROGI, tierFor, REG, NICK, esc, tnum, title, tb, reg, avatar, body, genHead, load, sort };
})();

// Jeśli główny skrypt nie wystartuje (np. brak internetu), pokaż komunikat.
setTimeout(() => {
  if (window.KT_READY) return;
  const s = document.getElementById('status');
  if (s && !s.textContent) s.textContent = 'Nie udało się załadować strony. Sprawdź połączenie z internetem i odśwież stronę.';
}, 10000);

// ---------- Zakładki (Ranking / Kity) i widok kitów ----------
(() => {
  const $ = id => document.getElementById(id);
  const { esc } = window.KT;
  const IMG = /^[A-Za-z0-9_\-\/]+\.(png|jpe?g|webp|gif)$/i;
  let wybrany = 0;

  function kity() {
    const raw = Array.isArray(window.KITY) ? window.KITY : [];
    return raw.filter(k => k && typeof k.nazwa === 'string' && k.nazwa.trim());
  }
  function renderKity() {
    const list = kity();
    if (!$('kitPick')) return;
    if (!list.length) { $('kitPick').innerHTML = ''; $('kitView').innerHTML = '<div class="empty"><b>Brak kitów</b>Kity pojawią się tu wkrótce.</div>'; return; }
    if (wybrany >= list.length) wybrany = 0;
    $('kitPick').innerHTML = list.map((k, i) => `<button type="button" role="tab" class="kitchip" data-kit="${i}" aria-selected="${i === wybrany}">${typeof k.ikona === 'string' && IMG.test(k.ikona) ? `<img src="${esc(k.ikona)}" alt="">` : ''}${esc(k.nazwa)}</button>`).join('');
    const k = list[wybrany];
    const obrazki = (Array.isArray(k.obrazki) ? k.obrazki : []).filter(o => o && typeof o.plik === 'string' && IMG.test(o.plik));
    const ench = (Array.isArray(k.enchanty) ? k.enchanty : []).filter(e => e && e.co && e.ench);
    $('kitView').innerHTML = `<div class="kit">
      <div class="card kitlook"><h2 class="rb">Wygląd kita</h2>
        ${obrazki.length ? obrazki.map(o => `<figure class="kitimg"><img src="${esc(o.plik)}" alt="${esc(o.opis || k.nazwa)}" loading="lazy"><figcaption>${esc(o.opis || '')}</figcaption></figure>`).join('') : '<p class="sub">Brak obrazków.</p>'}
      </div>
      <div class="card"><h2 class="rb">Enchanty</h2>
        ${ench.length ? `<ul class="ench">${ench.map(e => `<li><b>${esc(e.co)}</b><span>${esc(e.ench)}</span></li>`).join('')}</ul>` : '<p class="sub">Bez enchantów.</p>'}
      </div>
    </div>`;
    // obrazek w 2x, żeby piksele były ostre
    $('kitView').querySelectorAll('.kitimg img').forEach(im => {
      const set = () => { if (im.naturalWidth) im.style.width = (im.naturalWidth * 2) + 'px'; };
      im.complete ? set() : im.addEventListener('load', set, { once: true });
    });
  }
  function route() {
    const k = location.hash === '#kity';
    ['hero', 'vRanking'].forEach(id => { const el = $(id); if (el) el.hidden = k; });
    if ($('vKity')) $('vKity').hidden = !k;
    const nr = $('navRanking'), nk = $('navKity');
    if (nr && nk) { nr.removeAttribute('aria-current'); nk.removeAttribute('aria-current'); (k ? nk : nr).setAttribute('aria-current', 'page'); }
    if (k) renderKity();
  }
  document.addEventListener('DOMContentLoaded', () => {
    if ($('kitPick')) $('kitPick').addEventListener('click', e => {
      const b = e.target.closest('[data-kit]'); if (!b) return;
      wybrany = +b.dataset.kit; renderKity();
    });
    const q = $('q');
    if (q) q.addEventListener('input', () => { if (location.hash === '#kity') location.hash = 'ranking'; });
    window.addEventListener('hashchange', route);
    route();
  });
})();
