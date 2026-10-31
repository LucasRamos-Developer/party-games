import { createStore } from '../../assets/js/core/store.js';
import { createShell, renderScores } from '../../assets/js/core/shell.js';
import { buzz, skip, success } from '../../assets/js/core/sound.js';
import { $, esc } from '../../assets/js/core/dom.js';
import { FILMES } from './filmes.js';
import { DEFAULT_SETTINGS, STAGES, newGame, reduce, stagePoints } from './state.js';

const store = createStore({ key: 'filme:current', reduce });
const play = $('#play');
const screen = $('#screen-game');

const shell = createShell({
  store,
  settingsKey: 'filme:setup',
  minPerTeam: 1,
  newGame: ({ teams, settings }) => newGame({ teams, settings }),
  readOptions: () => ({ perTeam: Number($('#opt-per-team').value) }),
  writeOptions: (saved) => {
    $('#opt-per-team').value = String({ ...DEFAULT_SETTINGS, ...saved }.perTeam);
  },
  onEnterGame: () => render(store.state),
});

store.subscribe((s, action) => {
  if (!s) return;
  if (action.type === 'hit') success();
  if (action.type === 'miss') (s.phase === 'reveal' ? buzz : skip)();
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
      play.innerHTML = `
        ${top}
        <div class="stage-stack">${opened}</div>
        <p class="prize-now">Valendo <b>${stagePoints(t.stage)}</b> pontos · pista ${t.stage + 1} de ${STAGES}</p>
        <div class="duo">
          <button class="neon-btn is-bad" type="button" data-act="miss">${t.stage < STAGES - 1 ? '✗ Errou · próxima pista' : '✗ Errou'}</button>
          <button class="neon-btn is-ok" type="button" data-act="hit">✓ Acertou! +${stagePoints(t.stage)}</button>
        </div>
        <button class="link-btn" type="button" data-act="giveUp">Desistir deste filme</button>`;
      return;
    }

    play.innerHTML = `
      ${top}
      <div class="handoff">
        <p class="who-kicker">O filme era</p>
        <h2 class="who-title title-reveal pop">${esc(film.titulo)}</h2>
        <p class="review-total">${t.result === 'hit' ? `${esc(team.name)} acertou! +${t.points}` : `${esc(team.name)} não pontuou`}</p>
        <button class="neon-btn is-ok big-cta" type="button" data-act="next">Próximo filme ›</button>
      </div>`;
    return;
  }

  const winner = s.teams[s.winner];
  play.innerHTML = `
    <div class="winner">
      <div class="trophy" aria-hidden="true">🏆</div>
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
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (['hit', 'miss', 'giveUp', 'next'].includes(act)) store.dispatch({ type: act });
  if (act === 'restart') shell.restart();
  if (act === 'setup') shell.enterSetup();
});

shell.init();
