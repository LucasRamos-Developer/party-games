import { createStore } from '../../assets/js/core/store.js';
import { createShell, renderScores } from '../../assets/js/core/shell.js';
import { createTimer } from '../../assets/js/core/timer.js';
import { boom, mountClock } from '../../assets/js/core/clock.js';
import { beep, skip, success } from '../../assets/js/core/sound.js';
import { $, esc } from '../../assets/js/core/dom.js';
import { CATEGORIES } from './words.js';
import { DEFAULT_SETTINGS, holderOf, newGame, reduce, turnHits } from './state.js';
import { TIPS } from './tips.js';

const store = createStore({ key: 'testa:current', reduce });
const play = $('#play');
const screen = $('#screen-game');

const clockBox = document.createElement('div');
clockBox.className = 'clock-wrap';
const clock = mountClock(clockBox, { onTap: () => timer.toggle() });
const timer = createTimer({ onTick: (r, t) => clock.update(r, t, { running: timer?.running ?? false }), onEnd: onTimeUp });

let viewKey = null;
let countdown = false;
let resumeAfterTips = false;
let feedbackUntil = 0;

$('#opt-categories').innerHTML = CATEGORIES.map(
  (c) => `<label class="check-chip"><input type="checkbox" value="${c.key}"><span>${esc(c.name)}</span></label>`,
).join('');

const shell = createShell({
  store,
  settingsKey: 'testa:setup',
  tips: TIPS,
  practiceDone: (action) => action.type === 'confirm',
  onTips: (on) => {
    if (on) {
      resumeAfterTips = timer.running;
      timer.pause();
    } else if (resumeAfterTips) timer.start();
  },
  newGame: ({ teams, settings }) => newGame({ teams, settings }),
  readOptions: () => ({
    timer: Number($('#opt-timer').value),
    rounds: Number($('#opt-rounds').value),
    control: $('#opt-control').value,
    categories: [...document.querySelectorAll('#opt-categories input:checked')].map((i) => i.value),
  }),
  writeOptions: (saved) => {
    const st = { ...DEFAULT_SETTINGS, ...saved };
    $('#opt-timer').value = String(st.timer);
    $('#opt-rounds').value = String(st.rounds);
    $('#opt-control').value = st.control === 'tilt' ? 'tilt' : 'buttons';
    document.querySelectorAll('#opt-categories input').forEach((i) => (i.checked = st.categories.includes(i.value)));
  },
  onEnterGame: () => {
    viewKey = null;
    timer.reset(store.state.settings.timer);
    render(store.state);
  },
});

store.subscribe((s, action) => {
  if (!s) return;
  if (action.type === 'mark') (action.result === 'hit' ? success : skip)();
  if (action.type === 'confirm' || action.type === '@undo') {
    if (s.phase !== 'playing') timer.reset(s.settings.timer);
  }
  if (!screen.hidden) render(s);
});

function render(s) {
  const team = s.teams[s.current] ?? s.teams[s.winner];
  screen.style.setProperty('--clock', s.phase === 'won' ? s.teams[s.winner].color : team.color);
  renderScores($('#hud-teams'), s.teams, s.phase === 'won' ? s.winner : s.current);
  screen.classList.toggle('is-forehead', s.phase === 'playing' || countdown);

  const key = `${s.phase}:${s.turnCount}`;
  const fresh = key !== viewKey;
  viewKey = key;

  if (countdown) return;

  if (s.phase === 'ready') {
    const tilt = s.settings.control === 'tilt';
    play.innerHTML = `
      <div class="handoff">
        ${s.tiebreak ? '<span class="chip" style="--team:#ff8a00">Desempate!</span>' : ''}
        <p class="who-kicker">${esc(team.name)} · quem segura</p>
        <h2 class="who-title">${esc(holderOf(team))}</h2>
        <p class="result-hint">
          Segure o aparelho na testa, tela virada para a equipe.
          ${tilt ? 'Incline <b>para baixo</b> = acertou · <b>para cima</b> = passou, ou use os botões.' : 'Use os botões grandes: <b>✓ Acertou</b> e <b>✗ Passou</b>.'}
        </p>
        <button class="neon-btn is-ok big-cta" type="button" data-act="ready">Pronto!</button>
      </div>`;
    return;
  }

  if (s.phase === 'playing') {
    if (fresh) {
      play.innerHTML = `
        <div class="forehead" id="forehead">
          <div class="forehead-top">
            <div class="forehead-clock" data-slot="clock"></div>
            <div class="forehead-word" id="word"></div>
            <div class="forehead-count" id="count"></div>
          </div>
          <div class="forehead-buttons">
            <button class="big-answer is-pass" type="button" data-zone="pass"><span aria-hidden="true">✗</span> Passou</button>
            <button class="big-answer is-hit" type="button" data-zone="hit"><span aria-hidden="true">✓</span> Acertou</button>
          </div>
        </div>`;
      play.querySelector('[data-slot="clock"]').replaceWith(clockBox);
    }
    const word = $('#word');
    word.textContent = s.words[s.turn.word];
    word.classList.remove('pop');
    void word.offsetWidth;
    word.classList.add('pop');
    $('#count').textContent = `${turnHits(s)} ✓`;
    return;
  }

  if (s.phase === 'review') {
    const hits = turnHits(s);
    play.innerHTML = `
      <div class="review">
        <div class="who">
          <p class="who-kicker">Fim do turno · ${esc(holderOf(team))}</p>
          <h2 class="who-title">${hits} acerto${hits === 1 ? '' : 's'}</h2>
          <p class="result-hint">Toque numa palavra para corrigir.</p>
        </div>
        <ul class="review-list">
          ${
            s.turn.words
              .map(
                (w, i) => `<li><button class="review-item" type="button" data-toggle="${i}" style="--c:${w.result === 'hit' ? '#2bff88' : '#ff8a00'}">
                  <span>${esc(s.words[w.word])}</span><b>${w.result === 'hit' ? '✓ Acertou' : '↷ Passou'}</b>
                </button></li>`,
              )
              .join('') || '<li class="muted">Nenhuma palavra neste turno.</li>'
          }
        </ul>
        <button class="neon-btn is-ok" type="button" data-act="confirm">+${hits} para ${esc(team.name)} · passar a vez</button>
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

// ---------- contagem e inclinação ----------

async function startCountdown() {
  const s = store.state;
  if (s.settings.control === 'tilt') await requestMotion();
  countdown = true;
  render(s);
  play.innerHTML = `<div class="countdown"><p class="who-kicker">Coloque na testa</p><p class="count-num" id="count-num">3</p></div>`;
  for (const n of [3, 2, 1]) {
    $('#count-num').textContent = String(n);
    beep({ freq: 660, duration: 0.12 });
    await new Promise((r) => setTimeout(r, 900));
  }
  beep({ freq: 990, duration: 0.25 });
  countdown = false;
  armed = false; // só arma quando o aparelho estiver na posição neutra
  store.dispatch({ type: 'start' });
  timer.reset(s.settings.timer);
  timer.start();
}

async function requestMotion() {
  try {
    if (typeof DeviceMotionEvent?.requestPermission === 'function') await DeviceMotionEvent.requestPermission();
  } catch {
    /* sem permissão: o toque continua funcionando */
  }
}

// No iOS o sinal da gravidade é invertido em relação ao Android.
const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let armed = false;

window.addEventListener('devicemotion', (e) => {
  const s = store.state;
  if (!s || s.phase !== 'playing' || s.settings.control !== 'tilt' || !timer.running) return;
  let z = e.accelerationIncludingGravity?.z;
  if (typeof z !== 'number') return;
  if (IOS) z = -z;
  // Na testa a tela fica vertical (z ≈ 0). Tela para o chão: z < 0; para o teto: z > 0.
  if (Math.abs(z) < 4) armed = true;
  else if (armed && z < -6.5) mark('hit');
  else if (armed && z > 6.5) mark('pass');
});

function mark(result) {
  if (performance.now() < feedbackUntil) return;
  armed = false;
  feedbackUntil = performance.now() + 650;
  const fh = $('#forehead');
  if (fh) {
    fh.dataset.feedback = result;
    setTimeout(() => delete fh.dataset.feedback, 600);
  }
  store.dispatch({ type: 'mark', result });
}

function onTimeUp() {
  boom(screen);
  store.dispatch({ type: 'timeUp' });
}

play.addEventListener('click', (e) => {
  const zone = e.target.closest('[data-zone]');
  if (zone && timer.running) mark(zone.dataset.zone);
  const toggle = e.target.closest('[data-toggle]');
  if (toggle) store.dispatch({ type: 'toggle', index: Number(toggle.dataset.toggle) });
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'ready') startCountdown();
  if (act === 'confirm') store.dispatch({ type: 'confirm' });
  if (act === 'restart') shell.restart();
  if (act === 'setup') shell.enterSetup();
});

shell.init();
