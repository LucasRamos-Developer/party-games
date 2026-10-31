// Comemoração de acerto: fogos de artifício num canvas por cima da tela,
// com estouros sonoros e fanfarra. Não bloqueia toques (pointer-events: none).

import { fanfare, pop } from './sound.js';

const NEON = ['#ffd23f', '#2bff88', '#00e5ff', '#ff2e88', '#b14cff', '#ff8a00', '#ffffff'];
const GRAVITY = 0.06;

export function celebrate({ color, rockets = 8, duration = 3600, sound = true } = {}) {
  if (sound) fanfare();
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'fireworks';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  const palette = color ? [color, color, ...NEON] : NEON;
  const pick = () => palette[Math.floor(Math.random() * palette.length)];
  const shells = []; // foguetes subindo
  const sparks = []; // faíscas da explosão

  function launch() {
    shells.push({
      x: W * (0.15 + Math.random() * 0.7),
      y: H + 10,
      vy: -(H * 0.012 + Math.random() * H * 0.006),
      top: H * (0.12 + Math.random() * 0.3),
      color: pick(),
    });
  }

  function burst(x, y, color) {
    if (sound) pop();
    const n = 70 + Math.floor(Math.random() * 40);
    const second = pick();
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 + Math.random() * 0.2;
      const speed = 2 + Math.random() * 4.5;
      sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.011 + Math.random() * 0.012,
        color: Math.random() < 0.75 ? color : second,
        size: 1.6 + Math.random() * 1.8,
      });
    }
  }

  // Foguetes escalonados, com um par de rajadas duplas no meio.
  for (let i = 0; i < rockets; i++) setTimeout(launch, i * 380 + (i % 3 === 2 ? 0 : Math.random() * 120));
  setTimeout(launch, 900);
  setTimeout(launch, 1700);

  const start = performance.now();
  function frame(now) {
    // Rastro: apaga só um pouco do quadro anterior.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgb(0 0 0 / 0.22)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    for (let i = shells.length - 1; i >= 0; i--) {
      const s = shells[i];
      s.y += s.vy;
      s.vy *= 0.985;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
      if (s.y <= s.top || s.vy > -1.5) {
        burst(s.x, s.y, s.color);
        shells.splice(i, 1);
      }
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.vx *= 0.97;
      p.vy = p.vy * 0.97 + GRAVITY;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    if (now - start < duration || shells.length || sparks.length) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}
