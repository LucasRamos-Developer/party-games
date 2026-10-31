// Componente de cadastro de jogadores e divisão em equipes, reutilizável por
// qualquer jogo da central.

import { esc } from './dom.js';
import { randomInt } from './dice.js';

export const TEAM_COLORS = ['#ff2e88', '#00e5ff', '#39ff14', '#b14cff'];

let seq = 0;
const uid = () => `p${++seq}`;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export function mountTeamsSetup(root, options = {}) {
  const { minTeams = 2, maxTeams = 4, minPerTeam = 2 } = options;
  const saved = options.initial ?? {};
  // Montar de novo (voltar ao setup) desliga os ouvintes da montagem anterior.
  root.unmountTeams?.();
  const ctl = new AbortController();
  root.unmountTeams = () => ctl.abort();
  const on = (target, type, fn) => target.addEventListener(type, fn, { signal: ctl.signal });

  const state = {
    count: clamp(saved.teams?.length || minTeams, minTeams, maxTeams),
    teams: Array.from({ length: maxTeams }, (_, i) => ({
      name: saved.teams?.[i]?.name || `Equipe ${i + 1}`,
      color: saved.teams?.[i]?.color || TEAM_COLORS[i % TEAM_COLORS.length],
    })),
    players: [],
  };
  for (const p of saved.players ?? []) {
    state.players.push({ id: uid(), name: p.name, team: clamp(p.team ?? 0, 0, state.count - 1) });
  }

  root.innerHTML = `
    <section class="card stack">
      <div class="row between">
        <h2>Jogadores</h2>
        <span class="muted" data-ref="count"></span>
      </div>
      <form class="row add-player" data-ref="form">
        <input type="text" data-ref="name" placeholder="Nome do jogador" maxlength="24" autocomplete="off" aria-label="Nome do jogador">
        <button class="btn btn-primary" type="submit">Adicionar</button>
      </form>
      <ul class="player-list" data-ref="list"></ul>
    </section>
    <section class="card stack">
      <div class="row between wrap">
        <h2>Equipes</h2>
        <div class="segmented" role="group" aria-label="Número de equipes" data-ref="counts">
          ${Array.from({ length: maxTeams - minTeams + 1 }, (_, i) => minTeams + i)
            .map((n) => `<button type="button" data-count="${n}">${n} equipes</button>`)
            .join('')}
        </div>
      </div>
      <button type="button" class="btn" data-ref="shuffle">Sortear equipes</button>
      <div class="team-grid" data-ref="teams"></div>
    </section>`;

  const ref = (name) => root.querySelector(`[data-ref="${name}"]`);
  const membersOf = (i) => state.players.filter((p) => p.team === i);
  const smallestTeam = () => {
    let best = 0;
    for (let i = 1; i < state.count; i++) if (membersOf(i).length < membersOf(best).length) best = i;
    return best;
  };

  function renderPlayers() {
    ref('count').textContent = `${state.players.length} jogador${state.players.length === 1 ? '' : 'es'}`;
    ref('list').innerHTML = state.players.length
      ? state.players
          .map(
            (p) => `
        <li class="player-item" style="--team:${state.teams[p.team].color}">
          <span class="dot"></span>
          <span class="player-name">${esc(p.name)}</span>
          <select data-player="${p.id}" aria-label="Equipe de ${esc(p.name)}">
            ${state.teams
              .slice(0, state.count)
              .map((t, i) => `<option value="${i}" ${i === p.team ? 'selected' : ''}>${esc(t.name)}</option>`)
              .join('')}
          </select>
          <button type="button" class="icon-btn" data-remove="${p.id}" aria-label="Remover ${esc(p.name)}">×</button>
        </li>`,
          )
          .join('')
      : '<li class="empty muted">Adicione os nomes de quem vai jogar.</li>';
  }

  function renderTeams() {
    ref('counts').querySelectorAll('button').forEach((b) => {
      b.setAttribute('aria-pressed', String(Number(b.dataset.count) === state.count));
    });
    ref('teams').innerHTML = state.teams
      .slice(0, state.count)
      .map((t, i) => {
        const members = membersOf(i);
        return `
        <div class="team-card" style="--team:${t.color}" data-team-card="${i}">
          <div class="row">
            <input type="color" value="${t.color}" data-team-color="${i}" aria-label="Cor da equipe">
            <input type="text" value="${esc(t.name)}" data-team-name="${i}" maxlength="20" aria-label="Nome da equipe">
          </div>
          <ul class="members">
            ${members.map((p) => `<li class="member" data-member="${p.id}" title="Arraste para outra equipe">${esc(p.name)}</li>`).join('') || '<li class="muted">Sem jogadores · arraste alguém para cá</li>'}
          </ul>
          <small class="${members.length < minPerTeam ? 'warn-text' : 'muted'}">${members.length} jogador${members.length === 1 ? '' : 'es'}</small>
        </div>`;
      })
      .join('');
  }

  function render() {
    renderPlayers();
    renderTeams();
  }

  on(ref('form'), 'submit', (e) => {
    e.preventDefault();
    const input = ref('name');
    const name = input.value.trim().replace(/\s+/g, ' ');
    if (!name) return;
    if (state.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      input.setCustomValidity('Já existe um jogador com esse nome.');
      input.reportValidity();
      return;
    }
    state.players.push({ id: uid(), name, team: smallestTeam() });
    input.value = '';
    input.focus();
    render();
  });

  on(ref('name'), 'input', (e) => e.target.setCustomValidity(''));

  on(root, 'click', (e) => {
    const remove = e.target.closest('[data-remove]');
    if (remove) {
      state.players = state.players.filter((p) => p.id !== remove.dataset.remove);
      render();
      return;
    }
    const count = e.target.closest('[data-count]');
    if (count) {
      state.count = Number(count.dataset.count);
      for (const p of state.players) if (p.team >= state.count) p.team = smallestTeam();
      // Equipes novas recebem jogadores das maiores até equilibrar.
      for (;;) {
        const sizes = Array.from({ length: state.count }, (_, i) => membersOf(i).length);
        const max = sizes.indexOf(Math.max(...sizes));
        const min = sizes.indexOf(Math.min(...sizes));
        if (sizes[max] - sizes[min] <= 1) break;
        membersOf(max).at(-1).team = min;
      }
      render();
      return;
    }
    if (e.target.closest('[data-ref="shuffle"]')) {
      const shuffled = [...state.players];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      shuffled.forEach((p, i) => (p.team = i % state.count));
      state.players = shuffled;
      render();
    }
  });

  on(root, 'change', (e) => {
    const sel = e.target.closest('[data-player]');
    if (sel) {
      state.players.find((p) => p.id === sel.dataset.player).team = Number(sel.value);
      render();
    }
    if (e.target.matches('[data-team-name]')) renderPlayers();
  });

  on(root, 'input', (e) => {
    if (e.target.matches('[data-team-name]')) {
      state.teams[Number(e.target.dataset.teamName)].name = e.target.value;
    }
    if (e.target.matches('[data-team-color]')) {
      const i = Number(e.target.dataset.teamColor);
      state.teams[i].color = e.target.value;
      root.querySelector(`[data-team-card="${i}"]`).style.setProperty('--team', e.target.value);
      renderPlayers();
    }
  });

  // Arrastar um jogador de um card de equipe para outro (dedo ou mouse).
  let drag = null; // { id, x, y, ghost, over }
  const cardAt = (x, y) => document.elementFromPoint(x, y)?.closest('[data-team-card]');

  function endDrag() {
    drag?.ghost?.remove();
    drag?.over?.classList.remove('is-drop');
    drag = null;
  }

  on(root, 'pointerdown', (e) => {
    const member = e.target.closest('[data-member]');
    if (!member || e.button > 0) return;
    drag = { id: member.dataset.member, x: e.clientX, y: e.clientY, ghost: null, over: null };
  });

  on(window, 'pointermove', (e) => {
    if (!drag) return;
    if (!drag.ghost) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
      const p = state.players.find((pl) => pl.id === drag.id);
      drag.ghost = document.createElement('div');
      drag.ghost.className = 'member-ghost';
      drag.ghost.style.setProperty('--team', state.teams[p.team].color);
      drag.ghost.textContent = p.name;
      document.body.append(drag.ghost);
    }
    drag.ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    const over = cardAt(e.clientX, e.clientY);
    if (over !== drag.over) {
      drag.over?.classList.remove('is-drop');
      over?.classList.add('is-drop');
      drag.over = over;
    }
  });

  on(window, 'pointerup', (e) => {
    if (!drag?.ghost) return endDrag();
    const card = cardAt(e.clientX, e.clientY);
    const p = state.players.find((pl) => pl.id === drag.id);
    endDrag();
    if (card && p) {
      p.team = Number(card.dataset.teamCard);
      render();
    }
  });
  on(window, 'pointercancel', endDrag);

  render();

  return {
    getResult() {
      const teams = state.teams.slice(0, state.count).map((t, i) => ({
        name: t.name.trim() || `Equipe ${i + 1}`,
        color: t.color,
        players: membersOf(i).map((p) => p.name),
      }));
      let error = null;
      if (state.players.length < minPerTeam * state.count) {
        error = `Adicione pelo menos ${minPerTeam * state.count} jogadores para ${state.count} equipes.`;
      } else {
        const small = teams.find((t) => t.players.length < minPerTeam);
        if (small) error = `${small.name} precisa de pelo menos ${minPerTeam} jogadores.`;
      }
      return {
        ok: !error,
        error,
        teams,
        snapshot: {
          players: state.players.map(({ name, team }) => ({ name, team })),
          teams: teams.map(({ name, color }) => ({ name, color })),
        },
      };
    },
  };
}
