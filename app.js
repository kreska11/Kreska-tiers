// Kreska's tiers – logika strony (ranking, konta, panel).
// Bezpieczeństwo zapewniają reguły w firestore.rules – ten plik tylko pokazuje przyciski.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js';
import { getFirestore, collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js';

window.KT_READY = true;
const { TIERS, PROGI, tierFor, TRYBY, REG, NICK, esc, tnum, title, tb, reg, avatar, body } = window.KT;
const LEGACY = TRYBY.some(t => t.id === 'kreska') ? 'kreska' : TRYBY[0].id; // stare wpisy z jednym wynikiem
const trybName = id => (TRYBY.find(t => t.id === id) || {}).nazwa || id;
const nickCmp = (a, b) => a.nick.toLowerCase().localeCompare(b.nick.toLowerCase());
const bestTier = p => TIERS.find(t => TRYBY.some(m => Object.hasOwn(p.pts, m.id) && tierFor(p.pts[m.id]) === t)) || null;
const sumPts = p => TRYBY.reduce((s, m) => s + (Object.hasOwn(p.pts, m.id) ? p.pts[m.id] : 0), 0);
const PTS = /^\d{1,4}$/;
const CFG = window.KT_CONFIG || {};
const DOMAIN = 'gracze.kreska-tiers.example.com';
const OWNER = String(CFG.ownerNick || '').toLowerCase();
const $ = id => document.getElementById(id);
const emailOf = nick => nick.toLowerCase() + '@' + DOMAIN;

let players = [], ranked = [], loaded = false, query = '';
let me = null;            // { uid, nick, role, owner }
let users = [], unsubMe = null, unsubUsers = null;
let creating = false, typedNick = '', repairTried = false;
let editing = null, busy = false, openNick = null;
let mode = TRYBY[0].id;
try { const s = sessionStorage.getItem('kt-tryb'); if (TRYBY.some(t => t.id === s)) mode = s; } catch (e) { /* bez pamięci */ }

/* ---------- widok rankingu ---------- */
const staff = () => !!me && (me.owner || me.role === 'mod');
function status(t) { $('status').textContent = t || ''; }

function renderModes() {
  $('modes').innerHTML = TRYBY.map(t => `<button type="button" role="tab" class="mode" data-mode="${t.id}" aria-selected="${t.id === mode}"><img src="${esc(t.ikona)}" alt="">${esc(t.nazwa)}</button>`).join('');
  $('hTitle').textContent = 'Ranking ' + trybName(mode);
}
$('modes').addEventListener('click', e => {
  const b = e.target.closest('[data-mode]'); if (!b || b.dataset.mode === mode) return;
  mode = b.dataset.mode;
  try { sessionStorage.setItem('kt-tryb', mode); } catch (er) { /* bez pamięci */ }
  renderModes(); render();
});

function render() {
  // pozycje w każdym trybie
  players.forEach(p => { p.pos = {}; });
  for (const t of TRYBY) {
    players.filter(p => Object.hasOwn(p.pts, t.id)).sort((a, b) => b.pts[t.id] - a.pts[t.id] || nickCmp(a, b)).forEach((p, i) => { p.pos[t.id] = i + 1; });
  }
  ranked = players.filter(p => Object.hasOwn(p.pts, mode)).sort((a, b) => p_(a) - p_(b));
  function p_(p) { return p.pos[mode]; }
  const q = query.toLowerCase();
  const list = q ? ranked.filter(p => p.nick.toLowerCase().includes(q)) : ranked;
  $('sAll').textContent = loaded ? ranked.length : '–';
  $('sT1').textContent = loaded ? ranked.filter(p => tnum(tierFor(p.pts[mode])) === 1).length : '–';
  $('sTop').textContent = ranked[0] ? ranked[0].nick : '–';
  if (!$('aOv').hidden) renderPanel();
  if (!$('meOv').hidden) renderMe();
  if (openNick && !$('pOv').hidden) players.some(p => p.nick === openNick) ? showPlayer(openNick) : closeOv($('pOv'));
  if (!loaded && !list.length) return;
  $('rows').innerHTML = list.length ? list.map(p => { const v = p.pts[mode], t = tierFor(v), r = p.pos[mode]; return `<button class="row" type="button" data-nick="${esc(p.nick)}">
    <span class="rk${r < 4 ? ' r' + r : ''}">${r}</span>
    <span class="who">${avatar(p.nick)}<span><b>${esc(p.nick)}</b><small>${v} pkt · ${title(t)}</small></span></span>
    ${reg(p.region)}${tb(t)}</button>`; }).join('')
    : `<div class="empty">${q ? `<b>Brak wyników</b>Nie ma gracza z „${esc(query)}” w nicku w trybie ${esc(trybName(mode))}.` : `<b>Ranking jest pusty</b>W trybie ${esc(trybName(mode))} nie ma jeszcze graczy.`}</div>`;
}
renderModes();

$('guide').innerHTML = [1, 2, 3, 4, 5].map(n => `<div class="gt t${n}"><h3 class="rb">Tier ${n}</h3>
  <div class="pair"><div>${tb('HT' + n)}<span class="pts">od ${PROGI['HT' + n]} pkt</span></div><div>${tb('LT' + n)}<span class="pts">od ${PROGI['LT' + n]} pkt</span></div></div>
  <p>${n === 1 ? 'HT1: Combat Grandmaster · LT1: Combat Master' : title('HT' + n)}</p></div>`).join('');

/* ---------- okienka ---------- */
let lastFocus = null;
function openOv(ov) { lastFocus = document.activeElement; ov.hidden = false; ov.querySelector('.x').focus(); }
function closeOv(ov) {
  if (ov.hidden) return;
  ov.hidden = true;
  if (ov.id === 'pOv') openNick = null;
  if (lastFocus && lastFocus.isConnected) lastFocus.focus();
}
document.querySelectorAll('.ov').forEach(ov => ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-close]')) closeOv(ov); }));
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.ov').forEach(closeOv); });

function modeRows(p) {
  return TRYBY.map(t => {
    const has = Object.hasOwn(p.pts, t.id), v = p.pts[t.id];
    return `<div class="pmode"><span><img src="${esc(t.ikona)}" alt="">${esc(t.nazwa)}</span><span class="pmeta">${has ? `${v} pkt · #${p.pos[t.id]}` : 'brak'}</span>${tb(has ? tierFor(v) : null)}</div>`;
  }).join('');
}
function showPlayer(nick) {
  const p = players.find(x => x.nick === nick); if (!p) return;
  openNick = nick;
  $('prof').innerHTML = `${avatar(p.nick)}<h2 class="rb" id="pName">${esc(p.nick)}</h2><p class="ttl">${title(bestTier(p))}</p>
    <div class="pg two"><div><span>Punkty razem</span><b>${sumPts(p)}</b></div><div><span>Region</span><b>${REG[p.region][0]}</b></div></div>
    <div style="margin-top:12px">${modeRows(p)}</div>
    <a class="nmc" href="https://namemc.com/profile/${encodeURIComponent(p.nick)}" target="_blank" rel="noopener noreferrer">Zobacz na NameMC →</a>`;
  if ($('pOv').hidden) openOv($('pOv'));
}
$('rows').addEventListener('click', e => { const b = e.target.closest('.row'); if (b) showPlayer(b.dataset.nick); });
$('q').addEventListener('input', e => { query = e.target.value.trim(); render(); });
$('q').addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  e.preventDefault(); // bez tego ten sam Enter od razu „kliknąłby” przycisk zamykania profilu
  const q = query.toLowerCase();
  const p = ranked.find(x => x.nick.toLowerCase() === q) || ranked.find(x => x.nick.toLowerCase().includes(q)) || players.find(x => x.nick.toLowerCase() === q);
  if (q && p) showPlayer(p.nick);
});

/* ---------- start Firebase ---------- */
const f = CFG.firebase || {};
const configured = f.apiKey && f.projectId && !/WKLEJ/.test(JSON.stringify(f));
let auth = null, db = null;
if (!configured) {
  status('Strona nie jest jeszcze połączona z Firebase – uzupełnij plik config.js (instrukcja w JAK-WGRAC.txt).');
  $('rows').innerHTML = '<div class="empty"><b>Brak połączenia z bazą</b>Uzupełnij config.js.</div>';
} else {
  try {
    const app = initializeApp(f);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    status('Błędne dane w config.js – skopiuj je jeszcze raz z Firebase.');
  }
}

if (db) {
  const timer = setTimeout(() => { if (!loaded) status('Nie można połączyć się z bazą. Sprawdź internet i odśwież stronę.'); }, 10000);
  onSnapshot(collection(db, 'players'), snap => {
    players = [];
    snap.forEach(d => {
      const x = d.data() || {};
      // Punkty w trybach. Stare wpisy (jeden wynik albo sam tier) trafiają do trybu Kreska PvP.
      const ok = v => Number.isInteger(v) && v >= 0 && v <= 9999;
      const pts = {};
      if (x.pts && typeof x.pts === 'object') { for (const t of TRYBY) if (ok(x.pts[t.id])) pts[t.id] = x.pts[t.id]; }
      else if (ok(x.points)) pts[LEGACY] = x.points;
      else if (TIERS.includes(x.tier)) pts[LEGACY] = PROGI[x.tier];
      if (typeof x.nick === 'string' && NICK.test(x.nick) && Object.keys(pts).length)
        players.push({ id: d.id, nick: x.nick, pts, pos: {}, region: Object.hasOwn(REG, x.region) ? x.region : 'EU' });
    });
    if (!snap.metadata.fromCache) { loaded = true; clearTimeout(timer); if (/bazą/.test($('status').textContent)) status(''); }
    render();
  }, err => {
    loaded = true; clearTimeout(timer);
    status(err && err.code === 'permission-denied' ? 'Baza odrzuciła odczyt – sprawdź, czy reguły z firestore.rules są opublikowane.' : 'Utracono połączenie z bazą. Odśwież stronę.');
    render();
  });
}

/* ---------- konta ---------- */
function authError(e) {
  const c = (e && e.code) || '';
  if (c === 'auth/email-already-in-use') return 'Ten nick jest już zajęty.';
  if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found' || c === 'auth/invalid-login-credentials') return 'Zły nick lub hasło.';
  if (c === 'auth/too-many-requests') return 'Za dużo prób. Spróbuj ponownie za kilka minut.';
  if (c === 'auth/weak-password') return 'Hasło jest za słabe – użyj co najmniej 8 znaków.';
  if (c === 'auth/network-request-failed') return 'Brak połączenia z internetem.';
  if (c === 'auth/operation-not-allowed') return 'Logowanie hasłem nie jest włączone w Firebase (Authentication → Email/Password).';
  if (c === 'permission-denied') return 'Baza odrzuciła zapis – sprawdź reguły w Firebase.';
  return 'Coś poszło nie tak' + (c ? ' (' + c + ')' : '') + '.';
}

let authMode = 'login';
function setMode(m) {
  authMode = m;
  const reg = m === 'register';
  $('tabLogin').setAttribute('aria-selected', String(!reg));
  $('tabReg').setAttribute('aria-selected', String(reg));
  $('aPass2Row').hidden = !reg;
  $('aHint').hidden = !reg;
  $('aPass').autocomplete = reg ? 'new-password' : 'current-password';
  $('aSubmit').textContent = reg ? 'Zarejestruj się' : 'Zaloguj się';
  $('aMsg').textContent = '';
}
document.querySelectorAll('[data-auth]').forEach(b => b.addEventListener('click', () => {
  if (!auth) { status('Logowanie działa po uzupełnieniu config.js.'); return; }
  setMode(b.dataset.auth); $('authF').reset(); openOv($('authOv')); $('aNick').focus();
}));
$('tabLogin').addEventListener('click', () => setMode('login'));
$('tabReg').addEventListener('click', () => setMode('register'));

$('authF').addEventListener('submit', async e => {
  e.preventDefault();
  if (busy || !auth) return;
  const nick = $('aNick').value.trim(), pass = $('aPass').value, pass2 = $('aPass2').value;
  const msg = t => { $('aMsg').textContent = t; };
  if (!NICK.test(nick)) return msg('Nick musi mieć 3–16 znaków: litery, cyfry lub _.');
  if (authMode === 'register') {
    if (pass.length < 8) return msg('Hasło musi mieć co najmniej 8 znaków.');
    if (pass !== pass2) return msg('Hasła nie są takie same.');
  } else if (!pass) return msg('Wpisz hasło.');
  busy = true; $('aSubmit').disabled = true; msg('');
  typedNick = nick;
  try {
    if (authMode === 'register') {
      creating = true;
      const cred = await createUserWithEmailAndPassword(auth, emailOf(nick), pass);
      try {
        await setDoc(doc(db, 'users', cred.user.uid), { nick, nickLower: nick.toLowerCase(), role: 'player', createdAt: serverTimestamp() });
      } finally { creating = false; }
    } else {
      await signInWithEmailAndPassword(auth, emailOf(nick), pass);
    }
    closeOv($('authOv'));
    $('authF').reset();
  } catch (err) {
    creating = false;
    msg(authError(err));
  } finally {
    busy = false; $('aSubmit').disabled = false;
  }
});

$('logoutBtn').addEventListener('click', () => { if (auth) signOut(auth); });

function renderAcct() {
  $('acctOut').hidden = !!me;
  $('acctIn').hidden = !me;
  if (me) $('meBtn').innerHTML = `${avatar(me.nick)}<span>${esc(me.nick)}</span>`;
  $('panelBtn').hidden = !staff();
  $('ptPerms').hidden = !(me && me.owner);
  if (!staff()) closeOv($('aOv'));
  if ($('paPerms').hidden === false && !(me && me.owner)) showTab('players');
}

if (auth) onAuthStateChanged(auth, user => {
  if (unsubMe) { unsubMe(); unsubMe = null; }
  if (unsubUsers) { unsubUsers(); unsubUsers = null; }
  users = []; repairTried = false;
  if (!user) { me = null; renderAcct(); closeOv($('meOv')); return; }
  const owner = !!OWNER && user.email === emailOf(OWNER);
  const fallbackNick = (typedNick && emailOf(typedNick) === user.email) ? typedNick : (user.email || '').split('@')[0];
  me = { uid: user.uid, nick: fallbackNick, role: 'player', owner };
  renderAcct();
  unsubMe = onSnapshot(doc(db, 'users', user.uid), async snap => {
    if (!me || me.uid !== user.uid) return;
    if (snap.exists()) {
      const d = snap.data();
      if (typeof d.nick === 'string' && NICK.test(d.nick)) me.nick = d.nick;
      me.role = d.role === 'mod' ? 'mod' : 'player';
      renderAcct(); render();
    } else if (!snap.metadata.fromCache && !creating && !repairTried && NICK.test(me.nick)) {
      // Konto bez profilu (np. przerwana rejestracja) – dopisz profil gracza.
      repairTried = true;
      try { await setDoc(doc(db, 'users', user.uid), { nick: me.nick, nickLower: me.nick.toLowerCase(), role: 'player', createdAt: serverTimestamp() }); } catch (e) { /* zostaje zwykłym graczem */ }
    }
  }, () => {});
  if (owner) {
    unsubUsers = onSnapshot(collection(db, 'users'), snap => {
      users = [];
      snap.forEach(d => { const x = d.data() || {}; if (typeof x.nick === 'string' && NICK.test(x.nick)) users.push({ uid: d.id, nick: x.nick, role: x.role === 'mod' ? 'mod' : 'player' }); });
      users.sort((a, b) => a.nick.toLowerCase().localeCompare(b.nick.toLowerCase()));
      if (!$('aOv').hidden) renderPanel();
    }, () => { $('uMsg').textContent = 'Nie można wczytać kont – sprawdź reguły i nick właściciela w firestore.rules.'; $('uMsg').classList.add('err'); });
  }
});

/* ---------- mój profil ---------- */
function renderMe() {
  if (!me) return;
  const p = players.find(x => x.nick.toLowerCase() === me.nick.toLowerCase());
  const best = p ? bestTier(p) : null;
  const role = me.owner ? '<span class="role owner">Właściciel</span>' : me.role === 'mod' ? '<span class="role mod">Moderator</span>' : '<span class="role">Gracz</span>';
  $('meProf').innerHTML = `<div class="bodywrap">${body(me.nick)}</div>
    <h2 class="rb" id="meName">${esc(me.nick)}</h2>${role}
    ${p && best ? `<p class="ttl" style="margin-top:10px">${title(best)}</p>
      <div class="pg two"><div><span>Punkty razem</span><b>${sumPts(p)}</b></div><div><span>Region</span><b>${REG[p.region][0]}</b></div></div>
      <div style="margin-top:12px">${modeRows(p)}</div>`
    : `<div class="notier" style="margin-top:14px"><b>Nie masz jeszcze tiera</b>${p ? `Masz za mało punktów – pierwszy tier (LT5) jest od ${PROGI.LT5} pkt.` : 'Gdy zostaniesz przetestowany, Twój tier pojawi się tutaj.'}</div>`}`;
}
$('meBtn').addEventListener('click', () => { renderMe(); openOv($('meOv')); });

/* ---------- panel ---------- */
$('fModes').innerHTML = TRYBY.map(t => `<label>${esc(t.nazwa)} – punkty<span class="ptsrow"><input data-mode="${t.id}" type="number" min="0" max="9999" step="1" inputmode="numeric" placeholder="puste = nie gra"><span class="tprev"></span></span></label>`).join('');
const ptsInputs = () => [...$('fModes').querySelectorAll('input[data-mode]')];
function tierPrev() { ptsInputs().forEach(i => { const v = i.value.trim(); i.nextElementSibling.innerHTML = PTS.test(v) ? tb(tierFor(+v)) : ''; }); }
$('fModes').addEventListener('input', tierPrev);
$('fReg').innerHTML = Object.keys(REG).map(k => `<option value="${k}">${k} · ${REG[k][0]}</option>`).join('');
function fmsg(t, err) { $('fMsg').textContent = t; $('fMsg').classList.toggle('err', !!err); }
function resetForm() { editing = null; $('f').reset(); tierPrev(); $('fSave').textContent = 'Dodaj gracza'; $('fCancel').hidden = true; }
function showTab(t) {
  const perms = t === 'perms' && me && me.owner;
  $('ptPlayers').setAttribute('aria-selected', String(!perms));
  $('ptPerms').setAttribute('aria-selected', String(!!perms));
  $('paPlayers').hidden = !!perms; $('paPerms').hidden = !perms;
}
$('ptPlayers').addEventListener('click', () => showTab('players'));
$('ptPerms').addEventListener('click', () => showTab('perms'));

const oldList = () => (window.KT.load().list);
function renderPanel() {
  const all = [...players].sort(nickCmp);
  $('al').innerHTML = all.length ? all.map(p => `<li>${avatar(p.nick)}<span class="pl"><b>${esc(p.nick)}</b><small>${TRYBY.filter(t => Object.hasOwn(p.pts, t.id)).map(t => `${esc(t.nazwa)}: ${p.pts[t.id]} pkt (${tierFor(p.pts[t.id]) || 'bez tieru'})`).join(' · ')}</small></span>
    <button class="sm" type="button" data-edit="${esc(p.nick)}">Edytuj</button>
    <button class="sm del" type="button" data-del="${esc(p.nick)}">Usuń</button></li>`).join('') : '<li>Brak graczy w rankingu.</li>';
  const old = oldList();
  $('importBox').hidden = !old.length;
  $('importTxt').textContent = `W pliku gracze.js jest ${old.length} graczy ze starej wersji strony. Zaimportować ich do rankingu?`;
  if (me && me.owner) {
    $('ul').innerHTML = users.length ? users.map(u => {
      const own = u.nick.toLowerCase() === OWNER;
      return `<li>${avatar(u.nick)}<b>${esc(u.nick)}</b>${own ? '<span class="rl">Właściciel</span>'
        : `<span class="rl">${u.role === 'mod' ? 'Moderator' : 'Gracz'}</span><button class="sm${u.role === 'mod' ? ' on' : ''}" type="button" data-role="${esc(u.uid)}">${u.role === 'mod' ? 'Odbierz uprawnienia' : 'Daj uprawnienia'}</button>`}</li>`;
    }).join('') : '<li>Nikt się jeszcze nie zarejestrował.</li>';
  }
}
$('panelBtn').addEventListener('click', () => { if (!staff()) return; renderPanel(); fmsg(''); showTab('players'); openOv($('aOv')); $('fNick').focus(); });
$('fCancel').addEventListener('click', () => { resetForm(); fmsg(''); });

$('f').addEventListener('submit', async e => {
  e.preventDefault();
  if (busy || !staff()) return;
  const nick = $('fNick').value.trim(), region = $('fReg').value;
  if (!NICK.test(nick)) return fmsg('Nick musi mieć 3–16 znaków: litery, cyfry lub _.', true);
  if (!Object.hasOwn(REG, region)) return fmsg('Wybierz region.', true);
  const pts = {};
  for (const i of ptsInputs()) {
    const v = i.value.trim();
    if (v === '') continue;
    if (!PTS.test(v)) return fmsg(trybName(i.dataset.mode) + ': punkty muszą być liczbą całkowitą od 0 do 9999.', true);
    pts[i.dataset.mode] = +v;
  }
  if (!Object.keys(pts).length) return fmsg('Wpisz punkty przynajmniej w jednym trybie.', true);
  const summary = TRYBY.filter(t => Object.hasOwn(pts, t.id)).map(t => `${t.nazwa} ${pts[t.id]} pkt (${tierFor(pts[t.id]) || 'bez tieru'})`).join(', ');
  const id = nick.toLowerCase();
  const exists = players.find(p => p.id === id);
  const oldId = editing ? editing.toLowerCase() : null;
  if (editing && id !== oldId && exists) return fmsg('Gracz ' + exists.nick + ' już jest w rankingu.', true);
  busy = true; $('fSave').disabled = true;
  try {
    const data = { nick, pts, region, updatedAt: serverTimestamp() };
    if (editing && id !== oldId) {
      const b = writeBatch(db);
      b.set(doc(db, 'players', id), data);
      b.delete(doc(db, 'players', oldId));
      await b.commit();
    } else {
      await setDoc(doc(db, 'players', id), data);
    }
    fmsg((editing || exists ? 'Zapisano: ' : 'Dodano: ') + nick + ' – ' + summary);
    resetForm(); $('fNick').focus();
  } catch (err) { fmsg(authError(err), true); }
  finally { busy = false; $('fSave').disabled = false; }
});

$('al').addEventListener('click', async e => {
  const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
  if (ed) {
    const p = players.find(x => x.nick === ed.dataset.edit); if (!p) return;
    editing = p.nick; $('fNick').value = p.nick; $('fReg').value = p.region;
    ptsInputs().forEach(i => { i.value = Object.hasOwn(p.pts, i.dataset.mode) ? p.pts[i.dataset.mode] : ''; }); tierPrev();
    $('fSave').textContent = 'Zapisz zmiany'; $('fCancel').hidden = false; fmsg('Edytujesz: ' + p.nick); $('fNick').focus();
  }
  if (del && !busy) {
    if (!del.classList.contains('armed')) {
      del.classList.add('armed'); del.textContent = 'Na pewno?';
      setTimeout(() => { if (del.isConnected) { del.classList.remove('armed'); del.textContent = 'Usuń'; } }, 4000);
      return;
    }
    const nick = del.dataset.del; busy = true; del.disabled = true;
    try { await deleteDoc(doc(db, 'players', nick.toLowerCase())); if (editing === nick) resetForm(); fmsg('Usunięto: ' + nick); }
    catch (err) { fmsg(authError(err), true); }
    finally { busy = false; if (del.isConnected) del.disabled = false; }
  }
});

$('importBtn').addEventListener('click', async () => {
  if (busy || !staff()) return;
  const old = oldList(); if (!old.length) return;
  busy = true; $('importBtn').disabled = true;
  try {
    for (let i = 0; i < old.length; i += 400) {
      const b = writeBatch(db);
      old.slice(i, i + 400).forEach(p => b.set(doc(db, 'players', p.nick.toLowerCase()), { nick: p.nick, pts: { [LEGACY]: PROGI[p.tier] }, region: p.region, updatedAt: serverTimestamp() }));
      await b.commit();
    }
    fmsg('Zaimportowano ' + old.length + ' graczy. Teraz możesz usunąć plik gracze.js z GitHuba.');
    window.GRACZE = []; renderPanel();
  } catch (err) { fmsg(authError(err), true); }
  finally { busy = false; $('importBtn').disabled = false; }
});

$('ul').addEventListener('click', async e => {
  const b = e.target.closest('[data-role]');
  if (!b || busy || !(me && me.owner)) return;
  const u = users.find(x => x.uid === b.dataset.role); if (!u) return;
  const role = u.role === 'mod' ? 'player' : 'mod';
  busy = true; b.disabled = true;
  try {
    await updateDoc(doc(db, 'users', u.uid), { role });
    $('uMsg').classList.remove('err');
    $('uMsg').textContent = role === 'mod' ? u.nick + ' może teraz dodawać graczy.' : u.nick + ' nie ma już uprawnień.';
  } catch (err) { $('uMsg').classList.add('err'); $('uMsg').textContent = authError(err); }
  finally { busy = false; if (b.isConnected) b.disabled = false; }
});

render();
