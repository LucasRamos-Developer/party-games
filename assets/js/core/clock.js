// Relógio neon em anel: o anel inteiro é o botão (tocar inicia/pausa).
// A cor vem da variável CSS --clock de algum ancestral.

import { formatTime } from './timer.js';

export function mountClock(container, { onTap = () => {}, stateEl = container, label = 'Iniciar ou pausar o timer' } = {}) {
  container.innerHTML = `
    <button class="clock" type="button" aria-label="${label}">
      <svg class="clock-ring" viewBox="0 0 120 120" aria-hidden="true">
        <circle class="clock-track" cx="60" cy="60" r="54" />
        <circle class="clock-progress" cx="60" cy="60" r="54" pathLength="100" />
      </svg>
      <span class="clock-center">
        <span class="clock-time">0:00</span>
        <span class="clock-hint"></span>
      </span>
    </button>`;
  const button = container.querySelector('.clock');
  const time = container.querySelector('.clock-time');
  const hint = container.querySelector('.clock-hint');
  const progress = container.querySelector('.clock-progress');
  button.addEventListener('click', onTap);

  return {
    button,
    update(remaining, total, { running = false, hint: text } = {}) {
      const done = remaining <= 0;
      time.textContent = done ? 'Tempo!' : formatTime(remaining);
      progress.style.strokeDashoffset = String(100 - (remaining / total) * 100);
      stateEl.classList.toggle('is-running', running);
      stateEl.classList.toggle('is-warn', running && remaining <= 10000);
      stateEl.classList.toggle('is-danger', running && remaining <= 3000);
      stateEl.classList.toggle('is-done', done);
      hint.textContent =
        text ?? (running ? 'Toque para pausar' : done ? 'Toque para recomeçar' : remaining < total ? 'Pausado · toque para continuar' : 'Toque para começar');
    },
  };
}

// Explosão visual: flash + tremor no elemento (precisa do CSS de game.css).
export function boom(el) {
  el.classList.remove('is-boom');
  void el.offsetWidth; // reinicia a animação
  el.classList.add('is-boom');
  setTimeout(() => el.classList.remove('is-boom'), 1400);
}
