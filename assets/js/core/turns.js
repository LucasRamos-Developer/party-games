// Fila de vezes entre equipes, com desempate: quando a fila acaba e há
// empate na liderança, as empatadas jogam mais uma rodada entre si.

export const buildQueue = (rounds, teamCount) => Array.from({ length: rounds * teamCount }, (_, i) => i % teamCount);

export function leaders(teams) {
  const max = Math.max(...teams.map((t) => t.score));
  return teams.filter((t) => t.score === max).map((t) => t.id);
}

// Avança a fila no estado `s` (mutável, já clonado pelo reducer).
// Devolve false quando o jogo acabou (s.phase = 'won').
export function advanceQueue(s) {
  s.queue = s.queue.slice(1);
  if (!s.queue.length) {
    const top = leaders(s.teams);
    if (top.length === 1) {
      s.phase = 'won';
      s.winner = top[0];
      return false;
    }
    s.queue = [...top];
    s.tiebreak = true;
  }
  s.current = s.queue[0];
  return true;
}
