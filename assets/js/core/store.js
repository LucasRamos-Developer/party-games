// Estado da partida com histórico (desfazer) e salvamento automático.
// `reduce(state, action)` deve ser puro e devolver o mesmo objeto quando a
// ação não se aplica.

import { storage } from './storage.js';

export function createStore({ key, reduce, historyMax = 40 }) {
  let game = null; // { state, history }
  const listeners = new Set();

  const save = () => storage.save(key, game);
  const emit = (action, prev) => listeners.forEach((fn) => fn(game.state, action, prev));

  return {
    get state() {
      return game?.state ?? null;
    },
    get canUndo() {
      return (game?.history.length ?? 0) > 0;
    },
    async loadSaved() {
      return storage.load(key);
    },
    restore(saved) {
      game = { state: saved.state, history: saved.history ?? [] };
      emit({ type: '@restore' });
    },
    start(state) {
      game = { state, history: [] };
      save();
      emit({ type: '@start' });
    },
    dispatch(action) {
      const prev = game.state;
      const next = reduce(prev, action);
      if (next === prev) return false;
      game.history.push(prev);
      if (game.history.length > historyMax) game.history.shift();
      game.state = next;
      save();
      emit(action, prev);
      return true;
    },
    undo() {
      if (!game?.history.length) return false;
      game.state = game.history.pop();
      save();
      emit({ type: '@undo' });
      return true;
    },
    clear() {
      game = null;
      return storage.remove(key);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
