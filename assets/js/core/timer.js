// Timer (ampulheta) com aviso sonoro nos últimos segundos e wake lock para a
// tela não apagar enquanto está rodando.

import { audio, explosion, siren, stopSiren, tick } from './sound.js';

// Nos últimos `warnAt` segundos toca um tique por segundo; nos últimos
// `fastAt`, dois por segundo. No zero, explode e toca a sirene, que só para
// sozinha ou quando um timer começa a correr (reset não corta: vários jogos
// chamam reset logo ao zerar).
export function createTimer({
  duration = 60,
  warnAt = 10,
  fastAt = 3,
  sound = true,
  onTick = () => {},
  onEnd = () => {},
} = {}) {
  let total = duration * 1000;
  let remaining = total;
  let endAt = 0;
  let interval = null;
  let lastBeat = null;
  let wakeLock = null;

  async function lock() {
    try {
      wakeLock = (await navigator.wakeLock?.request('screen')) ?? null;
    } catch {
      wakeLock = null;
    }
  }

  function unlock() {
    wakeLock?.release?.().catch(() => {});
    wakeLock = null;
  }

  document.addEventListener('visibilitychange', () => {
    if (interval && document.visibilityState === 'visible') lock();
  });

  function stop() {
    clearInterval(interval);
    interval = null;
    unlock();
  }

  function update() {
    remaining = Math.max(0, endAt - performance.now());
    const halves = Math.ceil(remaining / 500);
    if (halves !== lastBeat) {
      lastBeat = halves;
      const sec = halves / 2;
      const onSecond = halves % 2 === 0;
      if (sound && remaining > 0 && sec <= warnAt && (onSecond || sec <= fastAt)) tick(!onSecond);
    }
    if (remaining <= 0) {
      stop();
      if (sound) {
        explosion();
        siren();
      }
      onTick(remaining, total);
      onEnd();
      return;
    }
    onTick(remaining, total);
  }

  const api = {
    start() {
      if (interval) return;
      if (remaining <= 0) remaining = total;
      audio(); // libera o áudio dentro do gesto do usuário
      stopSiren();
      endAt = performance.now() + remaining;
      lastBeat = Math.ceil(remaining / 500);
      interval = setInterval(update, 50);
      lock();
      onTick(remaining, total);
    },
    pause() {
      if (!interval) return;
      remaining = Math.max(0, endAt - performance.now());
      stop();
      onTick(remaining, total);
    },
    toggle() {
      interval ? api.pause() : api.start();
    },
    reset(seconds) {
      stop();
      if (seconds) total = seconds * 1000;
      remaining = total;
      onTick(remaining, total);
    },
    setSound(value) {
      sound = value;
    },
    get running() {
      return interval !== null;
    },
    get remaining() {
      return remaining;
    },
    get total() {
      return total;
    },
  };
  return api;
}

export function formatTime(ms) {
  const sec = Math.ceil(ms / 1000);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
