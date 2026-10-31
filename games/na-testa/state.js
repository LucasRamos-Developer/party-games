// Regras do Na Testa: reduce(state, action) puro.

import { createDeck, draw } from '../../assets/js/core/deck.js';
import { advanceQueue, buildQueue } from '../../assets/js/core/turns.js';
import { seeded } from '../../assets/js/core/random.js';
import { CATEGORIES } from './words.js';

export const DEFAULT_SETTINGS = {
  timer: 60,
  rounds: 3,
  control: 'tilt', // tilt | tap
  categories: CATEGORIES.map((c) => c.key),
};

export const holderOf = (team) => team.players[team.holderIdx % team.players.length];
export const turnHits = (s) => (s.turn?.words ?? []).filter((w) => w.result === 'hit').length;

export function wordsFor(keys) {
  const chosen = CATEGORIES.filter((c) => keys.includes(c.key));
  return (chosen.length ? chosen : CATEGORIES).flatMap((c) => c.words);
}

export function newGame({ teams, settings, rng }) {
  const st = { ...DEFAULT_SETTINGS, ...settings };
  const words = wordsFor(st.categories);
  return {
    version: 1,
    settings: st,
    teams: teams.map((t, i) => ({ id: i, name: t.name, color: t.color, players: [...t.players], holderIdx: 0, score: 0 })),
    queue: buildQueue(st.rounds, teams.length),
    current: 0,
    turnCount: 0,
    tiebreak: false,
    phase: 'ready', // ready → playing → review → ready … → won
    words,
    deck: createDeck(words.length, rng),
    turn: null,
    winner: null,
  };
}

function drawWord(s) {
  const [word, deck] = draw(s.deck, seeded(`testa:${s.turnCount}:${s.deck.index}`));
  s.deck = deck;
  return word;
}

export function reduce(prev, action) {
  const s = structuredClone(prev);
  switch (action.type) {
    case 'start':
      if (s.phase !== 'ready') return prev;
      s.phase = 'playing';
      s.turn = { words: [], word: drawWord(s) };
      return s;

    case 'mark':
      if (s.phase !== 'playing' || !['hit', 'pass'].includes(action.result)) return prev;
      s.turn.words.push({ word: s.turn.word, result: action.result });
      s.turn.word = drawWord(s);
      return s;

    case 'timeUp':
      if (s.phase !== 'playing') return prev;
      s.phase = 'review';
      return s;

    case 'toggle': {
      const item = s.phase === 'review' && s.turn.words[action.index];
      if (!item) return prev;
      item.result = item.result === 'hit' ? 'pass' : 'hit';
      return s;
    }

    case 'confirm': {
      if (s.phase !== 'review') return prev;
      const team = s.teams[s.current];
      team.score += turnHits(s);
      team.holderIdx++;
      s.turnCount++;
      s.turn = null;
      s.phase = 'ready';
      advanceQueue(s);
      return s;
    }
  }
  return prev;
}
