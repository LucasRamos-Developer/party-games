// Regras do Quantas Palavras?: reduce(state, action) puro.
//
// Cada rodada é um confronto entre 2 equipes, com um jogador de cada:
//   draw → auction (lances alternados) → answer (cumprir a meta) → result
// Ninguém repete até todos da equipe terem jogado.

import { createDeck, draw } from '../../assets/js/core/deck.js';
import { leaders } from '../../assets/js/core/turns.js';
import { seeded, shuffle } from '../../assets/js/core/random.js';
import { LEVELS, QUESTIONS } from './words.js';

export const DEFAULT_SETTINGS = {
  timer: 90, // tempo para responder
  bidTime: 45, // tempo de cada equipe no leilão (só corre na vez dela, não reinicia)
  mode: 'team', // team: o time dá os lances e o jogador separado responde · pair: os sorteados dão os lances e o time responde
  draw: 'random', // random | manual
  level: 'misto',
};

export const questionsFor = (level) => QUESTIONS.map((q, i) => [q, i]).filter(([q]) => (LEVELS[level] ?? LEVELS.misto).includes(q.level)).map(([, i]) => i);

const allPlayers = (team) => team.players.map((_, i) => i);
// Pool vazio = todos já jogaram; volta a valer qualquer um.
export const available = (team) => (team.pool.length ? team.pool : allPlayers(team));
export const eligibleTeams = (s) => s.teams.filter((t) => !s.contenders || s.contenders.includes(t.id));
export const otherTeam = (r, id) => (r.a.team === id ? r.b.team : r.a.team);

// Lances sugeridos: o próximo número e daí de 5 em 5 (no começo, 1, 5, 10…).
// Os 4 primeiros viram botões; o 5º é o ponto de partida do seletor −/+.
export const bidOptions = (bid) => Array.from({ length: 5 }, (_, i) => (bid === 0 ? Math.max(1, 5 * i) : bid + 1 + 5 * i));

export function newGame({ teams, settings, rng }) {
  const st = { ...DEFAULT_SETTINGS, ...settings };
  const questions = questionsFor(st.level);
  return {
    version: 1,
    settings: st,
    teams: teams.map((t, i) => ({
      id: i,
      name: t.name,
      color: t.color,
      players: [...t.players],
      score: 0,
      pool: allPlayers(t),
      cycled: false, // todos já jogaram pelo menos uma vez
    })),
    questions,
    deck: createDeck(questions.length, rng),
    roundCount: 0,
    contenders: null, // desempate: só as equipes empatadas
    phase: 'draw',
    round: null,
    winner: null,
  };
}

// Sugestão de confronto: as 2 equipes com mais jogadores inéditos (empates
// no sorteio) e um jogador ainda não usado de cada.
export function suggestConfront(s, rng) {
  const fresh = (t) => (t.pool.length ? t.pool.length : 0);
  const teams = shuffle(eligibleTeams(s), rng).sort((x, y) => fresh(y) - fresh(x));
  const [ta, tb] = teams;
  const pickFrom = (t) => available(t)[Math.floor(rng() * available(t).length)];
  return { a: { team: ta.id, player: pickFrom(ta) }, b: { team: tb.id, player: pickFrom(tb) } };
}

function usePlayer(team, player) {
  if (!team.pool.length) team.pool = allPlayers(team);
  team.pool = team.pool.filter((p) => p !== player);
  if (!team.pool.length) team.cycled = true;
}

function score(s) {
  const r = s.round;
  const winner = r.success ? r.answerer : otherTeam(r, r.answerer);
  s.teams[winner].score += 1;
  r.pointTo = winner;
}

export function reduce(prev, action) {
  const s = structuredClone(prev);
  const r = s.round;
  switch (action.type) {
    case 'confront': {
      if (s.phase !== 'draw') return prev;
      const { a, b } = action;
      const ids = eligibleTeams(s).map((t) => t.id);
      if (a.team === b.team || !ids.includes(a.team) || !ids.includes(b.team)) return prev;
      for (const side of [a, b]) {
        if (!available(s.teams[side.team]).includes(side.player)) return prev;
      }
      usePlayer(s.teams[a.team], a.player);
      usePlayer(s.teams[b.team], b.player);
      const [q, deck] = draw(s.deck, seeded(`quantas:${s.roundCount}:${s.deck.index}`));
      s.deck = deck;
      s.round = {
        a,
        b,
        question: s.questions[q],
        bid: 0,
        owner: null, // equipe que deu o maior lance
        turn: a.team, // equipe que decide agora
        answerer: null,
        count: 0,
        success: null,
        pointTo: null,
        timedOut: false,
      };
      s.phase = 'auction';
      return s;
    }

    case 'bid':
      if (s.phase !== 'auction' || !Number.isInteger(action.value) || action.value <= r.bid || action.value > 99) return prev;
      r.bid = action.value;
      r.owner = r.turn;
      r.turn = otherTeam(r, r.turn);
      return s;

    // Duvidar: quem deu o último lance tem que responder.
    case 'pass':
      if (s.phase !== 'auction' || r.owner === null) return prev;
      r.answerer = r.owner;
      s.phase = 'answer';
      return s;

    // Zerou o relógio de quem estava decidindo: essa equipe responde.
    case 'timeout':
      if (s.phase !== 'auction') return prev;
      r.answerer = r.turn;
      r.bid = Math.max(1, r.bid);
      r.timedOut = true;
      s.phase = 'answer';
      return s;

    case 'count':
      if (s.phase !== 'answer') return prev;
      r.count = Math.max(0, r.count + (action.delta === -1 ? -1 : 1));
      if (r.count >= r.bid) {
        r.success = true;
        score(s);
        s.phase = 'result';
      }
      return s;

    case 'fail':
      if (s.phase !== 'answer') return prev;
      r.success = false;
      score(s);
      s.phase = 'result';
      return s;

    case 'next': {
      if (s.phase !== 'result') return prev;
      s.roundCount++;
      s.round = null;
      s.phase = 'draw';
      const allPlayed = s.teams.every((t) => t.cycled);
      if (allPlayed || s.contenders) {
        const top = leaders(s.teams);
        if (top.length === 1) {
          s.phase = 'won';
          s.winner = top[0];
        } else {
          s.contenders = top; // confronto extra entre as empatadas
        }
      }
      return s;
    }
  }
  return prev;
}
