// Rodada de treino: mostra os balões de cada fase na primeira vez que ela
// aparece e, quando o primeiro turno termina, oferece começar valendo.
//
// tips: { [chave]: passos | (state) => passos }   (passos = [{ sel, text }])
// tipKey(state): qual chave usar (padrão: state.phase)
// isDone(action, state, prev): o treino terminou com esta ação?
// onShow(true|false): avisado quando os balões abrem/fecham (pausar timers).

import { createCoach } from './coach.js';

export function createPractice({ tips, tipKey = (s) => s.phase, isDone = () => false, onReal, onAgain, onShow = () => {} }) {
  const coach = createCoach();
  const seen = new Set();
  let skipped = false;
  let busy = false;
  let finishing = false;

  async function show(state) {
    if (!state?.practice || skipped || busy || finishing) return;
    const key = tipKey(state);
    if (!key || seen.has(key) || !tips[key]) return;
    const steps = typeof tips[key] === 'function' ? tips[key](state) : tips[key];
    if (!steps?.length) return;
    seen.add(key);
    busy = true;
    await new Promise((r) => setTimeout(r, 350)); // deixa a tela terminar de animar
    onShow(true);
    const result = await coach.run(steps);
    onShow(false);
    busy = false;
    if (result === 'skip') skipped = true;
  }

  return {
    reset() {
      seen.clear();
      skipped = false;
      finishing = false;
      coach.stop();
    },
    // Chame depois de renderizar a tela.
    after(state) {
      setTimeout(() => show(state), 0);
    },
    // Chame a cada ação do store.
    async check(action, state, prev) {
      if (!state?.practice || finishing || !isDone(action, state, prev)) return;
      finishing = true;
      coach.stop();
      await new Promise((r) => setTimeout(r, 400));
      const choice = await coach.step({
        title: 'Treino concluído!',
        text: 'Agora vocês já sabem jogar. O placar do treino não vale: a partida de verdade começa do zero.',
        actions: [
          { id: 'again', label: 'Treinar de novo' },
          { id: 'real', label: 'Começar valendo', primary: true },
        ],
      });
      finishing = false;
      seen.clear();
      skipped = false;
      if (choice === 'real') onReal?.();
      else if (choice === 'again') onAgain?.();
    },
  };
}
