import { createStore } from '../../assets/js/core/store.js';
import { createShell, renderScores } from '../../assets/js/core/shell.js';
import { randomInt } from '../../assets/js/core/dice.js';
import { buzz, success } from '../../assets/js/core/sound.js';
import { $, esc } from '../../assets/js/core/dom.js';
import { THEMES, question } from './words.js';
import { TIPS } from './tips.js';
import { BASE_QUESTIONS, DEFAULT_SETTINGS, EXTRA_COST, MIN_PRIZE, holderOf, newGame, reduce } from './state.js';

const store = createStore({ key: 'nota:current', reduce });
const play = $('#play');
const screen = $('#screen-game');
const randomNota = () => randomInt(11);

let peek = false; // a nota está visível para quem segura?

const shell = createShell({
  store,
  settingsKey: 'nota:setup',
  tips: TIPS,
  tipKey: (s) => {
    if (s.phase === 'secret') return peek ? 'peek' : 'secret';
    const t = s.turn;
    if (s.phase === 'questions' && t.idx === t.cards.length - 1 && t.cards.length >= BASE_QUESTIONS) return 'extra';
    return s.phase;
  },
  practiceDone: (action) => action.type === 'next',
  newGame: ({ teams, settings }) => newGame({ teams, settings, nota: randomNota() }),
  readOptions: () => ({ rounds: Number($('#opt-rounds').value) }),
  writeOptions: (saved) => {
    $('#opt-rounds').value = String({ ...DEFAULT_SETTINGS, ...saved }.rounds);
  },
  onEnterGame: () => {
    peek = false;
    render(store.state);
  },
  summary: (s) =>
    s.teams.map((t) => `<li><span class="team-tag" style="--team:${t.color}"><span class="dot"></span>${esc(t.name)}</span> <span class="muted">${t.score} pts</span></li>`).join(''),
});

store.subscribe((s, action) => {
  if (!s) return;
  if (action.type === 'guess') (s.turn.hit ? success : buzz)();
  if (action.type === 'next' || action.type === '@undo') peek = false;
  if (!screen.hidden) render(s);
});

function prizeMeter(t) {
  return `<p class="prize">Valendo <b>${t.prize}</b> ponto${t.prize === 1 ? '' : 's'}${t.prize === MIN_PRIZE ? ' (mínimo)' : ''}</p>`;
}

function render(s) {
  const team = s.teams[s.current] ?? s.teams[s.winner];
  screen.style.setProperty('--clock', s.phase === 'won' ? s.teams[s.winner].color : team.color);
  renderScores($('#hud-teams'), s.teams, s.phase === 'won' ? s.winner : s.current);
  const t = s.turn;

  if (s.phase === 'secret') {
    const holder = esc(holderOf(team));
    play.innerHTML = peek
      ? `
      <div class="handoff">
        <p class="who-kicker">A nota secreta é</p>
        <p class="nota-big pop">${t.nota}</p>
        <p class="scale"><span>0 = o pior</span><span>10 = o melhor</span></p>
        <button class="neon-btn is-ok big-cta" type="button" data-act="known">Já sei a nota</button>
      </div>`
      : `
      <div class="handoff">
        ${s.tiebreak ? '<span class="chip" style="--team:#ff8a00">Desempate!</span>' : ''}
        <p class="who-kicker">${esc(team.name)} · só quem segura pode ver</p>
        <h2 class="who-title">${holder}</h2>
        <p class="result-hint">${esc(team.name)}, não olhem a tela! ${holder}, toque para ver a nota.</p>
        <button class="neon-btn big-cta" type="button" data-act="peek">👁 Ver nota</button>
      </div>`;
    return;
  }

  if (s.phase === 'questions') {
    const card = t.cards[t.idx];
    const last = t.idx === t.cards.length - 1;
    const canExtra = last && t.cards.length >= BASE_QUESTIONS;
    play.innerHTML = `
      <div class="who">
        <p class="who-kicker">${esc(team.name)} pergunta · ${esc(holderOf(team))} responde</p>
        ${prizeMeter(t)}
      </div>
      <div class="word-card question-card pop">
        <span class="q-kind">${card.kind === 'random' ? '🎲 Pergunta sorteada' : '✍️ Pergunta livre'}</span>
        <span class="q-text">${card.kind === 'random' ? esc(question(THEMES[card.theme])) : 'Inventem uma pergunta!'}</span>
        <span class="q-sub">${
          card.kind === 'random'
            ? `${esc(holderOf(team))} responde com o que chega mais perto da nota.`
            : `A equipe cria a pergunta e ${esc(holderOf(team))} responde de acordo com a nota.`
        }</span>
      </div>
      <p class="q-count">Pergunta ${t.idx + 1} de ${t.cards.length}</p>
      <div class="duo">
        <button class="neon-btn" type="button" data-act="prev" ${t.idx === 0 ? 'disabled' : ''}>‹ Anterior</button>
        ${
          last
            ? `<button class="neon-btn is-ok" type="button" data-act="toGuess">Chutar a nota</button>`
            : `<button class="neon-btn is-ok" type="button" data-act="next-card">Próxima ›</button>`
        }
      </div>
      ${
        canExtra
          ? `<div class="duo extra">
              <button class="neon-btn is-skip" type="button" data-extra="random">+ Sorteada (−${EXTRA_COST.random})</button>
              <button class="neon-btn is-skip" type="button" data-extra="free">+ Livre (−${EXTRA_COST.free})</button>
            </div>`
          : `<button class="link-btn" type="button" data-act="toGuess">Já sabemos! Chutar agora</button>`
      }`;
    return;
  }

  if (s.phase === 'guess') {
    play.innerHTML = `
      <div class="who">
        <p class="who-kicker">${esc(team.name)}</p>
        <h2 class="who-title">Qual é a nota?</h2>
        ${prizeMeter(t)}
      </div>
      <div class="nota-pad">
        ${Array.from({ length: 11 }, (_, n) => `<button class="num" type="button" data-guess="${n}">${n}</button>`).join('')}
      </div>
      <button class="link-btn" type="button" data-act="back">‹ Voltar às perguntas</button>`;
    return;
  }

  if (s.phase === 'result') {
    play.innerHTML = `
      <div class="handoff">
        <p class="who-kicker">A nota era</p>
        <p class="nota-big pop ${t.hit ? 'is-hit' : 'is-miss'}">${t.nota}</p>
        <h2 class="who-title">${t.hit ? `Em cheio! +${t.prize}` : 'Não foi dessa vez'}</h2>
        <p class="result-hint">${esc(team.name)} disse ${t.guess}${t.hit ? '' : ` · era ${t.nota}`}.</p>
        <button class="neon-btn is-ok big-cta" type="button" data-act="next">Próxima equipe ›</button>
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
  const extra = e.target.closest('[data-extra]');
  if (extra) store.dispatch({ type: 'extra', kind: extra.dataset.extra });
  const guess = e.target.closest('[data-guess]');
  if (guess) store.dispatch({ type: 'guess', value: Number(guess.dataset.guess) });
  switch (e.target.closest('[data-act]')?.dataset.act) {
    case 'peek':
      peek = true;
      render(store.state);
      shell.tips(store.state);
      break;
    case 'known':
      peek = false;
      store.dispatch({ type: 'known' });
      break;
    case 'prev':
      store.dispatch({ type: 'prevCard' });
      break;
    case 'next-card':
      store.dispatch({ type: 'nextCard' });
      break;
    case 'toGuess':
      store.dispatch({ type: 'toGuess' });
      break;
    case 'back':
      store.dispatch({ type: 'backToQuestions' });
      break;
    case 'next':
      store.dispatch({ type: 'next', nota: randomNota() });
      break;
    case 'restart':
      shell.restart();
      break;
    case 'setup':
      shell.enterSetup();
      break;
  }
});

shell.init();
