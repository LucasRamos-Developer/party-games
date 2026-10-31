// Estrutura comum dos jogos em equipe: telas de setup/retomada, menu,
// desfazer, tela cheia e placar no topo (HUD). O markup esperado está nos
// index.html dos jogos (ids screen-*, teams-setup, btn-*, hud-teams…).

import { storage } from './storage.js';
import { mountTeamsSetup } from './teams-setup.js';
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

export function createShell({
  store,
  settingsKey,
  readOptions,
  writeOptions,
  newGame,
  onEnterGame = () => {},
  minPerTeam = 2,
  summary = (s) =>
    s.teams.map((t) => `<li>${teamTag(t)} <span class="muted">${t.score} pts · ${t.players.map(esc).join(', ')}</span></li>`).join(''),
}) {
  let setup = null;

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
  }

  function startGame(teams, settings) {
    store.start(newGame({ teams, settings }));
    enterGame();
  }

  function restart() {
    const s = store.state;
    startGame(
      s.teams.map(({ name, color, players }) => ({ name, color, players })),
      s.settings,
    );
  }

  $('#btn-start').addEventListener('click', async () => {
    const result = setup.getResult();
    if (!result.ok) {
      $('#setup-error').textContent = result.error;
      return;
    }
    const settings = readOptions();
    await Promise.all([storage.save(PLAYERS_KEY, result.snapshot), storage.save(settingsKey, settings)]);
    startGame(result.teams, settings);
  });
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
  store.subscribe(() => {
    const undo = $('#btn-undo');
    if (undo) undo.disabled = !store.canUndo;
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
