// Timer (ampulheta) com aviso sonoro nos últimos segundos e wake lock para a
// tela não apagar enquanto está rodando.

let audioCtx = null;

function audio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

export function beep({ freq = 880, duration = 0.12, volume = 0.2, when = 0 } = {}) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

// Tique-taque de relógio: alterna dois timbres curtos.
export function tick(high = false) {
  beep({ freq: high ? 1500 : 1100, duration: 0.035, volume: 0.22 });
}

// Explosão: ruído com filtro passa-baixa descendo + baque grave.
export function explosion() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const length = Math.floor(ac.sampleRate * 1.6);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
  const noise = ac.createBufferSource();
  noise.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(5000, t);
  filter.frequency.exponentialRampToValueAtTime(80, t + 1.4);
  const noiseGain = ac.createGain();
  noiseGain.gain.setValueAtTime(0.9, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
  noise.connect(filter).connect(noiseGain).connect(ac.destination);
  noise.start(t);

  const boom = ac.createOscillator();
  const boomGain = ac.createGain();
  boom.type = 'sine';
  boom.frequency.setValueAtTime(140, t);
  boom.frequency.exponentialRampToValueAtTime(35, t + 0.7);
  boomGain.gain.setValueAtTime(1, t);
  boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
  boom.connect(boomGain).connect(ac.destination);
  boom.start(t);
  boom.stop(t + 1);
}

// Nos últimos `warnAt` segundos toca um tique por segundo; nos últimos
// `fastAt`, dois por segundo. No zero, explode.
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
      if (sound) explosion();
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
