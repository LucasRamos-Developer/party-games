import { createStore } from '../../assets/js/core/store.js';
import { createShell, renderScores } from '../../assets/js/core/shell.js';
import { buzz, skip, success } from '../../assets/js/core/sound.js';
import { $, esc } from '../../assets/js/core/dom.js';
import { FILMES } from './filmes.js';
import { DEFAULT_SETTINGS, STAGES, newGame, reduce, shownFilms, stagePoints } from './state.js';
import { TIPS } from './tips.js';

const store = createStore({ key: 'filme:current', reduce });
const play = $('#play');
const screen = $('#screen-game');
const byTitle = (a, b) => FILMES[a].titulo.localeCompare(FILMES[b].titulo, 'pt');

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
  onEnterGame: () => render(store.state),
});

let pending = null; // filme tocado na lista, esperando confirmar o chute

store.subscribe((s, action) => {
  if (!s) return;
  pending = null;
  if (action.type === 'guess') (s.turn.result === 'hit' ? success : buzz)();
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
  if (t.result === 'hit') return `${esc(team.name)} acertou! +${t.points}`;
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
      const opened = Array.from({ length: t.stage + 1 }, (_, i) => i)
        .reverse()
        .map((i) => `<div class="stage-card ${i === t.stage ? 'word-card pop' : 'is-old'}">${i === t.stage ? '' : `<span class="stage-num">Pista ${i + 1}</span>`}${stageContent(film, i)}</div>`)
        .join('');
      const options = shownFilms(t)
        .sort(byTitle)
        .map((i) => `<li><button class="film-opt" type="button" data-film="${i}" aria-pressed="${i === pending}">${esc(FILMES[i].titulo)}</button></li>`)
        .join('');
      const confirm =
        pending === null
          ? ''
          : `<div class="guess-confirm pop">
              <p>Chutar <b>${esc(FILMES[pending].titulo)}</b>? Se errar, zera.</p>
              <div class="duo">
                <button class="neon-btn" type="button" data-act="cancel">Cancelar</button>
                <button class="neon-btn is-ok" type="button" data-act="confirm">Confirmar · ${stagePoints(t.stage)} pts</button>
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
            <ul class="film-list">${options}</ul>
            ${confirm}
          </section>
        </div>`;
      return;
    }

    play.innerHTML = `
      ${top}
      <div class="handoff">
        <p class="who-kicker">O filme era</p>
        <h2 class="who-title title-reveal pop">${esc(film.titulo)}</h2>
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
  const act = e.target.closest('[data-act]')?.dataset.act;
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
