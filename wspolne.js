// Wspólny kod dla index.html i edytor.html
window.KT = (() => {
  const TIERS = ['HT1','LT1','HT2','LT2','HT3','LT3','HT4','LT4','HT5','LT5'];
  const TITLES = ['', '', 'Combat Ace', 'Combat Specialist', 'Combat Cadet', 'Combat Novice'];
  const REG = {EU:['Europa','#4fc27f'],NA:['Ameryka Płn.','#ef5d67'],SA:['Ameryka Płd.','#f0954a'],AS:['Azja','#b77ae6'],AU:['Oceania','#45b3e6'],ME:['Bliski Wschód','#e0b54a'],AF:['Afryka','#c8c56a']};
  const NICK = /^[A-Za-z0-9_]{3,16}$/;
  const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tnum = t => +t[2];
  const title = t => t === 'HT1' ? 'Combat Grandmaster' : t === 'LT1' ? 'Combat Master' : TITLES[tnum(t)];
  const tb = t => `<span class="tb t${tnum(t)} ${t[0] === 'H' ? 'ht' : 'lt'}">${t}</span>`;
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

  return { TIERS, REG, NICK, esc, tnum, title, tb, reg, avatar, body, genHead, load, sort };
})();

// Jeśli główny skrypt nie wystartuje (np. brak internetu), pokaż komunikat.
setTimeout(() => {
  if (window.KT_READY) return;
  const s = document.getElementById('status');
  if (s && !s.textContent) s.textContent = 'Nie udało się załadować strony. Sprawdź połączenie z internetem i odśwież stronę.';
}, 10000);
