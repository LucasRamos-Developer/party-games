// Sons sintetizados com WebAudio (sem arquivos de áudio).

let audioCtx = null;

export function audio() {
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

// Acerto: arpejo curto subindo.
export function success() {
  [523, 659, 784, 1047].forEach((freq, i) => beep({ freq, duration: 0.12, volume: 0.18, when: i * 0.07 }));
}

// Pular/passar: dois tons descendo.
export function skip() {
  [440, 330].forEach((freq, i) => beep({ freq, duration: 0.14, volume: 0.16, when: i * 0.1 }));
}

// Erro/falta: tom grave curto.
export function buzz() {
  beep({ freq: 150, duration: 0.35, volume: 0.25 });
}
