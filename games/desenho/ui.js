import { storage } from '../../assets/js/core/storage.js';
import { createDie, renderPips } from '../../assets/js/core/dice.js';
import { createTimer, formatTime } from '../../assets/js/core/timer.js';
import { mountTeamsSetup } from '../../assets/js/core/teams-setup.js';
import { $, esc } from '../../assets/js/core/dom.js';
import {
  CATEGORIES,
  drawerOf,
  lastCell,
  migrate,
  newGame,
  positionLabel,
  reduce,
  roundTypeFor,
} from './state.js';
import { createBoardView } from './board.js';

const SAVE_KEY = 'desenho:current';
const SETUP_KEY = 'desenho:setup';
const PLAYERS_KEY = 'players'; // compartilhado entre os jogos da central
const HISTORY_MAX = 40;
const SCREENS = ['loading', 'resume', 'setup'];
const ALL_COLOR = '#ff8a00'; // "todos jogam" usa o laranja do tabuleiro
const SHORT_NAME = { P: 'Pessoa', O: 'Objeto', A: 'Ação', D: 'Difícil', L: 'Lazer', M: 'Mix' };

const STYLE_TEXT = {
  desenho: { role: 'Desenhista' },
  mimica: { role: 'Mímico' },
};

let game = null; // { state, history }
let setup = null;
let busy = false;
let pendingCategory = null; // categoria marcada antes de iniciar (opcional)
let forceAll = false; // "todos jogam" forçado para a próxima rodada
let resultKey = null;
let selectedRound = null;
let bigDie = null;
const selected = new Set();

const boards = { small: createBoardView($('#board-mini')), large: createBoardView($('#board-large')) };
const timer = createTimer({ onTick: updateClock, onEnd: boom });

// Destaca a face sorteada dentro de um grupo de botões [data-face].
const highlightFace = (node, value) =>
  node.querySelectorAll('[data-face]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.face === String(value))));

$('#cats').innerHTML =
  CATEGORIES.map(
    (c) => `<button class="cat" type="button" data-face="${c.key}" title="${esc(c.name)}" aria-pressed="false">
      <b>${c.key}</b><small>${SHORT_NAME[c.key]}</small>
    </button>`,
  ).join('') + `<button class="cat cat-die" type="button" id="btn-roll-cat" title="Sortear categoria"><b>🎲</b><small>Sortear</small></button>`;
const catDie = createDie($('#cats'), CATEGORIES.map((c) => c.key), { render: highlightFace });

const text = () => STYLE_TEXT[game.state.settings.style] ?? STYLE_TEXT.desenho;
const settings = () => game.state.settings;
const activeBoard = () => boards[settings().board] ?? null;

function showPre(name) {
  $('#screen-pre').hidden = false;
  $('#screen-game').hidden = true;
  for (const s of SCREENS) $(`#screen-${s}`).hidden = s !== name;
  document.body.classList.remove('is-playing');
}

function showGame() {
  $('#screen-pre').hidden = true;
  $('#screen-game').hidden = false;
  document.body.classList.add('is-playing');
}

// Rodada coletiva? Vale para a rodada em andamento ou para a próxima.
function isAllRound(s) {
  if (s.round) return s.round.type !== 'normal';
  return forceAll || roundTypeFor(s, s.current) !== 'normal';
}

function clockColor(s) {
  if (s.phase === 'won') return s.teams[s.winner].color;
  if (s.phase === 'move') return s.teams[s.mover].color;
  return isAllRound(s) ? ALL_COLOR : s.teams[s.current].color;
}

// ---------- estado ----------

function save() {
  storage.save(SAVE_KEY, game);
}

async function dispatch(action) {
  const prev = game.state;
  const next = reduce(prev, action);
  if (next === prev) return;
  game.history.push(prev);
  if (game.history.length > HISTORY_MAX) game.history.shift();
  game.state = next;
  save();

  if (prev.phase === 'drawing' && next.phase !== 'drawing') timer.reset(next.settings.timer);
  const board = activeBoard();
  if (action.type === 'move' && board) {
    setBusy(true);
    await board.animateMove(next.current, prev.teams[next.current].pos, next.teams[next.current].pos);
    setBusy(false);
  }
  render();
}

// Ajustes não entram no histórico do desfazer.
function applySettings(patch) {
  const next = reduce(game.state, { type: 'settings', patch });
  if (next === game.state) return;
  const before = game.state.settings;
  game.state = next;
  save();
  timer.setSound(next.settings.sound);
  if (next.settings.timer !== before.timer && !timer.running && timer.remaining === timer.total) {
    timer.reset(next.settings.timer);
  }
  if (next.settings.board !== before.board) placeBoards();
  render();
}

function undo() {
  if (busy || !game.history.length) return;
  game.state = { ...game.history.pop(), settings: game.state.settings };
  selected.clear();
  pendingCategory = null;
  forceAll = false;
  resultKey = null;
  timer.reset(game.state.settings.timer);
  save();
  render();
}

function setBusy(value) {
  busy = value;
  document.body.classList.toggle('is-busy', value);
  $('#btn-undo').disabled = value || !game?.history.length;
}

// ---------- render ----------

function placeBoards() {
  const mode = settings().board;
  $('#board-mini').hidden = mode !== 'small';
  $('#board-large').hidden = mode !== 'large';
  $('#stage').classList.toggle('has-board', mode === 'large');
}

function render() {
  const s = game.state;
  const focus = s.phase === 'won' ? s.winner : s.phase === 'move' ? s.mover : s.current;
  for (const b of Object.values(boards)) b.renderPawns(s.teams, focus);

  if (s.round?.id !== selectedRound) {
    selectedRound = s.round?.id ?? null;
    selected.clear();
  }

  $('#screen-game').style.setProperty('--clock', clockColor(s));
  $('#timer-area').dataset.phase = s.phase;

  renderWho(s);
  renderCats(s);
  renderResult(s);
  renderSidebar(s);
  updateClock(timer.remaining, timer.total);
  $('#btn-undo').disabled = busy || !game.history.length;
}

function renderWho(s) {
  const t = text();
  let kicker;
  let title;
  let chips = '';
  if (s.phase === 'won') {
    kicker = 'Fim de jogo';
    title = `🏆 ${s.teams[s.winner].name} venceu!`;
  } else if (s.phase === 'move') {
    kicker = 'Acertou!';
    title = s.teams[s.mover].name;
  } else if (isAllRound(s)) {
    const r = s.round;
    const starter = s.teams[r?.starter ?? s.current];
    const teams = r ? r.participants.map((id) => s.teams[id]) : s.teams;
    const type = r?.type ?? roundTypeFor(s, s.current);
    kicker = r?.tie
      ? 'Desempate · nova carta, mesma categoria'
      : type === 'final'
        ? `${starter.name} está no Fim · se acertar primeiro, vence`
        : type === 'escolha'
          ? `${starter.name} escolhe a categoria`
          : `Rodada de ${starter.name}`;
    title = 'Todos jogam';
    chips = teams
      .map((tm) => `<span class="chip" style="--team:${tm.color}"><span class="dot"></span>${esc(tm.name)} · ${esc(drawerOf(tm))}</span>`)
      .join('');
  } else {
    const team = s.teams[s.current];
    kicker = 'Vez da equipe';
    title = team.name;
    chips = `<span class="chip" style="--team:${team.color}">${t.role}: <b>${esc(drawerOf(team))}</b></span>`;
  }
  $('#who-kicker').textContent = kicker;
  $('#who-title').textContent = title;
  $('#who-chips').innerHTML = chips;
}

function renderCats(s) {
  const ready = s.phase === 'ready';
  $('#cats').classList.toggle('is-locked', !ready);
  $('#btn-roll-cat').hidden = !settings().virtualDice;
  $('#cats').querySelectorAll('button').forEach((b) => (b.disabled = !ready || busy));
  if (!catDie.rolling) catDie.set(ready ? pendingCategory : (s.round?.category ?? null));
}

function renderResult(s) {
  const el = $('#result');
  const key = `${s.phase}:${s.round?.id ?? ''}:${s.mover ?? ''}:${s.winner ?? ''}:${settings().virtualDice}`;
  const fresh = key !== resultKey;
  resultKey = key;

  if (s.phase === 'ready') {
    el.innerHTML = `<p class="result-hint">Escolha a categoria (opcional) e toque no relógio para começar.</p>`;
    return;
  }

  if (s.phase === 'drawing') {
    const r = s.round;
    if (r.type === 'normal') {
      el.innerHTML = `
        <div class="duo">
          <button class="neon-btn is-ok" type="button" data-act="hit"><span aria-hidden="true">✓</span> Acertou</button>
          <button class="neon-btn is-bad" type="button" data-act="miss"><span aria-hidden="true">✗</span> Errou</button>
        </div>`;
      return;
    }
    const n = selected.size;
    const label =
      n === 0 ? 'Ninguém acertou' : n === 1 ? `${esc(s.teams[[...selected][0]].name)} acertou primeiro` : `Empate entre ${n} equipes`;
    el.innerHTML = `
      <div class="picks">
        ${r.participants
          .map((id) => {
            const tm = s.teams[id];
            return `<button class="pick" type="button" data-act="toggle" data-team="${id}" aria-pressed="${selected.has(id)}" style="--team:${tm.color}">
              <span class="pick-check" aria-hidden="true">✓</span>${esc(tm.name)}
            </button>`;
          })
          .join('')}
      </div>
      <button class="neon-btn ${n === 0 ? 'is-bad' : 'is-ok'}" type="button" data-act="confirm">${label}</button>`;
    return;
  }

  if (s.phase === 'move') {
    if (!fresh) return;
    if (settings().virtualDice) {
      el.innerHTML = `
        <div class="roll">
          <div class="big-die" id="big-die"></div>
          <p class="roll-text" id="roll-text">Rolando o dado…</p>
        </div>`;
      bigDie = createDie($('#big-die'), [1, 2, 3, 4, 5, 6], { render: renderPips, duration: 900 });
      autoRoll();
    } else {
      el.innerHTML = `
        <p class="result-hint">Quantas casas o peão anda?</p>
        <div class="nums">
          ${[1, 2, 3, 4, 5, 6].map((n) => `<button class="num" type="button" data-act="move" data-n="${n}">${n}</button>`).join('')}
        </div>`;
    }
    return;
  }

  el.innerHTML = `
    <div class="duo">
      <button class="neon-btn is-ok" type="button" data-act="restart">Jogar de novo</button>
      <button class="neon-btn" type="button" data-act="setup">Mudar equipes</button>
    </div>`;
}

async function autoRoll() {
  setBusy(true);
  const value = await bigDie.roll();
  $('#roll-text').textContent = `Ande ${value} casa${value > 1 ? 's' : ''}!`;
  await new Promise((r) => setTimeout(r, 1100));
  setBusy(false);
  await dispatch({ type: 'move', value });
}

function renderSidebar(s) {
  const t = text();
  const team = s.teams[s.phase === 'move' ? s.mover : s.phase === 'won' ? s.winner : s.current];
  const all = s.phase !== 'move' && s.phase !== 'won' && isAllRound(s);
  const card = $('#turn-card');
  card.style.setProperty('--team', all ? ALL_COLOR : team.color);
  card.innerHTML = all
    ? `<span class="turn-kicker">Vez de ${esc(team.name)}</span><strong>Todos jogam</strong><span class="turn-sub">Cada equipe com seu ${t.role.toLowerCase()}</span>`
    : `<span class="turn-kicker">Vez da</span><strong>${esc(team.name)}</strong><span class="turn-sub">${t.role}: ${esc(drawerOf(team))}</span>`;

  const natural = s.phase === 'ready' && roundTypeFor(s, s.current) !== 'normal';
  const allBtn = $('#btn-all');
  allBtn.setAttribute('aria-pressed', String(all));
  allBtn.disabled = s.phase !== 'ready' || natural || busy;
  allBtn.title = natural ? 'O peão está numa casa de todos jogam' : 'Forçar todos jogam na próxima rodada';

  const focus = s.phase === 'move' ? s.mover : s.current;
  $('#team-list').innerHTML = s.teams
    .map(
      (tm) => `
      <li class="team-item ${tm.id === focus ? 'is-active' : ''}" style="--team:${tm.color}">
        <span class="team-dot">${tm.id + 1}</span>
        <span class="team-name">${esc(tm.name)}<small>${t.role}: ${esc(drawerOf(tm))}</small></span>
        <span class="team-pos">${positionLabel(s, tm.pos)}</span>
        <span class="team-bar"><span style="width:${(tm.pos / lastCell(s)) * 100}%"></span></span>
      </li>`,
    )
    .join('');
  $('#last-log').textContent = s.log[0] ?? '';
}

function updateClock(remaining, total) {
  const done = remaining <= 0;
  const running = timer?.running ?? false;
  $('#clock-time').textContent = done ? 'Tempo!' : formatTime(remaining);
  $('#clock-progress').style.strokeDashoffset = String(100 - (remaining / total) * 100);
  const area = $('#timer-area');
  area.classList.toggle('is-running', running);
  area.classList.toggle('is-warn', running && remaining <= 10000);
  area.classList.toggle('is-danger', running && remaining <= 3000);
  area.classList.toggle('is-done', done);
  const phase = game?.state.phase;
  $('#clock-hint').textContent =
    phase !== 'drawing'
      ? 'Toque para começar'
      : running
        ? 'Toque para pausar'
        : done
          ? 'Toque para recomeçar'
          : remaining < total
            ? 'Pausado · toque para continuar'
            : 'Toque para começar';
}

function boom() {
  const screen = $('#screen-game');
  screen.classList.remove('is-boom');
  void screen.offsetWidth; // reinicia a animação
  screen.classList.add('is-boom');
  setTimeout(() => screen.classList.remove('is-boom'), 1400);
}

function renderAdjust() {
  const s = game.state;
  const ready = s.phase === 'ready';
  $('#adjust-list').innerHTML =
    s.teams
      .map(
        (t) => `
      <li class="adjust-item" style="--team:${t.color}">
        <span class="team-dot">${t.id + 1}</span>
        <span class="grow">${esc(t.name)}</span>
        <button class="icon-btn" type="button" data-adjust="${t.id}" data-delta="-1" ${!ready || t.pos === 0 ? 'disabled' : ''} aria-label="Voltar uma casa">−</button>
        <span class="adjust-pos">${positionLabel(s, t.pos)}</span>
        <button class="icon-btn" type="button" data-adjust="${t.id}" data-delta="1" ${!ready || t.pos === lastCell(s) ? 'disabled' : ''} aria-label="Avançar uma casa">+</button>
      </li>`,
      )
      .join('') + (ready ? '' : '<li class="muted small">Termine a rodada para ajustar.</li>');
}

function renderSettings() {
  const st = settings();
  $('#set-timer').textContent = `${st.timer} s`;
  $('#set-dice').checked = st.virtualDice;
  $('#set-sound').checked = st.sound;
  for (const [id, value] of [
    ['#set-board', st.board],
    ['#set-style', st.style],
  ]) {
    $(id).querySelectorAll('[data-value]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === value)));
  }
  renderAdjust();
}

// ---------- telas ----------

function enterGame() {
  showGame();
  placeBoards();
  boards.small.build(game.state.board);
  boards.large.build(game.state.board);
  selectedRound = game.state.round?.id ?? null;
  resultKey = null;
  pendingCategory = null;
  forceAll = false;
  selected.clear();
  timer.setSound(settings().sound);
  timer.reset(settings().timer);
  render();
}

async function enterSetup() {
  const [saved, players] = await Promise.all([storage.load(SETUP_KEY), storage.load(PLAYERS_KEY)]);
  const st = migrate({ settings: saved?.settings }).settings;
  $('#opt-timer').value = String(st.timer);
  $('#opt-style').value = st.style;
  $('#opt-board').value = st.board;
  $('#opt-board-size').value = st.boardSize;
  $('#opt-dice').checked = st.virtualDice;
  $('#setup-error').textContent = '';
  setup = mountTeamsSetup($('#teams-setup'), { initial: players ?? {} });
  showPre('setup');
}

function startGame(teams, gameSettings) {
  game = { state: newGame({ teams, settings: gameSettings }), history: [] };
  save();
  enterGame();
}

function restartSameTeams() {
  const s = game.state;
  startGame(
    s.teams.map(({ name, color, players }) => ({ name, color, players })),
    s.settings,
  );
}

// ---------- eventos ----------

// O relógio é o botão principal: inicia a rodada e depois pausa/continua.
$('#clock').addEventListener('click', async () => {
  if (busy) return;
  const s = game.state;
  if (s.phase === 'ready') {
    const action = { type: 'start', category: pendingCategory, all: forceAll };
    pendingCategory = null;
    forceAll = false;
    await dispatch(action);
    timer.start();
  } else if (s.phase === 'drawing') {
    timer.toggle();
  }
});

// Reiniciar no meio da rodada pergunta o resultado antes.
$('#btn-restart').addEventListener('click', () => {
  const s = game.state;
  if (s.phase !== 'drawing') {
    timer.reset(settings().timer);
    return;
  }
  $('#restart-options').innerHTML =
    s.round.participants
      .map((id) => {
        const tm = s.teams[id];
        return `<button class="pick" type="button" data-winner="${id}" style="--team:${tm.color}">${esc(tm.name)} acertou</button>`;
      })
      .join('') + `<button class="neon-btn is-bad" type="button" data-winner="none">Ninguém acertou</button>`;
  const dialog = $('#restart-dialog');
  dialog.returnValue = '';
  dialog.showModal();
});

$('#restart-options').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-winner]');
  if (!b) return;
  $('#restart-dialog').close('result');
  timer.pause();
  await dispatch({ type: 'result', winners: b.dataset.winner === 'none' ? [] : [Number(b.dataset.winner)] });
});

$('#restart-dialog').addEventListener('close', () => {
  if ($('#restart-dialog').returnValue === 'time') timer.reset(settings().timer);
});

$('#cats').addEventListener('click', async (e) => {
  if (busy || game.state.phase !== 'ready') return;
  if (e.target.closest('#btn-roll-cat')) {
    setBusy(true);
    catDie.rolling = true;
    pendingCategory = await catDie.roll();
    catDie.rolling = false;
    setBusy(false);
    render();
    return;
  }
  const b = e.target.closest('[data-face]');
  if (!b) return;
  pendingCategory = pendingCategory === b.dataset.face ? null : b.dataset.face;
  renderCats(game.state);
});

$('#result').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || busy) return;
  const s = game.state;
  switch (b.dataset.act) {
    case 'hit':
      timer.pause();
      await dispatch({ type: 'result', winners: [s.round.starter] });
      break;
    case 'miss':
      timer.pause();
      await dispatch({ type: 'result', winners: [] });
      break;
    case 'toggle': {
      const id = Number(b.dataset.team);
      selected.has(id) ? selected.delete(id) : selected.add(id);
      renderResult(s);
      break;
    }
    case 'confirm': {
      const winners = [...selected];
      selected.clear();
      timer.pause();
      await dispatch({ type: 'result', winners });
      break;
    }
    case 'move':
      await dispatch({ type: 'move', value: Number(b.dataset.n) });
      break;
    case 'restart':
      restartSameTeams();
      break;
    case 'setup':
      enterSetup();
      break;
  }
});

$('#btn-all').addEventListener('click', () => {
  if (game.state.phase !== 'ready') return;
  forceAll = !forceAll;
  render();
});

$('#side-toggle').addEventListener('click', () => {
  const open = !document.body.classList.contains('side-open');
  document.body.classList.toggle('side-open', open);
  $('#side-toggle').setAttribute('aria-expanded', String(open));
});

$('#btn-undo').addEventListener('click', undo);

$('#btn-settings').addEventListener('click', () => {
  renderSettings();
  $('#settings-dialog').showModal();
});

$('#settings-dialog').addEventListener('click', async (e) => {
  const step = e.target.closest('[data-step]');
  if (step) applySettings({ timer: settings().timer + Number(step.dataset.step) });
  const seg = e.target.closest('[data-value]');
  if (seg) applySettings({ [seg.parentElement.id === 'set-board' ? 'board' : 'style']: seg.dataset.value });
  const adjust = e.target.closest('[data-adjust]');
  if (adjust) {
    const team = game.state.teams[Number(adjust.dataset.adjust)];
    await dispatch({ type: 'setPos', team: team.id, pos: team.pos + Number(adjust.dataset.delta) });
  }
  if (step || seg || adjust) renderSettings();
});

$('#set-dice').addEventListener('change', (e) => applySettings({ virtualDice: e.target.checked }));
$('#set-sound').addEventListener('change', (e) => applySettings({ sound: e.target.checked }));

$('#btn-menu').addEventListener('click', () => {
  const dialog = $('#menu-dialog');
  dialog.returnValue = '';
  dialog.showModal();
});

$('#menu-dialog').addEventListener('close', () => {
  const value = $('#menu-dialog').returnValue;
  if (value === 'restart') restartSameTeams();
  if (value === 'setup') enterSetup();
});

const fsButton = $('#btn-fullscreen');
if (!document.fullscreenEnabled) fsButton.hidden = true;
fsButton.addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => {});
});

$('#btn-continue').addEventListener('click', enterGame);
$('#btn-new').addEventListener('click', enterSetup);

$('#btn-start').addEventListener('click', async () => {
  const result = setup.getResult();
  if (!result.ok) {
    $('#setup-error').textContent = result.error;
    return;
  }
  const gameSettings = {
    timer: Number($('#opt-timer').value),
    style: $('#opt-style').value,
    board: $('#opt-board').value,
    boardSize: $('#opt-board-size').value,
    virtualDice: $('#opt-dice').checked,
  };
  await Promise.all([storage.save(PLAYERS_KEY, result.snapshot), storage.save(SETUP_KEY, { settings: gameSettings })]);
  startGame(result.teams, gameSettings);
});

// ---------- início ----------

(async function init() {
  const saved = await storage.load(SAVE_KEY);
  if (saved?.state?.version === 1 && saved.state.phase !== 'won') {
    migrate(saved.state);
    saved.history = (saved.history ?? []).map(migrate);
    game = saved;
    $('#resume-list').innerHTML = saved.state.teams
      .map(
        (t) =>
          `<li><span class="team-tag" style="--team:${t.color}"><span class="dot"></span>${esc(t.name)}</span> <span class="muted">${positionLabel(saved.state, t.pos)} · ${t.players.map(esc).join(', ')}</span></li>`,
      )
      .join('');
    showPre('resume');
  } else {
    await enterSetup();
  }
})();
