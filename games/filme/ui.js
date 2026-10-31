import { createStore } from '../../assets/js/core/store.js';
import { createShell, renderScores } from '../../assets/js/core/shell.js';
import { buzz, skip } from '../../assets/js/core/sound.js';
import { celebrate } from '../../assets/js/core/fireworks.js';
import { $, esc } from '../../assets/js/core/dom.js';
import { FILMES } from './filmes.js';
import { DEFAULT_SETTINGS, STAGES, newGame, reduce, shownFilms, stagePoints } from './state.js';
import { TIPS } from './tips.js';

const store = createStore({ key: 'filme:current', reduce });
const play = $('#play');
const screen = $('#screen-game');
const byTitle = (a, b) => FILMES[a].titulo.localeCompare(FILMES[b].titulo, 'pt');
// Busca sem acento e sem maiúscula: "pequena sereia" acha "A Pequena Sereia".
const fold = (text) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const matches = (i) => fold(FILMES[i].titulo).includes(fold(query.trim()));

const shell = createShell({
  store,
  settingsKey: 'filme:setup',
  tips: TIPS,
  practiceDone: (action) => action.type === 'next',
  minPerTeam: 1,
  newGame: ({ teams, settings }) => newGame({ teams, settings }),
  readOptions: () => ({ perTeam: Number($('#opt-per-team').value) }),
  writeOptions: (saved) => {
    $('#opt-per-team').value = String({ ...DEFAULT_SETTINGS, ...saved }.perTeam);
  },
  onEnterGame: () => {
    query = '';
    render(store.state);
  },
});

let pending = null; // filme tocado na lista, esperando confirmar o chute
let query = ''; // texto da busca na lista; limpa a cada filme novo
let popped = null; // última pista animada: só anima de novo quando a pista muda

store.subscribe((s, action) => {
  if (!s) return;
  pending = null;
  if (action.type === 'next') query = '';
  if (action.type === 'guess') s.turn.result === 'hit' ? celebrate({ color: s.teams[s.current].color }) : buzz();
  if (action.type === 'clue') skip();
  if (action.type === 'giveUp') buzz();
  if (!screen.hidden) render(s);
});

// Etapa com imagem (quando o usuário adicionou frames) ou pista em texto.
function stageContent(film, stage) {
  const frame = film.frames?.[stage];
  if (frame) {
    return `<img class="frame" src="frames/${esc(film.id)}/${esc(frame)}" alt="Etapa ${stage + 1}">`;
  }
  return `<p class="clue">${esc(film.etapas[stage])}</p>`;
}

function resultText(team, t) {
  if (t.result === 'hit') return `Ponto para ${esc(team.name)}!`;
  if (t.result === 'miss') return `${esc(team.name)} chutou <b>${esc(FILMES[t.guess].titulo)}</b> e zerou`;
  return `${esc(team.name)} não pontuou`;
}

function render(s) {
  const team = s.teams[s.current] ?? s.teams[s.winner];
  screen.style.setProperty('--clock', s.phase === 'won' ? s.teams[s.winner].color : team.color);
  renderScores($('#hud-teams'), s.teams, s.phase === 'won' ? s.winner : s.current);

  if (s.phase === 'play' || s.phase === 'reveal') {
    const t = s.turn;
    const film = FILMES[t.film];
    const steps = Array.from({ length: STAGES }, (_, i) => {
      const state = i < t.stage ? 'is-past' : i === t.stage ? 'is-now' : '';
      return `<li class="${state}">${stagePoints(i)}</li>`;
    }).join('');
    const top = `
      <div class="who">
        ${s.tiebreak ? '<span class="chip" style="--team:#ff8a00">Desempate!</span>' : ''}
        <p class="who-kicker">Vez da ${esc(team.name)} · dica: ${esc(film.dica)}</p>
        <ol class="stages" aria-label="Pontos por etapa">${steps}</ol>
      </div>`;

    if (s.phase === 'play') {
      // Etapas já abertas ficam visíveis, a atual em destaque.
      const key = `${s.turnCount}:${t.stage}`;
      const pop = popped === key ? '' : 'pop';
      popped = key;
      const opened = Array.from({ length: t.stage + 1 }, (_, i) => i)
        .reverse()
        .map((i) => `<div class="stage-card ${i === t.stage ? `word-card ${pop}` : 'is-old'}">${i === t.stage ? '' : `<span class="stage-num">Pista ${i + 1}</span>`}${stageContent(film, i)}</div>`)
        .join('');
      const options = shownFilms(t)
        .sort(byTitle)
        .map((i) => `<li data-film-item="${i}" ${matches(i) ? '' : 'hidden'}><button class="film-opt" type="button" data-film="${i}" aria-pressed="${i === pending}">${esc(FILMES[i].titulo)}</button></li>`)
        .join('');
      const confirm =
        pending === null
          ? ''
          : `<div class="modal-backdrop" data-act="cancel">
              <div class="guess-confirm pop" role="dialog" aria-modal="true" aria-labelledby="guess-title">
                <p class="who-kicker">Confirmar o chute</p>
                <h2 class="guess-title" id="guess-title">${esc(FILMES[pending].titulo)}</h2>
                <p class="guess-warn">Valendo <b>${stagePoints(t.stage)}</b> pontos. Se errar, zera!</p>
                <div class="duo">
                  <button class="neon-btn" type="button" data-act="cancel">Cancelar</button>
                  <button class="neon-btn is-ok" type="button" data-act="confirm">Confirmar</button>
                </div>
              </div>
            </div>`;
      const last = t.stage === STAGES - 1;
      play.innerHTML = `
        ${top}
        <div class="filme-board">
          <div class="clues">
            <div class="stage-stack">${opened}</div>
            <p class="prize-now">Valendo <b>${stagePoints(t.stage)}</b> pontos · pista ${t.stage + 1} de ${STAGES}</p>
            <button class="neon-btn is-skip" type="button" data-act="clue" ${last ? 'disabled' : ''}>${
              last ? 'Esta é a última pista' : `Próxima pista · vale ${stagePoints(t.stage + 1)}`
            }</button>
            <button class="link-btn" type="button" data-act="giveUp">Desistir deste filme</button>
          </div>
          <section class="guesses" aria-label="Lista de filmes">
            <p class="guesses-head">Qual é o filme? <span>${shownFilms(t).length} na lista · errou, zera</span></p>
            <input class="film-search" type="search" placeholder="Buscar filme…" value="${esc(query)}" aria-label="Buscar filme" autocomplete="off">
            <p class="film-none muted" ${shownFilms(t).some(matches) ? 'hidden' : ''}>Nenhum filme da lista com esse nome.</p>
            <ul class="film-list">${options}</ul>
            ${confirm}
          </section>
        </div>`;
      return;
    }

    play.innerHTML = `
      ${top}
      <div class="handoff">
        ${t.result === 'hit' ? '<p class="hit-banner">Acertou!</p>' : ''}
        <p class="who-kicker">O filme era</p>
        <h2 class="who-title title-reveal pop">${esc(film.titulo)}</h2>
        ${t.result === 'hit' ? `<p class="hit-points">+${t.points} pontos</p>` : ''}
        <p class="review-total">${resultText(team, t)}</p>
        <button class="neon-btn is-ok big-cta" type="button" data-act="next">Próximo filme ›</button>
      </div>`;
    return;
  }

  const winner = s.teams[s.winner];
  play.innerHTML = `
    <div class="winner">
      <h2 class="who-title">${esc(winner.name)} venceu!</h2>
      <ol class="final-scores">
        ${[...s.teams]
          .sort((a, b) => b.score - a.score)
          .map((tm) => `<li style="--team:${tm.color}"><span>${esc(tm.name)}</span><span>${tm.score} pts</span></li>`)
          .join('')}
      </ol>
      <div class="duo">
        <button class="neon-btn is-ok" type="button" data-act="restart">Jogar de novo</button>
        <button class="neon-btn" type="button" data-act="setup">Mudar equipes</button>
      </div>
    </div>`;
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && pending !== null) {
    pending = null;
    render(store.state);
  }
});

// Filtra só escondendo itens, sem redesenhar: o campo não perde o foco.
play.addEventListener('input', (e) => {
  if (!e.target.matches('.film-search')) return;
  query = e.target.value;
  let any = false;
  for (const li of play.querySelectorAll('[data-film-item]')) {
    li.hidden = !matches(Number(li.dataset.filmItem));
    any ||= !li.hidden;
  }
  play.querySelector('.film-none').hidden = any;
});

play.addEventListener('click', (e) => {
  const guess = e.target.closest('[data-film]');
  if (guess) {
    // Primeiro toque escolhe; o chute só vale depois de confirmar.
    const film = Number(guess.dataset.film);
    pending = pending === film ? null : film;
    render(store.state);
    shell.tips(store.state);
    return;
  }
  // Toque dentro da caixa da modal (fora dos botões) não fecha.
  const box = e.target.closest('.guess-confirm');
  const act = e.target.closest(box ? '.guess-confirm [data-act]' : '[data-act]')?.dataset.act;
  if (act === 'confirm' && pending !== null) store.dispatch({ type: 'guess', film: pending });
  if (act === 'cancel') {
    pending = null;
    render(store.state);
  }
  if (['clue', 'giveUp', 'next'].includes(act)) store.dispatch({ type: act });
  if (act === 'restart') shell.restart();
  if (act === 'setup') shell.enterSetup();
});

// Partidas salvas antes da lista de palpites não têm o ranking: começam do zero.
shell.init((s) => s.phase !== 'won' && (!s.turn || Array.isArray(s.turn.ranking)));
