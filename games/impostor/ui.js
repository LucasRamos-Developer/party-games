import { createStore } from '../../assets/js/core/store.js';
import { storage } from '../../assets/js/core/storage.js';
import { createTimer } from '../../assets/js/core/timer.js';
import { boom, mountClock } from '../../assets/js/core/clock.js';
import { roomCode } from '../../assets/js/core/random.js';
import { $, esc } from '../../assets/js/core/dom.js';
import { MAX_PLAYERS, MIN_PLAYERS, impostorCount, newGame, reduce, roundInfo } from './state.js';
import { TIPS } from './tips.js';
import { createPractice } from '../../assets/js/core/practice.js';
import { mountHowTo } from '../../assets/js/core/shell.js';

const PHONE_KEY = 'impostor:phone';
const LAST_KEY = 'impostor:last';
const PLAYERS_KEY = 'players';
const PHONE_DISCUSS = 180;

const store = createStore({ key: 'impostor:local', reduce });
const play = $('#play');
const screen = $('#screen-game');

let mode = null; // 'local' | 'phone'
let phone = null; // { code, n, me, round, revealed }
let showing = false; // carta visível no modo um aparelho
let names = [];
let viewKey = null;

const clockBox = document.createElement('div');
clockBox.className = 'clock-wrap';
const clock = mountClock(clockBox, { onTap: () => timer.toggle(), label: 'Iniciar ou pausar a conversa' });
const timer = createTimer({
  duration: PHONE_DISCUSS,
  onTick: (r, t) => clock.update(r, t, { running: timer?.running ?? false }),
  onEnd: () => boom(screen),
});

let resumeAfterTips = false;
const practice = createPractice({
  tips: TIPS,
  tipKey: (s) => (s.phase === 'pass' && showing ? 'card' : s.phase),
  isDone: (action) => action.type === 'nextRound',
  onReal: () => startLocal(false),
  onAgain: () => startLocal(true),
  onShow: (on) => {
    if (on) {
      resumeAfterTips = timer.running;
      timer.pause();
    } else if (resumeAfterTips) timer.start();
  },
});
mountHowTo($('#menu-dialog'));

// ---------- navegação ----------

function show(name) {
  const game = name === 'game';
  $('#screen-pre').hidden = game;
  screen.hidden = !game;
  for (const s of ['home', 'local-setup', 'host', 'join']) $(`#screen-${s}`).hidden = s !== name;
  document.body.classList.toggle('is-playing', game);
}

async function goHome() {
  timer.reset();
  const [local, saved, last] = await Promise.all([store.loadSaved(), storage.load(PHONE_KEY), storage.load(LAST_KEY)]);
  $('#btn-resume').hidden = !((last === 'local' && local?.state) || (last === 'phone' && saved));
  show('home');
}

async function goLocalSetup() {
  const saved = await storage.load(PLAYERS_KEY);
  if (!names.length) names = (saved?.players ?? []).map((p) => p.name);
  renderNames();
  $('#local-error').textContent = '';
  show('local-setup');
}

function renderNames() {
  $('#player-count').textContent = `${names.length} jogador${names.length === 1 ? '' : 'es'}`;
  $('#player-list').innerHTML =
    names.map((n, i) => `<li class="name-chip">${esc(n)}<button type="button" class="icon-btn" data-remove="${i}" aria-label="Remover ${esc(n)}">×</button></li>`).join('') ||
    '<li class="muted">Adicione pelo menos 3 jogadores.</li>';
}

function enterLocal() {
  mode = 'local';
  viewKey = null;
  showing = false;
  storage.save(LAST_KEY, 'local');
  timer.reset(store.state.discuss);
  $('#btn-undo').hidden = false;
  show('game');
  render();
}

function enterPhone(session) {
  mode = 'phone';
  phone = { revealed: false, ...session };
  viewKey = null;
  storage.save(PHONE_KEY, phone);
  storage.save(LAST_KEY, 'phone');
  timer.reset(PHONE_DISCUSS);
  $('#btn-undo').hidden = true;
  show('game');
  render();
}

// ---------- render ----------

function render() {
  $('#practice-badge').hidden = !(mode === 'local' && store.state?.practice);
  if (mode === 'local') {
    renderLocal(store.state);
    practice.after(store.state);
  } else renderPhone();
}

function cardHtml(info, isImpostor) {
  return isImpostor
    ? `<div class="word-card secret-card is-impostor pop">
        <span class="q-kind">Você é o</span>
        <span class="word">IMPOSTOR</span>
        <span class="secret-cat">Categoria: <b>${esc(info.category)}</b></span>
        <span class="result-hint">Descubra a palavra pelas dicas dos outros!</span>
      </div>`
    : `<div class="word-card secret-card pop">
        <span class="q-kind">A palavra é</span>
        <span class="word">${esc(info.word)}</span>
        <span class="secret-cat">Categoria: ${esc(info.category)}</span>
      </div>`;
}

function renderLocal(s) {
  const n = s.players.length;
  const info = roundInfo(s.code, s.round, n);
  screen.style.setProperty('--clock', s.phase === 'result' ? (info.impostors.includes(s.vote) ? '#2bff88' : '#ff3b5c') : '#ff2e88');
  $('#hud-info').innerHTML = s.players
    .map((p, i) => `<li class="score-pill ${s.phase === 'pass' && i === s.revealIdx ? 'is-active' : ''}" style="--team:#ff2e88"><span class="score-name">${esc(p.name)}</span><b>${p.score}</b></li>`)
    .join('');
  $('#btn-undo').disabled = !store.canUndo;

  const key = `${s.phase}:${s.round}:${s.revealIdx}:${showing}`;
  if (key === viewKey) return;
  viewKey = key;

  if (s.phase === 'pass') {
    const p = s.players[s.revealIdx];
    play.innerHTML = showing
      ? `<div class="handoff">
          ${cardHtml(info, info.impostors.includes(s.revealIdx))}
          <button class="neon-btn big-cta" type="button" data-act="hide">Esconder e passar ›</button>
        </div>`
      : `<div class="handoff">
          <p class="who-kicker">Rodada ${s.round} · passe o aparelho para</p>
          <h2 class="who-title">${esc(p.name)}</h2>
          <p class="result-hint">Só ${esc(p.name)} pode olhar. ${s.revealIdx + 1} de ${n}.</p>
          <button class="neon-btn is-ok big-cta" type="button" data-act="show">👁 Ver minha carta</button>
        </div>`;
    return;
  }

  if (s.phase === 'discuss') {
    play.innerHTML = `
      <div class="handoff">
        <p class="who-kicker">Quem começa</p>
        <h2 class="who-title">${esc(s.players[info.starter].name)}</h2>
        <p class="result-hint">Na ordem, cada um diz uma palavra ligada à secreta. Depois, conversem!</p>
        <div data-slot="clock"></div>
        <button class="neon-btn is-ok big-cta" type="button" data-act="toVote">Ir para a votação</button>
      </div>`;
    play.querySelector('[data-slot="clock"]').replaceWith(clockBox);
    return;
  }

  if (s.phase === 'vote') {
    play.innerHTML = `
      <div class="who">
        <p class="who-kicker">Votação</p>
        <h2 class="who-title">Quem é o impostor?</h2>
        <p class="result-hint">Contem os votos e toquem no mais votado.</p>
      </div>
      <div class="picks vote-grid">
        ${s.players.map((p, i) => `<button class="pick" type="button" data-vote="${i}" style="--team:#ff2e88">${esc(p.name)}</button>`).join('')}
      </div>`;
    return;
  }

  const caught = info.impostors.includes(s.vote);
  play.innerHTML = `
    <div class="handoff">
      <p class="who-kicker">${caught ? 'Pegaram!' : 'Escapou!'}</p>
      <h2 class="who-title">${caught ? 'Impostor descoberto' : 'O impostor venceu'}</h2>
      <p class="reveal-line">${info.impostors.length > 1 ? 'Impostores' : 'Impostor'}: <b>${info.impostors.map((i) => esc(s.players[i].name)).join(' e ')}</b></p>
      <p class="reveal-line">A palavra era <b>${esc(info.word)}</b> (${esc(info.category)})</p>
      <p class="result-hint">${caught ? '+1 para cada um dos outros jogadores.' : `+2 para ${info.impostors.length > 1 ? 'cada impostor' : 'o impostor'}.`}</p>
      <button class="neon-btn is-ok big-cta" type="button" data-act="nextRound">Próxima rodada ›</button>
    </div>`;
}

function renderPhone() {
  const info = roundInfo(phone.code, phone.round, phone.n);
  const isImpostor = info.impostors.includes(phone.me);
  screen.style.setProperty('--clock', '#ff2e88');
  $('#hud-info').innerHTML = `
    <li class="score-pill is-active" style="--team:#ff2e88"><span class="score-name">Você</span><b>${phone.me + 1}</b></li>
    <li class="score-pill" style="--team:#ff8a00"><span class="score-name">Sala</span><b>${esc(phone.code)}</b></li>
    <li class="score-pill" style="--team:#00e5ff"><span class="score-name">Rodada</span><b>${phone.round}</b></li>`;

  play.innerHTML = `
    <div class="phone-layout">
      <button class="hold-card" type="button" id="hold" aria-label="Segure para ver sua carta">
        <span class="hold-hint">Toque e segure para ver sua carta</span>
        <span class="hold-secret">${cardHtml(info, isImpostor)}</span>
      </button>
      <p class="result-hint">Quem começa: <b>jogador ${info.starter + 1}</b> · ${phone.n} jogadores · ${impostorCount(phone.n)} impostor${impostorCount(phone.n) > 1 ? 'es' : ''}</p>
      <div data-slot="clock"></div>
      ${
        phone.revealed
          ? `<div class="word-card reveal-box">
              <p class="reveal-line">${info.impostors.length > 1 ? 'Impostores' : 'Impostor'}: <b>jogador ${info.impostors.map((i) => i + 1).join(' e ')}</b></p>
              <p class="reveal-line">A palavra era <b>${esc(info.word)}</b></p>
            </div>
            <button class="neon-btn is-ok" type="button" data-act="phoneNext">Próxima rodada › (todos tocam aqui)</button>`
          : `<button class="neon-btn is-bad" type="button" data-act="phoneReveal">Revelar impostor</button>`
      }
    </div>`;
  play.querySelector('[data-slot="clock"]').replaceWith(clockBox);
}

// ---------- eventos ----------

store.subscribe((s, action, prev) => {
  if (mode !== 'local' || screen.hidden) return;
  render();
  practice.check(action, s, prev);
});

document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]')?.dataset.go;
  if (go === 'home') goHome();
  if (go === 'local') goLocalSetup();
  if (go === 'host') {
    $('#host-code-box').hidden = true;
    show('host');
  }
  if (go === 'join') {
    $('#join-error').textContent = '';
    show('join');
  }
});

$('#player-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#player-name');
  const name = input.value.trim().replace(/\s+/g, ' ');
  if (!name) return;
  if (names.some((n) => n.toLowerCase() === name.toLowerCase())) {
    input.setCustomValidity('Já existe um jogador com esse nome.');
    input.reportValidity();
    return;
  }
  if (names.length >= MAX_PLAYERS) return;
  names.push(name);
  input.value = '';
  input.focus();
  renderNames();
});
$('#player-name').addEventListener('input', (e) => e.target.setCustomValidity(''));

$('#player-list').addEventListener('click', (e) => {
  const b = e.target.closest('[data-remove]');
  if (!b) return;
  names.splice(Number(b.dataset.remove), 1);
  renderNames();
});

function startLocal(isPractice) {
  if (names.length < MIN_PLAYERS) {
    $('#local-error').textContent = `Adicione pelo menos ${MIN_PLAYERS} jogadores.`;
    return;
  }
  practice.reset();
  const state = newGame({ players: names, discuss: Number($('#opt-discuss').value), code: roomCode() });
  if (isPractice) state.practice = true;
  store.start(state);
  enterLocal();
}

$('#btn-local-start').addEventListener('click', () => startLocal(false));
$('#btn-local-practice').addEventListener('click', () => startLocal(true));

let hostCode = null;
$('#btn-host-create').addEventListener('click', () => {
  const n = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Number($('#host-n').value) || MIN_PLAYERS));
  $('#host-n').value = String(n);
  hostCode = roomCode();
  $('#host-code').textContent = hostCode;
  $('#host-info').textContent = `${n} jogadores · ${impostorCount(n)} impostor${impostorCount(n) > 1 ? 'es' : ''}`;
  $('#host-code-box').hidden = false;
});
$('#btn-host-go').addEventListener('click', () => {
  enterPhone({ code: hostCode, n: Number($('#host-n').value), me: 0, round: 1 });
});

$('#btn-join-go').addEventListener('click', () => {
  const code = $('#join-code').value.trim().toUpperCase();
  const n = Number($('#join-n').value);
  const me = Number($('#join-me').value);
  let error = '';
  if (code.length < 4) error = 'Digite o código da sala.';
  else if (!(n >= MIN_PLAYERS && n <= MAX_PLAYERS)) error = `O total precisa ser de ${MIN_PLAYERS} a ${MAX_PLAYERS} jogadores.`;
  else if (!(me >= 1 && me <= n)) error = `Seu número precisa ser de 1 a ${n}.`;
  $('#join-error').textContent = error;
  if (!error) enterPhone({ code, n, me: me - 1, round: 1 });
});

$('#btn-resume').addEventListener('click', async () => {
  const [last, local, session] = await Promise.all([storage.load(LAST_KEY), store.loadSaved(), storage.load(PHONE_KEY)]);
  if (last === 'local' && local?.state) {
    store.restore(local);
    enterLocal();
  } else if (last === 'phone' && session?.code) {
    enterPhone(session);
  } else {
    goHome();
  }
});

play.addEventListener('click', (e) => {
  const vote = e.target.closest('[data-vote]');
  if (vote) {
    timer.pause();
    store.dispatch({ type: 'vote', player: Number(vote.dataset.vote) });
  }
  switch (e.target.closest('[data-act]')?.dataset.act) {
    case 'show':
      showing = true;
      render();
      break;
    case 'hide':
      showing = false;
      store.dispatch({ type: 'revealed' });
      break;
    case 'toVote':
      timer.pause();
      store.dispatch({ type: 'toVote' });
      break;
    case 'nextRound':
      timer.reset(store.state.discuss);
      store.dispatch({ type: 'nextRound' });
      break;
    case 'phoneReveal': {
      const dialog = $('#reveal-dialog');
      dialog.returnValue = '';
      dialog.showModal();
      break;
    }
    case 'phoneNext':
      phone = { ...phone, round: phone.round + 1, revealed: false };
      storage.save(PHONE_KEY, phone);
      timer.reset(PHONE_DISCUSS);
      render();
      break;
  }
});

// Segurar para ver a carta (solta = esconde).
const setHold = (on) => $('#hold')?.classList.toggle('is-open', on);
play.addEventListener('pointerdown', (e) => {
  if (e.target.closest('#hold')) setHold(true);
});
for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
  play.addEventListener(type, () => setHold(false));
}
play.addEventListener('contextmenu', (e) => {
  if (e.target.closest('#hold')) e.preventDefault();
});

$('#reveal-dialog').addEventListener('close', () => {
  if ($('#reveal-dialog').returnValue !== 'yes') return;
  phone = { ...phone, revealed: true };
  storage.save(PHONE_KEY, phone);
  timer.pause();
  render();
});

$('#btn-undo').addEventListener('click', () => {
  showing = false;
  store.undo();
});

$('#btn-menu').addEventListener('click', () => {
  const dialog = $('#menu-dialog');
  dialog.returnValue = '';
  dialog.showModal();
});
$('#menu-dialog').addEventListener('close', () => {
  if ($('#menu-dialog').returnValue === 'home') goHome();
});

const fs = $('#btn-fullscreen');
if (!document.fullscreenEnabled) fs.hidden = true;
fs.addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => {});
});

goHome();
