// Central: mostra as equipes com o placar geral (soma das partidas de todos os
// jogos) e abre o cadastro, que salva sozinho a cada mudança.

import { storage } from './core/storage.js';
import { clearLedger, totalFor, totals } from './core/ledger.js';
import { mountSavedTeams, PLAYERS_KEY } from './core/teams-setup.js';
import { $, esc } from './core/dom.js';

const manager = $('#hub-manager');
const manageBtn = $('#btn-manage-teams');
const dialog = $('#clear-dialog');

async function render() {
  const saved = await storage.load(PLAYERS_KEY);
  const players = saved?.players ?? [];
  const all = await totals();
  const teams = (saved?.teams ?? [])
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
  $('#hub-teams-note').textContent = teams.length
    ? 'Pontos somados de todas as partidas dos jogos em equipe (a rodada de treino não conta).'
    : 'Cadastre os jogadores e monte as equipes aqui: fica salvo para todos os jogos.';
  $('#btn-clear-teams').hidden = !players.length;
  return players.length;
}

const mountManager = () => mountSavedTeams(manager, { onChange: render, onRename: render });

function setManagerOpen(open) {
  manager.hidden = !open;
  manageBtn.setAttribute('aria-expanded', String(open));
  manageBtn.textContent = open ? 'Fechar cadastro' : 'Gerenciar equipes';
}

manageBtn.addEventListener('click', () => setManagerOpen(manager.hidden));

$('#btn-clear-teams').addEventListener('click', () => {
  dialog.returnValue = '';
  dialog.showModal();
});

// Limpa equipes, placar geral e partidas em andamento (que usam essas equipes).
dialog.addEventListener('close', async () => {
  if (dialog.returnValue !== 'clear') return;
  const current = (await storage.list()).filter((k) => k.endsWith(':current'));
  await Promise.all([storage.remove(PLAYERS_KEY), clearLedger(), ...current.map((k) => storage.remove(k))]);
  await mountManager();
  setManagerOpen(true);
  render();
});

await mountManager();
setManagerOpen(!(await render()));
