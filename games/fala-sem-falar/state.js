// Regras do Fala Sem Falar: reduce(state, action) puro.

import { createDeck, draw } from '../../assets/js/core/deck.js';
import { leaders } from '../../assets/js/core/turns.js';
import { seeded } from '../../assets/js/core/random.js';
import { CARDS } from './words.js';

export const DEFAULT_SETTINGS = { timer: 60, goal: 30, skipPenalty: false };
export const RESULTS = ['hit', 'skip', 'taboo'];

export const explainerOf = (team) => team.players[team.explainerIdx % team.players.length];

export function points(result, settings) {
  if (result === 'hit') return 1;
  if (result === 'taboo') return -1;
  return settings.skipPenalty ? -1 : 0;
}

export const turnTotal = (s) => (s.turn?.cards ?? []).reduce((sum, c) => sum + points(c.result, s.settings), 0);

export function newGame({ teams, settings, rng }) {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    teams: teams.map((t, i) => ({ id: i, name: t.name, color: t.color, players: [...t.players], explainerIdx: 0, score: 0 })),
    current: 0,
    turnCount: 0,
    phase: 'ready', // ready → playing → review → ready … → won
    deck: createDeck(CARDS.length, rng),
    turn: null,
    winner: null,
  };
}

function drawCard(s) {
  const [card, deck] = draw(s.deck, seeded(`fala:${s.turnCount}:${s.deck.index}`));
  s.deck = deck;
  return card;
}

export function reduce(prev, action) {
  const s = structuredClone(prev);
  switch (action.type) {
    case 'start':
      if (s.phase !== 'ready') return prev;
      s.phase = 'playing';
      s.turn = { cards: [], card: drawCard(s) };
      return s;

    case 'mark':
      if (s.phase !== 'playing' || !RESULTS.includes(action.result)) return prev;
      s.turn.cards.push({ card: s.turn.card, result: action.result });
      s.turn.card = drawCard(s);
      return s;

    case 'timeUp':
      if (s.phase !== 'playing') return prev;
      s.phase = 'review';
      return s;

    // Na revisão, um toque troca o resultado: acerto → pulo → proibida → acerto.
    case 'toggle': {
      const item = s.phase === 'review' && s.turn.cards[action.index];
      if (!item) return prev;
      item.result = RESULTS[(RESULTS.indexOf(item.result) + 1) % RESULTS.length];
      return s;
    }

    case 'confirm': {
      if (s.phase !== 'review') return prev;
      const team = s.teams[s.current];
      team.score += turnTotal(s);
      team.explainerIdx++;
      s.turnCount++;
      s.turn = null;
      s.current = (s.current + 1) % s.teams.length;
      s.phase = 'ready';
      // Só termina ao fechar uma volta completa, para todas jogarem igual.
      if (s.turnCount % s.teams.length === 0) {
        const top = leaders(s.teams);
        if (s.teams[top[0]].score >= s.settings.goal && top.length === 1) {
          s.phase = 'won';
          s.winner = top[0];
        }
      }
      return s;
    }
  }
  return prev;
}
