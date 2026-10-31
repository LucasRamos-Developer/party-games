import { createStore } from '../../assets/js/core/store.js';
import { createShell, renderScores } from '../../assets/js/core/shell.js';
import { createTimer } from '../../assets/js/core/timer.js';
import { boom, mountClock } from '../../assets/js/core/clock.js';
import { buzz, skip, success } from '../../assets/js/core/sound.js';
import { $, esc } from '../../assets/js/core/dom.js';
import { CARDS } from './words.js';
import { DEFAULT_SETTINGS, explainerOf, newGame, points, reduce, turnTotal } from './state.js';
import { TIPS } from './tips.js';

const store = createStore({ key: 'fala:current', reduce });
const play = $('#play');

const clockBox = document.createElement('div');
clockBox.className = 'clock-wrap';
const clock = mountClock(clockBox, { onTap: onClockTap });
const timer = createTimer({ onTick: updateClock, onEnd: onTimeUp });

const LABEL = { hit: ['✓ Acertou', '#2bff88'], skip: ['↷ Pulou', '#ff8a00'], taboo: ['✗ Proibida', '#ff3b5c'] };
let viewKey = null;
let coaching = false; // balões do treino abertos: timer pausado sem borrar a carta
let resumeAfterTips = false;

const shell = createShell({
  store,
  settingsKey: 'fala:setup',
  tips: TIPS,
  practiceDone: (action) => action.type === 'confirm',
  onTips: (on) => {
    coaching = on;
    if (on) {
      resumeAfterTips = timer.running;
      timer.pause();
    } else if (resumeAfterTips) timer.start();
    updateClock(timer.remaining, timer.total);
  },
  newGame: ({ teams, settings }) => newGame({ teams, settings }),
  readOptions: () => ({
    timer: Number($('#opt-timer').value),
    goal: Number($('#opt-goal').value),
    skipPenalty: $('#opt-skip').checked,
  }),
  writeOptions: (saved) => {
    const st = { ...DEFAULT_SETTINGS, ...saved };
    $('#opt-timer').value = String(st.timer);
    $('#opt-goal').value = String(st.goal);
    $('#opt-skip').checked = st.skipPenalty;
  },
  onEnterGame: () => {
    viewKey = null;
    timer.reset(store.state.settings.timer);
    render(store.state);
  },
});

store.subscribe((s, action) => {
  if (!s) return;
  if (action.type === 'start') {
    timer.reset(s.settings.timer);
    timer.start();
  }
  if (action.type === 'confirm' || action.type === '@undo') {
    if (s.phase !== 'playing') timer.reset(s.settings.timer);
  }
  if (action.type === 'mark') ({ hit: success, skip, taboo: buzz })[action.result]();
  if (!$('#screen-game').hidden) render(s);
});

function slot(name) {
  return play.querySelector(`[data-slot="${name}"]`);
}

function render(s) {
  const team = s.teams[s.current];
  $('#screen-game').style.setProperty('--clock', s.phase === 'won' ? s.teams[s.winner].color : team.color);
  renderScores($('#hud-teams'), s.teams, s.phase === 'won' ? s.winner : s.current);

  const key = `${s.phase}:${s.turnCount}`;
  const fresh = key !== viewKey;
  viewKey = key;

  if (s.phase === 'ready') {
    play.innerHTML = `
      <div class="handoff">
        <p class="who-kicker">Passe o tablet para</p>
        <h2 class="who-title">${esc(explainerOf(team))}</h2>
        <span class="chip" style="--team:${team.color}"><span class="dot"></span>${esc(team.name)} adivinha</span>
        <div data-slot="clock" class="clock-slot"></div>
        <p class="result-hint">As outras equipes fiscalizam as palavras proibidas. Toque no relógio para começar.</p>
      </div>`;
    slot('clock').replaceWith(clockBox);
    updateClock(timer.remaining, timer.total);
    return;
  }

  if (s.phase === 'playing') {
    if (fresh) {
      play.innerHTML = `
        <div class="turn-top">
          <div data-slot="clock"></div>
          <div class="turn-info">
            <p class="who-kicker">${esc(team.name)} · ${esc(explainerOf(team))} explica</p>
            <p class="turn-score" id="turn-score"></p>
          </div>
        </div>
        <div class="word-card taboo-card" id="card"></div>
        <div class="trio">
          <button class="neon-btn is-bad" type="button" data-mark="taboo">✗ Proibida</button>
          <button class="neon-btn is-skip" type="button" data-mark="skip">↷ Pular</button>
          <button class="neon-btn is-ok" type="button" data-mark="hit">✓ Acertou</button>
        </div>`;
      slot('clock').replaceWith(clockBox);
    }
    const card = CARDS[s.turn.card];
    const el = $('#card');
    el.innerHTML = `
      <span class="word">${esc(card.word)}</span>
      <span class="forbidden-label">Não pode falar</span>
      <ul class="forbidden">${card.forbidden.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    const total = turnTotal(s);
    $('#turn-score').textContent = `Neste turno: ${total > 0 ? '+' : ''}${total}`;
    updateClock(timer.remaining, timer.total);
    return;
  }

  if (s.phase === 'review') {
    const total = turnTotal(s);
    play.innerHTML = `
      <div class="review">
        <div class="who">
          <p class="who-kicker">Fim do turno</p>
          <h2 class="who-title">${esc(team.name)}</h2>
          <p class="result-hint">Toque numa palavra para corrigir o resultado.</p>
        </div>
        <ul class="review-list">
          ${
            s.turn.cards
              .map((c, i) => {
                const [label, color] = LABEL[c.result];
                const pts = points(c.result, s.settings);
                return `<li><button class="review-item" type="button" data-toggle="${i}" style="--c:${color}">
                  <span>${esc(CARDS[c.card].word)}</span><b>${label} ${pts > 0 ? '+' : ''}${pts}</b>
                </button></li>`;
              })
              .join('') || '<li class="muted">Nenhuma palavra neste turno.</li>'
          }
        </ul>
        <p class="review-total">Total do turno: ${total > 0 ? '+' : ''}${total}</p>
        <button class="neon-btn is-ok" type="button" data-act="confirm">Confirmar e passar a vez</button>
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
          .map((t) => `<li style="--team:${t.color}"><span>${esc(t.name)}</span><span>${t.score} pts</span></li>`)
          .join('')}
      </ol>
      <div class="duo">
        <button class="neon-btn is-ok" type="button" data-act="restart">Jogar de novo</button>
        <button class="neon-btn" type="button" data-act="setup">Mudar equipes</button>
      </div>
    </div>`;
}

function updateClock(remaining, total) {
  const s = store.state;
  const ready = s?.phase === 'ready';
  clock.update(remaining, total, { running: timer?.running ?? false, hint: ready ? 'Toque para começar' : undefined });
  play.classList.toggle('is-paused', !coaching && s?.phase === 'playing' && !(timer?.running ?? false) && remaining > 0);
}

function onClockTap() {
  const s = store.state;
  if (s.phase === 'ready') store.dispatch({ type: 'start' });
  else if (s.phase === 'playing') timer.toggle();
}

function onTimeUp() {
  boom($('#screen-game'));
  store.dispatch({ type: 'timeUp' });
}

play.addEventListener('click', (e) => {
  const mark = e.target.closest('[data-mark]');
  if (mark && timer.running) store.dispatch({ type: 'mark', result: mark.dataset.mark });
  const toggle = e.target.closest('[data-toggle]');
  if (toggle) store.dispatch({ type: 'toggle', index: Number(toggle.dataset.toggle) });
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'confirm') store.dispatch({ type: 'confirm' });
  if (act === 'restart') shell.restart();
  if (act === 'setup') shell.enterSetup();
});

shell.init();
