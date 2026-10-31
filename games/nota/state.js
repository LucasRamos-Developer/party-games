// Regras do Qual é a Nota?: reduce(state, action) puro.
// A nota sorteada chega pela ação (`next`/newGame), para o reducer ficar puro.

import { createDeck, draw } from '../../assets/js/core/deck.js';
import { advanceQueue, buildQueue } from '../../assets/js/core/turns.js';
import { seeded } from '../../assets/js/core/random.js';
import { THEMES } from './words.js';

export const DEFAULT_SETTINGS = { rounds: 4 };
export const MAX_PRIZE = 10;
export const MIN_PRIZE = 2;
export const BASE_QUESTIONS = 4;
export const EXTRA_COST = { random: 1, free: 2 };

export const holderOf = (team) => team.players[team.holderIdx % team.players.length];

function drawTheme(s) {
  const [theme, deck] = draw(s.deck, seeded(`nota:${s.turnCount}:${s.deck.index}`));
  s.deck = deck;
  return theme;
}

// Cada vez começa com 2 perguntas sorteadas e 2 livres.
function newTurn(s, nota) {
  s.turn = {
    nota,
    cards: [
      { kind: 'random', theme: drawTheme(s) },
      { kind: 'random', theme: drawTheme(s) },
      { kind: 'free' },
      { kind: 'free' },
    ],
    idx: 0,
    prize: MAX_PRIZE,
    guess: null,
    hit: null,
  };
  s.phase = 'secret';
}

export function newGame({ teams, settings, rng, nota }) {
  const st = { ...DEFAULT_SETTINGS, ...settings };
  const s = {
    version: 1,
    settings: st,
    teams: teams.map((t, i) => ({ id: i, name: t.name, color: t.color, players: [...t.players], holderIdx: 0, score: 0 })),
    queue: buildQueue(st.rounds, teams.length),
    current: 0,
    turnCount: 0,
    tiebreak: false,
    phase: 'secret', // secret → questions → guess → result → secret … → won
    deck: createDeck(THEMES.length, rng),
    turn: null,
    winner: null,
  };
  newTurn(s, nota);
  return s;
}

export function reduce(prev, action) {
  const s = structuredClone(prev);
  const t = s.turn;
  switch (action.type) {
    // Quem segura já viu a nota: vira o tablet para a equipe.
    case 'known':
      if (s.phase !== 'secret') return prev;
      s.phase = 'questions';
      return s;

    case 'nextCard':
      if (s.phase !== 'questions' || t.idx >= t.cards.length - 1) return prev;
      t.idx++;
      return s;

    case 'prevCard':
      if (s.phase !== 'questions' || t.idx === 0) return prev;
      t.idx--;
      return s;

    // Depois das 4, cada pergunta a mais desconta do prêmio (até o mínimo).
    case 'extra': {
      const cost = EXTRA_COST[action.kind];
      if (s.phase !== 'questions' || !cost || t.idx < t.cards.length - 1 || t.cards.length < BASE_QUESTIONS) return prev;
      t.cards.push(action.kind === 'random' ? { kind: 'random', theme: drawTheme(s) } : { kind: 'free' });
      t.idx = t.cards.length - 1;
      t.prize = Math.max(MIN_PRIZE, t.prize - cost);
      return s;
    }

    case 'toGuess':
      if (s.phase !== 'questions') return prev;
      s.phase = 'guess';
      return s;

    case 'backToQuestions':
      if (s.phase !== 'guess') return prev;
      s.phase = 'questions';
      return s;

    // Só a nota exata pontua.
    case 'guess': {
      if (s.phase !== 'guess' || !Number.isInteger(action.value) || action.value < 0 || action.value > 10) return prev;
      t.guess = action.value;
      t.hit = action.value === t.nota;
      if (t.hit) s.teams[s.current].score += t.prize;
      s.phase = 'result';
      return s;
    }

    case 'next':
      if (s.phase !== 'result') return prev;
      s.teams[s.current].holderIdx++;
      s.turnCount++;
      if (advanceQueue(s)) newTurn(s, action.nota);
      else s.turn = null;
      return s;
  }
  return prev;
}
