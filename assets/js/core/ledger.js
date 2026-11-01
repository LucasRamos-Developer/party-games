// Placar geral: os pontos de cada partida dos jogos em equipe, somados por
// equipe na central. Cada partida tem um id e é regravada a cada mudança,
// então desfazer também corrige o total. Rodada de treino não conta.

import { storage } from './storage.js';

const KEY = 'ledger';
const norm = (name) => name.trim().toLowerCase();

export async function recordMatch(game, state) {
  if (!state?.matchId || state.practice) return;
  const ledger = (await storage.load(KEY)) ?? {};
  ledger[`${game}:${state.matchId}`] = state.teams.map(({ name, color, score }) => ({ name, color, score }));
  await storage.save(KEY, ledger);
}

// Total por nome de equipe: { 'equipe 1': { score, matches } }.
export async function totals() {
  const ledger = (await storage.load(KEY)) ?? {};
  const out = {};
  for (const teams of Object.values(ledger)) {
    for (const t of teams) {
      const entry = (out[norm(t.name)] ??= { score: 0, matches: 0 });
      entry.score += t.score;
      entry.matches += 1;
    }
  }
  return out;
}

export const totalFor = (all, name) => all[norm(name)] ?? { score: 0, matches: 0 };

// O placar soma por nome: renomear leva junto os pontos e as partidas em andamento.
export async function renameTeam(from, to) {
  if (norm(from) === norm(to)) return;
  const rename = (teams) => {
    for (const t of teams ?? []) if (norm(t.name) === norm(from)) t.name = to;
  };
  const ledger = await storage.load(KEY);
  if (ledger) {
    Object.values(ledger).forEach(rename);
    await storage.save(KEY, ledger);
  }
  const current = (await storage.list()).filter((k) => k.endsWith(':current'));
  await Promise.all(
    current.map(async (key) => {
      const game = await storage.load(key);
      if (!game) return;
      rename(game.state?.teams);
      for (const past of game.history ?? []) rename(past.teams);
      await storage.save(key, game);
    }),
  );
}

export const clearLedger = () => storage.remove(KEY);
