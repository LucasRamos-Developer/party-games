// Central: quando já tem equipes cadastradas, mostra o placar geral (soma das
// partidas de todos os jogos) e o botão para limpar as equipes.

import { storage } from './core/storage.js';
import { clearLedger, totalFor, totals } from './core/ledger.js';
import { $, esc } from './core/dom.js';

const box = $('#hub-teams');
const dialog = $('#clear-dialog');

async function render() {
  const saved = await storage.load('players');
  const players = saved?.players ?? [];
  if (!players.length) {
    box.hidden = true;
    return;
  }
  const all = await totals();
  const teams = (saved.teams ?? [])
    .map((t, i) => ({ ...t, players: players.filter((p) => p.team === i).map((p) => p.name), ...totalFor(all, t.name) }))
    .filter((t) => t.players.length)
    .sort((a, b) => b.score - a.score);
  const lead = teams.length > 1 && teams[0].score > teams[1].score ? teams[0].name : null;
  $('#hub-team-list').innerHTML = teams
    .map(
      (t) => `
      <li class="hub-team" style="--team:${t.color}">
        <span class="hub-team-name"><span class="dot"></span>${esc(t.name)}${t.name === lead ? ' <span class="hub-lead">na frente</span>' : ''}</span>
        <span class="hub-team-players muted">${t.players.map(esc).join(', ')}</span>
        <b class="hub-team-score">${t.score}<small> pts</small></b>
      </li>`,
    )
    .join('');
  box.hidden = false;
}

$('#btn-clear-teams').addEventListener('click', () => {
  dialog.returnValue = '';
  dialog.showModal();
});

// Limpa equipes, placar geral e partidas em andamento (que usam essas equipes).
dialog.addEventListener('close', async () => {
  if (dialog.returnValue !== 'clear') return;
  const current = (await storage.list()).filter((k) => k.endsWith(':current'));
  await Promise.all([storage.remove('players'), clearLedger(), ...current.map((k) => storage.remove(k))]);
  render();
});

render();
