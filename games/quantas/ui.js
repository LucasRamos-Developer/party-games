import { createStore } from '../../assets/js/core/store.js';
import { createShell, renderScores } from '../../assets/js/core/shell.js';
import { createTimer } from '../../assets/js/core/timer.js';
import { boom, mountClock } from '../../assets/js/core/clock.js';
import { beep, buzz, success } from '../../assets/js/core/sound.js';
import { freshRng } from '../../assets/js/core/random.js';
import { $, esc } from '../../assets/js/core/dom.js';
import { QUESTIONS } from './words.js';
import { DEFAULT_SETTINGS, available, bidOptions, eligibleTeams, newGame, otherTeam, reduce, suggestConfront } from './state.js';
import { TIPS } from './tips.js';

const store = createStore({ key: 'quantas:current', reduce });
const play = $('#play');
const screen = $('#screen-game');

function makeClock(className, onTap) {
  const box = document.createElement('div');
  box.className = `clock-wrap ${className}`;
  return { box, clock: mountClock(box, { onTap }) };
}

// Leilão: um relógio por lado (a/b), que só corre na vez daquele lado.
const SIDES = ['a', 'b'];
const bids = {};
for (const key of SIDES) {
  const side = makeClock('bid-clock', () => {});
  const timer = createTimer({
    duration: DEFAULT_SETTINGS.bidTime,
    onTick: (r, t) => side.clock.update(r, t, { running: timer?.running ?? false, hint: timer?.running ? 'sua vez' : '' }),
    onEnd: () => store.dispatch({ type: 'timeout' }),
  });
  bids[key] = { ...side, timer };
}
const turnSide = (r) => (r.turn === r.a.team ? 'a' : 'b');
const answer = makeClock('answer-clock', () => {
  if (store.state?.phase === 'answer') answerTimer.toggle();
});
const answerTimer = createTimer({
  duration: DEFAULT_SETTINGS.timer,
  onTick: (r, t) => answer.clock.update(r, t, { running: answerTimer?.running ?? false }),
  onEnd: () => {
    boom(screen);
    store.dispatch({ type: 'fail' });
  },
});

let suggestion = null; // { key, a, b } no sorteio aleatório
let picks = []; // [{ team, player }] no sorteio manual
let step = { bid: null, value: 0 }; // seletor −/+ do leilão; volta à sugestão a cada lance novo
const resume = { a: false, b: false, answer: false };

const shell = createShell({
  store,
  settingsKey: 'quantas:setup',
  tips: TIPS,
  practiceDone: (action) => action.type === 'next',
  onTips: (on) => {
    for (const [key, timer] of [
      ['a', bids.a.timer],
      ['b', bids.b.timer],
      ['answer', answerTimer],
    ]) {
      if (on) {
        resume[key] = timer.running;
        timer.pause();
      } else if (resume[key]) timer.start();
    }
  },
  newGame: ({ teams, settings }) => newGame({ teams, settings }),
  readOptions: () => ({
    mode: $('#opt-mode').value,
    draw: $('#opt-draw').value,
    level: $('#opt-level').value,
    timer: Number($('#opt-timer').value),
    bidTime: Number($('#opt-bid').value),
  }),
  writeOptions: (saved) => {
    const st = { ...DEFAULT_SETTINGS, ...saved };
    for (const [id, key] of [
      ['#opt-mode', 'mode'],
      ['#opt-draw', 'draw'],
      ['#opt-level', 'level'],
      ['#opt-timer', 'timer'],
      ['#opt-bid', 'bidTime'],
    ]) {
      $(id).value = String(st[key]);
      if ($(id).selectedIndex < 0) $(id).value = String(DEFAULT_SETTINGS[key]); // opção salva que não existe mais
    }
  },
  onEnterGame: () => {
    suggestion = null;
    picks = [];
    syncTimers(store.state, { type: '@enter' });
    render(store.state);
  },
});

// No leilão cada equipe tem o seu tempo, que não reinicia a cada lance: só
// corre o relógio de quem está decidindo. O da resposta espera o toque.
function syncTimers(s, action) {
  if (s.phase === 'auction') {
    if (['confront', '@enter', '@restore'].includes(action.type)) for (const key of SIDES) bids[key].timer.reset(s.settings.bidTime);
    const turn = turnSide(s.round);
    for (const key of SIDES) key === turn ? bids[key].timer.start() : bids[key].timer.pause();
  } else {
    for (const key of SIDES) bids[key].timer.pause();
  }
  if (s.phase !== 'answer' || action.type === 'timeout' || action.type === 'pass') answerTimer.reset(s.settings.timer);
}

store.subscribe((s, action) => {
  if (!s) return;
  if (action.type === 'count') {
    if (s.phase === 'result') success();
    else beep({ freq: 880, duration: 0.08 });
  }
  if (action.type === 'fail') buzz();
  if (action.type === 'timeout') boom(screen);
  if (action.type === 'next') {
    suggestion = null;
    picks = [];
  }
  if (screen.hidden) return;
  syncTimers(s, action);
  render(s);
});

const nameOf = (s, side) => s.teams[side.team].players[side.player];
const teamName = (s, id) => esc(s.teams[id].name);

function answererText(s) {
  const r = s.round;
  const side = r.a.team === r.answerer ? r.a : r.b;
  return s.settings.mode === 'team' ? `${esc(nameOf(s, side))} responde` : `${teamName(s, r.answerer)} responde`;
}

function render(s) {
  const r = s.round;
  const focus = s.phase === 'won' ? s.winner : r ? (s.phase === 'auction' ? r.turn : (r.answerer ?? r.a.team)) : null;
  screen.style.setProperty('--clock', focus !== null ? s.teams[focus].color : '#ff8a00');
  renderScores($('#hud-teams'), s.teams, focus);

  if (s.phase === 'draw') return renderDraw(s);
  if (s.phase === 'auction') return renderAuction(s);
  if (s.phase === 'answer') return renderAnswer(s);
  if (s.phase === 'result') return renderResult(s);
  renderWinner(s);
}

function renderDraw(s) {
  const tiebreak = s.contenders ? '<span class="chip" style="--team:#ff8a00">Desempate!</span>' : '';
  const goText = s.settings.mode === 'team' ? 'Eles saíram de perto · mostrar a pergunta' : 'Mostrar a pergunta para os dois';
  const hint =
    s.settings.mode === 'team'
      ? 'Os dois sorteados <b>saem de perto</b>: eles não podem ver a pergunta. As equipes fazem o leilão.'
      : 'Os dois sorteados vêm para o tablet e fazem o leilão. Quem ganhar, a <b>equipe toda</b> responde.';

  if (s.settings.draw === 'random') {
    if (!suggestion || suggestion.key !== s.roundCount) suggestion = { key: s.roundCount, ...suggestConfront(s, freshRng()) };
    const side = (x) => `
      <div class="side" style="--team:${s.teams[x.team].color}">
        <span class="side-team">${teamName(s, x.team)}</span>
        <span class="side-name">${esc(nameOf(s, x))}</span>
      </div>`;
    play.innerHTML = `
      <div class="handoff">
        ${tiebreak}
        <p class="who-kicker">Confronto ${s.roundCount + 1}</p>
        <div class="confront">${side(suggestion.a)}<span class="vs">×</span>${side(suggestion.b)}</div>
        <p class="result-hint">${hint}</p>
        <button class="neon-btn is-ok big-cta" type="button" data-act="go">${goText}</button>
        <button class="link-btn" type="button" data-act="reroll">Sortear outro confronto</button>
      </div>`;
    return;
  }

  const teams = eligibleTeams(s);
  play.innerHTML = `
    <div class="who">
      ${tiebreak}
      <p class="who-kicker">Confronto ${s.roundCount + 1}</p>
      <h2 class="who-title">Quem vai jogar?</h2>
      <p class="result-hint">Toque em um jogador de <b>duas</b> equipes. Só aparece quem ainda não jogou.</p>
    </div>
    <div class="pick-teams">
      ${teams
        .map(
          (t) => `<div class="pick-team" style="--team:${t.color}">
            <p class="side-team">${esc(t.name)}</p>
            <div class="picks">${available(t)
              .map((p) => {
                const on = picks.some((x) => x.team === t.id && x.player === p);
                return `<button class="pick" type="button" data-pick="${t.id}:${p}" aria-pressed="${on}" style="--team:${t.color}">${esc(t.players[p])}</button>`;
              })
              .join('')}</div>
          </div>`,
        )
        .join('')}
    </div>
    <p class="result-hint">${hint}</p>
    <button class="neon-btn is-ok" type="button" data-act="go" ${picks.length === 2 ? '' : 'disabled'}>${goText}</button>`;
}

// Um lado do leilão por equipe, cada um com o seu relógio: só o lado da vez fica ativo.
function renderBidSide(s, key) {
  const r = s.round;
  const side = r[key];
  const team = s.teams[side.team];
  const active = r.turn === side.team;
  const off = active ? '' : 'disabled';
  const status = active ? 'Sua vez' : r.owner === side.team ? `Deu ${r.bid}` : 'Aguardando';
  return `
    <div class="bid-side ${active ? 'is-active' : ''}" style="--team:${team.color}; --clock:${team.color}">
      <div class="side-head">
        <div data-slot="bid-clock-${key}"></div>
        <div>
          <p class="side-team">${esc(team.name)}</p>
          <p class="side-player">${esc(nameOf(s, side))}</p>
          <p class="side-status">${status}</p>
        </div>
      </div>
      <div class="quick-bids">
        ${bidOptions(r.bid)
          .slice(0, 4)
          .map((n) => `<button class="bid-btn" type="button" data-bid="${n}" ${off}>${n}</button>`)
          .join('')}
      </div>
      <div class="bid-stepper">
        <button type="button" class="icon-btn" data-step="-1" aria-label="Diminuir" ${active && step.value > r.bid + 1 ? '' : 'disabled'}>−</button>
        <button class="bid-btn" type="button" data-bid="${step.value}" ${off}>${step.value}</button>
        <button type="button" class="icon-btn" data-step="1" aria-label="Aumentar" ${active && step.value < 99 ? '' : 'disabled'}>+</button>
      </div>
      <button class="neon-btn is-skip doubt-btn" type="button" data-act="pass" ${active && r.owner !== null ? '' : 'disabled'}>Duvido!</button>
    </div>`;
}

function renderAuction(s) {
  const r = s.round;
  const q = QUESTIONS[r.question];
  if (step.bid !== r.bid) step = { bid: r.bid, value: bidOptions(r.bid)[4] };
  const owner = r.owner === null ? null : r.a.team === r.owner ? r.a : r.b;
  play.innerHTML = `
    <div class="word-card q-card">
      <span class="q-kind">Quantos você consegue falar?</span>
      <span class="q-text">${esc(q.q)}</span>
    </div>
    <div class="auction-board">
      ${renderBidSide(s, 'a')}
      <div class="auction-mid">
        <p class="bid-now">${owner ? `Lance: <b>${r.bid}</b>` : 'Sem lance'}</p>
        ${owner ? `<p class="side-team" style="--team:${s.teams[owner.team].color}">${s.settings.mode === 'pair' ? esc(nameOf(s, owner)) : teamName(s, owner.team)}</p>` : ''}
      </div>
      ${renderBidSide(s, 'b')}
    </div>
    <p class="result-hint">Dê um lance maior ou diga <b>Duvido!</b> para o outro lado responder. Zerou o seu relógio, você responde.</p>`;
  for (const key of SIDES) play.querySelector(`[data-slot="bid-clock-${key}"]`).replaceWith(bids[key].box);
}

function renderAnswer(s) {
  const r = s.round;
  const q = QUESTIONS[r.question];
  play.innerHTML = `
    <div class="who">
      <p class="who-kicker">${r.timedOut ? `O tempo acabou! ${teamName(s, r.answerer)} tem que responder` : 'Leilão fechado'}</p>
      <h2 class="who-title">${answererText(s)}</h2>
      <span class="chip" style="--team:${s.teams[r.answerer].color}">${esc(q.q)} · meta ${r.bid}</span>
    </div>
    <div class="answer-row">
      <div data-slot="answer-clock"></div>
      <div class="counter">
        <p class="count-big"><b>${r.count}</b> / ${r.bid}</p>
        <button class="neon-btn is-ok plus-btn" type="button" data-act="plus">+1</button>
        <div class="duo">
          <button class="neon-btn" type="button" data-act="minus">−1</button>
          <button class="neon-btn is-bad" type="button" data-act="fail">Desistir</button>
        </div>
      </div>
    </div>
    <p class="result-hint">${teamName(s, otherTeam(r, r.answerer))} confere as respostas. Toque no relógio para começar.</p>`;
  play.querySelector('[data-slot="answer-clock"]').replaceWith(answer.box);
}

function renderResult(s) {
  const r = s.round;
  play.innerHTML = `
    <div class="handoff">
      <p class="who-kicker">${esc(QUESTIONS[r.question].q)} · meta ${r.bid}</p>
      <h2 class="who-title">${r.success ? 'Conseguiu!' : 'Não deu!'}</h2>
      <p class="count-big"><b>${r.count}</b> / ${r.bid}</p>
      <p class="review-total">+1 ponto para ${teamName(s, r.pointTo)}</p>
      <button class="neon-btn is-ok big-cta" type="button" data-act="next">Próximo confronto ›</button>
    </div>`;
}

function renderWinner(s) {
  const winner = s.teams[s.winner];
  play.innerHTML = `
    <div class="winner">
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

play.addEventListener('click', (e) => {
  const s = store.state;
  const stepBtn = e.target.closest('[data-step]');
  if (stepBtn) {
    step.value = Math.min(99, Math.max(s.round.bid + 1, step.value + Number(stepBtn.dataset.step)));
    render(s);
    return;
  }
  const bidBtn = e.target.closest('[data-bid]');
  if (bidBtn) {
    store.dispatch({ type: 'bid', value: Number(bidBtn.dataset.bid) });
    return;
  }
  const pickBtn = e.target.closest('[data-pick]');
  if (pickBtn) {
    const [team, player] = pickBtn.dataset.pick.split(':').map(Number);
    const existing = picks.findIndex((x) => x.team === team);
    if (existing >= 0 && picks[existing].player === player) picks.splice(existing, 1);
    else {
      if (existing >= 0) picks.splice(existing, 1);
      picks.push({ team, player });
      if (picks.length > 2) picks.shift();
    }
    render(s);
    return;
  }
  switch (e.target.closest('[data-act]')?.dataset.act) {
    case 'reroll':
      suggestion = { key: s.roundCount, ...suggestConfront(s, freshRng()) };
      render(s);
      break;
    case 'go': {
      const pair = s.settings.draw === 'random' ? suggestion : picks.length === 2 && { a: picks[0], b: picks[1] };
      if (pair) store.dispatch({ type: 'confront', a: pair.a, b: pair.b });
      break;
    }
    case 'pass':
      store.dispatch({ type: 'pass' });
      break;
    case 'plus':
      store.dispatch({ type: 'count', delta: 1 });
      break;
    case 'minus':
      store.dispatch({ type: 'count', delta: -1 });
      break;
    case 'fail':
      answerTimer.pause();
      store.dispatch({ type: 'fail' });
      break;
    case 'next':
      store.dispatch({ type: 'next' });
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
