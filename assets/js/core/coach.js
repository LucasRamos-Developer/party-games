// Balões guiados: escurece a tela, destaca um elemento com um "holofote" e
// mostra um balão de vidro com a explicação. Usado na rodada de treino.

import { esc } from './dom.js';

const MARGIN = 16;
const PAD = 8;

export function createCoach() {
  let root = null;
  let spot = null;
  let bubble = null;
  let current = null; // { target, resolve }

  function ensure() {
    if (root) return;
    root = document.createElement('div');
    root.className = 'coach';
    root.hidden = true;
    root.innerHTML = `<div class="coach-spot"></div><div class="coach-bubble" role="dialog" aria-live="polite"></div>`;
    spot = root.querySelector('.coach-spot');
    bubble = root.querySelector('.coach-bubble');
    document.body.append(root);
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-coach]');
      if (b && current) finish(b.dataset.coach);
    });
    window.addEventListener('resize', () => current && place(current.target));
  }

  function place(target) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = target?.getBoundingClientRect();
    const visible = rect && rect.width > 0 && rect.height > 0;
    root.classList.toggle('no-target', !visible);
    const bw = Math.min(380, vw - MARGIN * 2);
    bubble.style.width = `${bw}px`;
    if (!visible) {
      bubble.style.left = `${(vw - bw) / 2}px`;
      bubble.style.top = `${Math.max(MARGIN, (vh - bubble.offsetHeight) / 2)}px`;
      return;
    }
    const top = Math.max(4, rect.top - PAD);
    const left = Math.max(4, rect.left - PAD);
    spot.style.top = `${top}px`;
    spot.style.left = `${left}px`;
    spot.style.width = `${Math.min(vw - 8, rect.right + PAD) - left}px`;
    spot.style.height = `${Math.min(vh - 8, rect.bottom + PAD) - top}px`;

    const bh = bubble.offsetHeight;
    const below = vh - rect.bottom - PAD;
    const above = rect.top - PAD;
    let y;
    if (below >= bh + MARGIN) y = rect.bottom + PAD + 12;
    else if (above >= bh + MARGIN) y = rect.top - PAD - 12 - bh;
    else y = Math.min(vh - bh - MARGIN, Math.max(MARGIN, rect.top + rect.height / 2 - bh / 2)); // por cima do alvo
    const x = Math.min(vw - bw - MARGIN, Math.max(MARGIN, rect.left + rect.width / 2 - bw / 2));
    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;
  }

  function finish(value) {
    const { resolve } = current;
    current = null;
    root.hidden = true;
    resolve(value);
  }

  // Mostra um balão. `actions`: [{ id, label, primary }]. Resolve com o id clicado.
  function step({ sel, text, title, actions }) {
    ensure();
    const target = sel ? document.querySelector(sel) : null;
    bubble.innerHTML = `
      ${title ? `<p class="coach-title">${esc(title)}</p>` : ''}
      <p class="coach-text">${text}</p>
      <div class="coach-actions">
        ${actions.map((a) => `<button type="button" class="${a.primary ? 'btn btn-primary' : 'btn btn-ghost'}" data-coach="${a.id}">${esc(a.label)}</button>`).join('')}
      </div>`;
    root.hidden = false;
    target?.scrollIntoView?.({ block: 'nearest' });
    return new Promise((resolve) => {
      current = { target, resolve };
      place(target);
      bubble.querySelector('.btn-primary')?.focus();
    });
  }

  return {
    step,
    get active() {
      return current !== null;
    },
    // Roda vários passos; "Pular dicas" interrompe e devolve 'skip'.
    async run(steps) {
      for (let i = 0; i < steps.length; i++) {
        const last = i === steps.length - 1;
        const choice = await step({
          ...steps[i],
          title: steps[i].title ?? `Dica ${i + 1} de ${steps.length}`,
          actions: [
            { id: 'skip', label: 'Pular dicas' },
            { id: 'next', label: last ? 'Vamos lá!' : 'Entendi ›', primary: true },
          ],
        });
        if (choice === 'skip') return 'skip';
      }
      return 'done';
    },
    stop() {
      if (current) finish('stop');
    },
  };
}
