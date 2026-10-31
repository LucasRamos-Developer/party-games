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

export const clearLedger = () => storage.remove(KEY);
