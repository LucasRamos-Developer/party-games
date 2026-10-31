// Regras do Que Filme É Esse?: reduce(state, action) puro.

import { createDeck, draw } from '../../assets/js/core/deck.js';
import { advanceQueue, buildQueue } from '../../assets/js/core/turns.js';
import { seeded } from '../../assets/js/core/random.js';
import { FILMES } from './filmes.js';

export const DEFAULT_SETTINGS = { perTeam: 3 };
export const STAGES = 5;
export const stagePoints = (stage) => 10 - 2 * stage; // 10, 8, 6, 4, 2

function drawFilm(s) {
  const [film, deck] = draw(s.deck, seeded(`filme:${s.turnCount}:${s.deck.index}`));
  s.deck = deck;
  s.turn = { film, stage: 0, result: null, points: 0 };
  s.phase = 'play';
}

export function newGame({ teams, settings, rng }) {
  const st = { ...DEFAULT_SETTINGS, ...settings };
  const s = {
    version: 1,
    settings: st,
    teams: teams.map((t, i) => ({ id: i, name: t.name, color: t.color, players: [...t.players], score: 0 })),
    queue: buildQueue(st.perTeam, teams.length),
    current: 0,
    turnCount: 0,
    tiebreak: false,
    phase: 'play', // play → reveal → play … → won
    deck: createDeck(FILMES.length, rng),
    turn: null,
    winner: null,
  };
  drawFilm(s);
  return s;
}

export function reduce(prev, action) {
  const s = structuredClone(prev);
  const t = s.turn;
  switch (action.type) {
    case 'hit':
      if (s.phase !== 'play') return prev;
      t.result = 'hit';
      t.points = stagePoints(t.stage);
      s.teams[s.current].score += t.points;
      s.phase = 'reveal';
      return s;

    // Errou o chute: abre a próxima etapa; na última, acabou (0 pontos).
    case 'miss':
      if (s.phase !== 'play') return prev;
      if (t.stage < STAGES - 1) t.stage++;
      else {
        t.result = 'miss';
        s.phase = 'reveal';
      }
      return s;

    case 'giveUp':
      if (s.phase !== 'play') return prev;
      t.result = 'miss';
      s.phase = 'reveal';
      return s;

    case 'next':
      if (s.phase !== 'reveal') return prev;
      s.turnCount++;
      if (advanceQueue(s)) drawFilm(s);
      else s.turn = null;
      return s;
  }
  return prev;
}
