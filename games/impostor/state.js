// Regras do Impostor. `roundInfo` é determinístico: mesmo código + rodada +
// número de jogadores dá o mesmo resultado em qualquer aparelho, sem servidor.

import { pick, seeded, shuffle } from '../../assets/js/core/random.js';
import { CATEGORIES } from './words.js';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 15;
export const impostorCount = (n) => (n >= 7 ? 2 : 1);

export function roundInfo(code, round, n) {
  const rng = seeded(`${code.trim().toUpperCase()}:${round}:${n}`);
  const category = pick(CATEGORIES, rng);
  const word = pick(category.words, rng);
  const impostors = shuffle([...Array(n).keys()], rng)
    .slice(0, impostorCount(n))
    .sort((a, b) => a - b);
  const starter = Math.floor(rng() * n);
  return { category: category.name, word, impostors, starter };
}

// ---------- modo um aparelho ----------

export function newGame({ players, discuss, code }) {
  return {
    version: 1,
    code,
    round: 1,
    discuss, // segundos de discussão
    players: players.map((name) => ({ name, score: 0 })),
    phase: 'pass', // pass → discuss → vote → result → pass …
    revealIdx: 0,
    vote: null,
  };
}

export function reduce(prev, action) {
  const s = structuredClone(prev);
  const n = s.players.length;
  switch (action.type) {
    // O jogador da vez já viu a carta e passou o aparelho.
    case 'revealed':
      if (s.phase !== 'pass') return prev;
      s.revealIdx++;
      if (s.revealIdx >= n) s.phase = 'discuss';
      return s;

    case 'toVote':
      if (s.phase !== 'discuss') return prev;
      s.phase = 'vote';
      return s;

    // Impostor descoberto: +1 para cada um dos outros. Escapou: +2 para cada impostor.
    case 'vote': {
      if (s.phase !== 'vote' || !(action.player >= 0 && action.player < n)) return prev;
      const { impostors } = roundInfo(s.code, s.round, n);
      s.vote = action.player;
      const caught = impostors.includes(action.player);
      s.players.forEach((p, i) => {
        const isImpostor = impostors.includes(i);
        if (caught && !isImpostor) p.score += 1;
        if (!caught && isImpostor) p.score += 2;
      });
      s.phase = 'result';
      return s;
    }

    case 'nextRound':
      if (s.phase !== 'result') return prev;
      s.round++;
      s.phase = 'pass';
      s.revealIdx = 0;
      s.vote = null;
      return s;
  }
  return prev;
}
