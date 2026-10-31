// Estrutura comum dos jogos em equipe: telas de setup/retomada, menu,
// desfazer, tela cheia, placar no topo (HUD) e rodada de treino. O markup
// esperado está nos index.html dos jogos (ids screen-*, teams-setup, btn-*…).

import { storage } from './storage.js';
import { mountTeamsSetup } from './teams-setup.js';
import { createPractice } from './practice.js';
import { $, esc } from './dom.js';

const PLAYERS_KEY = 'players'; // compartilhado entre os jogos da central
const PRE_SCREENS = ['loading', 'resume', 'setup'];

export const teamTag = (t) => `<span class="team-tag" style="--team:${t.color}"><span class="dot"></span>${esc(t.name)}</span>`;

export function renderScores(el, teams, activeId) {
  el.innerHTML = teams
    .map(
      (t) => `<li class="score-pill ${t.id === activeId ? 'is-active' : ''}" style="--team:${t.color}">
        <span class="dot"></span><span class="score-name">${esc(t.name)}</span><b>${t.score}</b>
      </li>`,
    )
    .join('');
}

// Diálogo "Como jogar" com o mesmo texto do card do setup.
export function mountHowTo(menu) {
  const how = document.querySelector('.how');
  if (!how) return;
  const dialog = document.createElement('dialog');
  dialog.id = 'how-dialog';
  dialog.innerHTML = `<form method="dialog" class="stack how">${how.innerHTML}<button class="btn btn-primary" value="ok">Entendi</button></form>`;
  document.body.append(dialog);
  const button = document.createElement('button');
  button.className = 'btn';
  button.value = 'how';
  button.textContent = 'Como jogar';
  menu.querySelector('h2').after(button);
  menu.addEventListener('close', () => {
    if (menu.returnValue === 'how') dialog.showModal();
  });
}

export function createShell({
  store,
  settingsKey,
  readOptions,
  writeOptions,
  newGame,
  onEnterGame = () => {},
  minPerTeam = 2,
  tips = {},
  tipKey,
  onTips,
  practiceDone = (action) => action.type === 'confirm' || action.type === 'next',
  summary = (s) =>
    s.teams.map((t) => `<li>${teamTag(t)} <span class="muted">${t.score} pts · ${t.players.map(esc).join(', ')}</span></li>`).join(''),
}) {
  let setup = null;

  const practice = createPractice({
    tips,
    tipKey,
    isDone: practiceDone,
    onShow: onTips,
    onReal: () => restart({ practice: false }),
    onAgain: () => restart({ practice: true }),
  });

  // Botão de treino ao lado de "Começar partida" e selo no placar do topo.
  const start = $('#btn-start');
  const row = document.createElement('div');
  row.className = 'start-row';
  start.before(row);
  row.append(start);
  row.insertAdjacentHTML('beforeend', '<button class="btn btn-lg" id="btn-practice" type="button">🎓 Rodada de treino</button>');
  $('.hud')?.insertAdjacentHTML('afterbegin', '<span class="practice-badge" id="practice-badge" hidden>🎓 Treino</span>');
  mountHowTo($('#menu-dialog'));

  function show(name) {
    const pre = name !== 'game';
    $('#screen-pre').hidden = !pre;
    $('#screen-game').hidden = pre;
    for (const s of PRE_SCREENS) $(`#screen-${s}`).hidden = s !== name;
    document.body.classList.toggle('is-playing', !pre);
  }

  async function enterSetup() {
    const [saved, players] = await Promise.all([storage.load(settingsKey), storage.load(PLAYERS_KEY)]);
    writeOptions(saved ?? {});
    $('#setup-error').textContent = '';
    setup = mountTeamsSetup($('#teams-setup'), { initial: players ?? {}, minPerTeam });
    show('setup');
  }

  function enterGame() {
    show('game');
    onEnterGame();
    $('#practice-badge').hidden = !store.state?.practice;
    practice.after(store.state);
  }

  function startGame(teams, settings, { practice: isPractice = false } = {}) {
    practice.reset();
    const state = newGame({ teams, settings });
    if (isPractice) state.practice = true;
    store.start(state);
    enterGame();
  }

  function restart(opts) {
    const s = store.state;
    startGame(
      s.teams.map(({ name, color, players }) => ({ name, color, players })),
      s.settings,
      opts,
    );
  }

  async function startFromSetup(opts) {
    const result = setup.getResult();
    if (!result.ok) {
      $('#setup-error').textContent = result.error;
      return;
    }
    const settings = readOptions();
    await Promise.all([storage.save(PLAYERS_KEY, result.snapshot), storage.save(settingsKey, settings)]);
    startGame(result.teams, settings, opts);
  }

  start.addEventListener('click', () => startFromSetup());
  $('#btn-practice').addEventListener('click', () => startFromSetup({ practice: true }));
  $('#btn-continue').addEventListener('click', enterGame);
  $('#btn-new').addEventListener('click', enterSetup);

  $('#btn-menu').addEventListener('click', () => {
    const dialog = $('#menu-dialog');
    dialog.returnValue = '';
    dialog.showModal();
  });
  $('#menu-dialog').addEventListener('close', () => {
    const value = $('#menu-dialog').returnValue;
    if (value === 'restart') restart();
    if (value === 'setup') enterSetup();
  });

  $('#btn-undo')?.addEventListener('click', () => store.undo());
  store.subscribe((s, action, prev) => {
    const undo = $('#btn-undo');
    if (undo) undo.disabled = !store.canUndo;
    if (!s || $('#screen-game').hidden) return;
    $('#practice-badge').hidden = !s.practice;
    practice.after(s);
    practice.check(action, s, prev);
  });

  const fs = $('#btn-fullscreen');
  if (fs) {
    if (!document.fullscreenEnabled) fs.hidden = true;
    fs.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.().catch(() => {});
    });
  }

  return {
    show,
    enterSetup,
    enterGame,
    restart,
    // Para mudanças de tela que não passam pelo store (ex.: "ver nota").
    tips: (state) => practice.after(state),
    async init(isResumable = (s) => s.phase !== 'won') {
      const saved = await store.loadSaved();
      if (saved?.state?.version === 1 && isResumable(saved.state)) {
        store.restore(saved);
        $('#resume-list').innerHTML = summary(saved.state);
        show('resume');
      } else {
        await enterSetup();
      }
    },
  };
}
