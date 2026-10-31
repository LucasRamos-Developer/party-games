// Estado serializável da partida e regras como ações puras:
// reduce(state, action) → novo state. Nada aqui toca DOM ou storage.

export const CATEGORIES = [
  { key: 'P', name: 'Pessoa, lugar ou animal' },
  { key: 'O', name: 'Objeto' },
  { key: 'A', name: 'Ação' },
  { key: 'D', name: 'Difícil' },
  { key: 'L', name: 'Lazer' },
  { key: 'M', name: 'Mix' },
];

export const categoryName = (key) => CATEGORIES.find((c) => c.key === key)?.name ?? key;

export const ROUND_LABEL = {
  normal: 'Casa comum',
  todos: 'Todos jogam',
  escolha: 'Escolha a categoria',
  final: 'Casa final',
};

export const BOARD_SIZES = { curto: 32, normal: 48, longo: 64 };

export const DEFAULT_SETTINGS = {
  timer: 60, // segundos
  style: 'desenho', // desenho | mimica
  boardSize: 'normal',
  virtualDice: true,
  board: 'small', // off | small | large
  sound: true,
};

const SETTING_KEYS = ['timer', 'style', 'virtualDice', 'board', 'sound'];

const LOG_MAX = 40;

// Início e fim são "todos jogam"; no caminho, uma casa especial a cada 4,
// sendo uma em cada três "escolha a categoria".
export function buildBoard(n) {
  return Array.from({ length: n }, (_, i) => {
    if (i === 0 || i === n - 1) return 'todos';
    if (i % 4 === 0) return (i / 4) % 3 === 0 ? 'escolha' : 'todos';
    return 'normal';
  });
}

export const lastCell = (s) => s.board.length - 1;
export const nextTeam = (s, id) => (id + 1) % s.teams.length;
export const drawerOf = (team) => team.players[team.drawerIdx % team.players.length];

export function roundTypeFor(s, teamId) {
  const pos = s.teams[teamId].pos;
  return pos === lastCell(s) ? 'final' : s.board[pos];
}

export function positionLabel(s, pos) {
  if (pos === 0) return 'Início';
  if (pos === lastCell(s)) return 'Fim';
  return `Casa ${pos}`;
}

// Partidas salvas por versões antigas usavam `mode` para desenho/mímica.
export function migrate(s) {
  const { mode, ...settings } = s.settings ?? {};
  s.settings = { ...DEFAULT_SETTINGS, style: mode ?? DEFAULT_SETTINGS.style, ...settings };
  return s;
}

export function newGame({ teams, settings }) {
  const size = BOARD_SIZES[settings.boardSize] ?? BOARD_SIZES.normal;
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    board: buildBoard(size),
    teams: teams.map((t, i) => ({
      id: i,
      name: t.name,
      color: t.color,
      players: [...t.players],
      drawerIdx: 0,
      pos: 0,
    })),
    current: 0,
    phase: 'ready', // ready → drawing → (move) → ready … → won
    round: null,
    roundSeq: 0,
    mover: null,
    winner: null,
    lastCategory: null,
    lastRoll: null,
    log: ['Partida iniciada. Primeira rodada: todos jogam!'],
  };
}

function log(s, msg) {
  s.log.unshift(msg);
  s.log.length = Math.min(s.log.length, LOG_MAX);
}

export function reduce(prev, action) {
  const s = structuredClone(prev);
  const name = (id) => s.teams[id].name;

  switch (action.type) {
    // Começa a rodada. A categoria é opcional (o dado pode ser o físico) e
    // `all` força "todos jogam" numa casa comum.
    case 'start': {
      if (s.phase !== 'ready') return prev;
      let type = roundTypeFor(s, s.current);
      if (action.all && type === 'normal') type = 'todos';
      const category = action.category ?? null;
      s.round = {
        id: ++s.roundSeq,
        type,
        starter: s.current,
        participants: type === 'normal' ? [s.current] : s.teams.map((t) => t.id),
        category,
        tie: false,
      };
      if (category) s.lastCategory = category;
      s.phase = 'drawing';
      log(
        s,
        `${name(s.current)}: ${ROUND_LABEL[type].toLowerCase()}${category ? `, categoria ${categoryName(category)}` : ''}.`,
      );
      return s;
    }

    // Fim da rodada. `winners` = equipes que acertaram primeiro (mais de uma = empate).
    case 'result': {
      if (s.phase !== 'drawing') return prev;
      const r = s.round;
      const winners = [...new Set(action.winners)].filter((id) => r.participants.includes(id));
      for (const id of r.participants) s.teams[id].drawerIdx++;

      if (winners.length === 0) {
        s.current = nextTeam(s, r.starter);
        s.phase = 'ready';
        s.round = null;
        log(s, `Ninguém acertou. Vez de ${name(s.current)}.`);
      } else if (winners.length === 1) {
        const w = winners[0];
        if (r.type !== 'normal' && s.teams[w].pos === lastCell(s)) {
          s.phase = 'won';
          s.winner = w;
          s.round = null;
          log(s, `${name(w)} acertou primeiro na casa final e venceu!`);
        } else {
          s.phase = 'move';
          s.mover = w;
          log(s, `${name(w)} acertou!`);
        }
      } else {
        // Empate: nova carta, mesma categoria, só entre as empatadas.
        r.id = ++s.roundSeq;
        r.participants = winners;
        r.tie = true;
        log(s, `Empate entre ${winners.map(name).join(', ')}. Nova rodada só entre elas.`);
      }
      return s;
    }

    case 'move': {
      if (s.phase !== 'move') return prev;
      const t = s.teams[s.mover];
      t.pos = Math.min(t.pos + action.value, lastCell(s));
      s.lastRoll = action.value;
      s.current = s.mover;
      s.mover = null;
      s.round = null;
      s.phase = 'ready';
      log(
        s,
        t.pos === lastCell(s)
          ? `${t.name} tirou ${action.value} e chegou ao Fim! Agora precisa acertar primeiro numa rodada "todos jogam".`
          : `${t.name} tirou ${action.value} e foi para a casa ${t.pos}.`,
      );
      return s;
    }

    case 'settings': {
      let changed = false;
      for (const key of SETTING_KEYS) {
        if (!(key in action.patch) || s.settings[key] === action.patch[key]) continue;
        s.settings[key] = key === 'timer' ? Math.max(15, Math.min(600, Number(action.patch.timer) || 60)) : action.patch[key];
        changed = true;
      }
      return changed ? s : prev;
    }

    // Ajuste manual de posição (o app é só um apoio ao tabuleiro físico).
    case 'setPos': {
      if (s.phase !== 'ready') return prev;
      const t = s.teams[action.team];
      const pos = Math.max(0, Math.min(action.pos, lastCell(s)));
      if (!t || t.pos === pos) return prev;
      t.pos = pos;
      log(s, `${t.name} ajustada para ${positionLabel(s, pos).toLowerCase()}.`);
      return s;
    }
  }
  return prev;
}
