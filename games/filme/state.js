// Regras do Que Filme É Esse?: reduce(state, action) puro.
//
// Ao lado das pistas fica a lista de palpites com todos os filmes. A cada
// pista nova, some uma parte proporcional da lista (50 → 40 → 30 → 20 → 10),
// sempre os filmes com menos em comum com o secreto. Tocar num filme é o
// chute: acertou, ganha os pontos da pista; errou, zera.

import { createDeck, draw } from '../../assets/js/core/deck.js';
import { advanceQueue, buildQueue } from '../../assets/js/core/turns.js';
import { seeded } from '../../assets/js/core/random.js';
import { FILMES } from './filmes.js';

export const DEFAULT_SETTINGS = { perTeam: 3 };
export const STAGES = 5;
export const stagePoints = (stage) => 10 - 2 * stage; // 10, 8, 6, 4, 2
export const shownCount = (stage) => Math.round((FILMES.length * (STAGES - stage)) / STAGES);

// Filmes mais parecidos com o secreto primeiro (o próprio secreto no topo).
function rankFilms(film, rng) {
  const tags = new Set(FILMES[film].tags);
  const score = FILMES.map((f, i) => (i === film ? Infinity : f.tags.filter((t) => tags.has(t)).length + rng() * 0.9));
  return FILMES.map((_, i) => i).sort((a, b) => score[b] - score[a]);
}

export const shownFilms = (t) => t.ranking.slice(0, shownCount(t.stage));

function drawFilm(s) {
  const [film, deck] = draw(s.deck, seeded(`filme:${s.turnCount}:${s.deck.index}`));
  s.deck = deck;
  s.turn = { film, stage: 0, ranking: rankFilms(film, seeded(`filme:rank:${s.turnCount}`)), guess: null, result: null, points: 0 };
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
    // Chute: só vale filme que ainda está na lista.
    case 'guess':
      if (s.phase !== 'play' || !shownFilms(t).includes(action.film)) return prev;
      t.guess = action.film;
      t.result = action.film === t.film ? 'hit' : 'miss';
      t.points = t.result === 'hit' ? stagePoints(t.stage) : 0;
      s.teams[s.current].score += t.points;
      s.phase = 'reveal';
      return s;

    // Abre a próxima pista (vale menos e a lista diminui).
    case 'clue':
      if (s.phase !== 'play' || t.stage >= STAGES - 1) return prev;
      t.stage++;
      return s;

    case 'giveUp':
      if (s.phase !== 'play') return prev;
      t.result = 'giveUp';
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
