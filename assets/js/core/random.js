// Sorteio com semente: o mesmo código gera o mesmo resultado em qualquer
// aparelho, o que permite jogos "um celular por pessoa" sem servidor.

import { randomInt } from './dice.js';

export function hashString(text) {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

// Gerador pseudoaleatório pequeno e determinístico: rng() → [0, 1).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const seeded = (text) => mulberry32(hashString(text));

// rng sem semente, para quando não precisa reproduzir o sorteio.
export const freshRng = () => () => randomInt(1 << 30) / (1 << 30);

export function shuffle(list, rng = freshRng()) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const pick = (list, rng = freshRng()) => list[Math.floor(rng() * list.length)];

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O, 1/I

export function roomCode(length = 5) {
  return Array.from({ length }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
}
