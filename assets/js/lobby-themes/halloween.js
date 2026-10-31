// Tema Halloween da tela de espera: silhuetas pretas contra um céu de brasa
// (escuro; "acender a luz" deixa o céu laranja). Cada pessoa ganha um túmulo
// e um monstro sorteado pelo nome, que sobe dizendo o nome quando tocam nele.
// Também: lanterna que segue o ponteiro, morcegos que fogem, casa com janelas
// que acendem, aranha, abóbora que ri e lua que solta raio.
//
// Contrato de tema: { css, mount(stage, ctx) } e mount devolve
// { setLight(on), callAll(), layout(), destroy() }.
// ctx = { people: [{ name, color }], light, pointer: { x, y, at },
//         reducedMotion, setLight(on), sfx(play) }

import { audio } from '../core/sound.js';

// ---------- personagens (viewBox 0 0 100 100; .pupils segue o ponteiro) ----------

const MONSTERS = {
  fantasma: `
    <path fill="#efe6da" fill-opacity=".93" d="M18 100V50C18 24 33 8 50 8s32 16 32 42v50l-8-7-8 7-8-7-8 7-8-7-8 7-8-7-8 7z"/>
    <ellipse cx="29" cy="60" rx="5" ry="3" fill="#ff8aa0" opacity=".4"/><ellipse cx="71" cy="60" rx="5" ry="3" fill="#ff8aa0" opacity=".4"/>
    <g class="pupils" fill="#120a10"><ellipse cx="39" cy="46" rx="6" ry="9"/><ellipse cx="61" cy="46" rx="6" ry="9"/></g>
    <ellipse cx="50" cy="70" rx="6" ry="8" fill="#120a10"/>`,
  vampiro: `
    <path class="sil" d="M6 100l14-42 14 14 16-8 16 8 14-14 14 42z"/>
    <path fill="#6a0716" d="M24 66l10 10 16-8 16 8 10-10-6 34H30z"/>
    <path fill="#d8dccd" d="M31 46c0-20 8-32 19-32s19 12 19 32c0 18-9 28-19 28S31 64 31 46z"/>
    <path class="sil" d="M29 42c-2-28 44-28 42 0l-8-10-13 12-13-12z"/>
    <g class="eyes" fill="#ff3030" filter="url(#hw-glow)"><ellipse cx="42" cy="50" rx="5" ry="3.4"/><ellipse cx="58" cy="50" rx="5" ry="3.4"/></g>
    <g class="pupils" fill="#1a0000"><circle cx="42" cy="50" r="1.8"/><circle cx="58" cy="50" r="1.8"/></g>
    <path d="M42 62q8 4 16 0" fill="none" stroke="#3a0008" stroke-width="2"/>
    <path fill="#fff" d="M45 63l2 6 2-5zM51 64l2 5 2-6z"/>`,
  abobora: `
    <path fill="#1c2a10" d="M47 26c0-8 2-15 8-18l4 4c-4 2-6 7-6 14z"/>
    <ellipse class="sil" cx="30" cy="63" rx="22" ry="34"/>
    <ellipse class="sil" cx="70" cy="63" rx="22" ry="34"/>
    <ellipse class="sil" cx="50" cy="63" rx="26" ry="37"/>
    <g class="pupils" fill="#ff9a1a" filter="url(#hw-glow)">
      <path d="M30 54l9-14 9 14zM52 54l9-14 9 14zM46 64l4-7 4 7z"/>
      <path d="M26 72q24 24 48 0q-24 10-48 0z"/>
    </g>`,
  mumia: `
    <path fill="#bfb29a" d="M24 100V46c0-22 12-34 26-34s26 12 26 34v54z"/>
    <path fill="none" stroke="#7d705c" stroke-width="3" stroke-linecap="round" d="M26 30l48 10M24 60l52-8M24 74l52 8M24 90l52-6M32 18l36 6"/>
    <path fill="#120a08" d="M28 40h44v14H28z" transform="rotate(-4 50 47)"/>
    <g class="eyes" fill="#ffd23f" filter="url(#hw-glow)"><circle cx="40" cy="47" r="5"/><circle cx="60" cy="46" r="3.6"/></g>
    <g class="pupils" fill="#1a1000"><circle cx="40" cy="47" r="2"/><circle cx="60" cy="46" r="1.5"/></g>`,
  esqueleto: `
    <path fill="#ebe2cf" d="M22 48c0-22 13-36 28-36s28 14 28 36c0 12-6 20-12 24v12H34V72c-6-4-12-12-12-24z"/>
    <path fill="#ebe2cf" d="M44 84h12v16H44z"/>
    <g fill="#120a08"><ellipse cx="39" cy="48" rx="8" ry="9"/><ellipse cx="61" cy="48" rx="8" ry="9"/><path d="M50 58l-4 8h8z"/></g>
    <g class="pupils" fill="#ff7a1a" filter="url(#hw-glow)"><circle cx="39" cy="49" r="2.6"/><circle cx="61" cy="49" r="2.6"/></g>
    <path stroke="#120a08" stroke-width="1.6" d="M38 74v9M44 74v9M50 74v9M56 74v9M62 74v9M44 90h12"/>`,
  bruxa: `
    <path class="sil" d="M26 100c0-26 9-44 24-44s24 18 24 44z"/>
    <ellipse fill="#6f9a52" cx="50" cy="58" rx="16" ry="18"/>
    <path fill="#5a8a40" d="M50 58l7 11-8-2z"/>
    <path d="M43 69q7 5 14 0" fill="none" stroke="#1a2a10" stroke-width="2"/>
    <g class="eyes" fill="#fff35a" filter="url(#hw-glow)"><ellipse cx="44" cy="56" rx="3.6" ry="3"/><ellipse cx="57" cy="56" rx="3.6" ry="3"/></g>
    <g class="pupils" fill="#111"><circle cx="44" cy="56" r="1.5"/><circle cx="57" cy="56" r="1.5"/></g>
    <ellipse class="sil" cx="50" cy="42" rx="38" ry="6"/>
    <path class="sil" d="M34 42l12-28q6-10 18-8-8 3-10 10l12 26z"/>
    <path fill="#7a2bd0" d="M37 36h26l1 5H36z"/>`,
  gato: `
    <path class="sil" d="M20 100c0-20 4-38 10-48l-4-30 18 16c4-1 8-1 12 0l18-16-4 30c6 10 10 28 10 48z"/>
    <g class="eyes" fill="#c6ff3a" filter="url(#hw-glow)"><ellipse cx="40" cy="54" rx="7" ry="6"/><ellipse cx="60" cy="54" rx="7" ry="6"/></g>
    <g class="pupils" fill="#0a0a00"><ellipse cx="40" cy="54" rx="1.6" ry="5"/><ellipse cx="60" cy="54" rx="1.6" ry="5"/></g>
    <path fill="#ff7aa8" d="M47 63h6l-3 3z"/>
    <path fill="none" stroke="rgb(255 160 80 / .5)" stroke-width="1" d="M34 66l-14-2M34 69l-13 3M66 66l14-2M66 69l13 3"/>`,
};

const KINDS = Object.keys(MONSTERS);

const LINES = {
  fantasma: ['Buuu! Aqui é {n}!', '{n} veio assombrar a festa!'],
  vampiro: ['{n} só sai depois que escurece.', 'Boa noite... {n} chegou.'],
  abobora: ['Doce ou travessura, {n}?', '{n} tá com a cabeça iluminada!'],
  mumia: ['{n} acordou depois de 3 mil anos.', 'Mmmmm... {n} quer jogar!'],
  esqueleto: ['{n} tá só o pó... e o osso!', 'Nada mete medo em {n}.'],
  bruxa: ['{n} lançou um feitiço!', 'Abracadabra, {n} chegou!'],
  gato: ['Miau... {n} dá sorte, viu?', '{n} tem sete vidas.'],
};

const STONES = [
  'M8 120V44C8 20 27 6 50 6s42 14 42 38v76z',
  'M10 120V44Q10 18 50 4q40 14 40 40v76z',
  'M14 120V50q0-8 8-8h20V28H32V18h10V6h16v12h10v10H58v14h20q8 0 8 8v70z',
  'M10 120V24q0-10 10-10h60q10 0 10 10v96z',
];

// Janelas da casa: x, y, largura, altura (viewBox 0 0 220 240).
const WINDOWS = [
  [41, 140, 14, 20],
  [41, 178, 14, 20],
  [76, 128, 18, 24],
  [128, 128, 18, 24],
  [134, 72, 14, 22],
  [169, 166, 14, 20],
  [102, 80, 16, 16],
  [101, 180, 18, 34],
];

const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.codePointAt(0)) >>> 0, 7);
const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

// ---------- sons ----------

function tone({ type = 'sine', from, to = from, dur, vol = 0.1, when = 0 }) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

const SFX = {
  squeak() {
    tone({ from: 3200, to: 4800, dur: 0.05, vol: 0.04 });
    tone({ from: 3600, to: 5400, dur: 0.05, vol: 0.03, when: 0.08 });
  },
  boo(low = false) {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime;
    const base = low ? 160 : 300;
    const osc = ac.createOscillator();
    const lfo = ac.createOscillator();
    const depth = ac.createGain();
    const gain = ac.createGain();
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.linearRampToValueAtTime(base * 1.7, t + 0.5);
    osc.frequency.linearRampToValueAtTime(base * 0.9, t + 1.3);
    lfo.frequency.value = 6;
    depth.gain.value = base * 0.04;
    lfo.connect(depth).connect(osc.frequency);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.09, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + 1.5);
    lfo.stop(t + 1.5);
  },
  laugh() {
    [0, 0.15, 0.3, 0.47].forEach((when, i) => tone({ type: 'square', from: 300 - i * 25, to: 220 - i * 25, dur: 0.11, vol: 0.035, when }));
  },
  meow() {
    tone({ type: 'triangle', from: 560, to: 900, dur: 0.22, vol: 0.08 });
    tone({ type: 'triangle', from: 900, to: 480, dur: 0.32, vol: 0.08, when: 0.2 });
  },
  click() {
    tone({ from: 900, to: 620, dur: 0.07, vol: 0.05 });
  },
  zip() {
    tone({ type: 'triangle', from: 300, to: 1400, dur: 0.3, vol: 0.04 });
  },
  thunder(vol = 0.5) {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime + 0.25;
    const len = 2.6;
    const buffer = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ac.createBufferSource();
    noise.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + len);
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.06);
    gain.gain.exponentialRampToValueAtTime(vol * 0.4, t + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
    noise.connect(filter).connect(gain).connect(ac.destination);
    noise.start(t);
  },
};

const MONSTER_SFX = {
  fantasma: () => SFX.boo(),
  vampiro: () => SFX.boo(true),
  abobora: SFX.laugh,
  mumia: () => SFX.boo(true),
  esqueleto: SFX.laugh,
  bruxa: SFX.laugh,
  gato: SFX.meow,
};

// ---------- peças fixas da cena ----------

const DEFS = `
  <svg class="hw-defs" width="0" height="0" aria-hidden="true">
    <defs>
      <filter id="hw-glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
  </svg>`;

const HILLS = `
  <svg class="hw-hills" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true">
    <path fill="#0d0609" d="M0 120C150 80 300 110 420 95S700 40 1000 60V200H0z"/>
    <path fill="#060306" d="M0 160c200-20 400 5 600-10s250-10 400 5v45H0z"/>
  </svg>`;

const HOUSE = `
  <svg class="hw-house" viewBox="0 0 220 240">
    <path fill="#0d0609" d="M-10 240c30-28 80-36 120-36s90 8 120 36z"/>
    <g class="hw-house-body">
      <path d="M80 72V40h12v28z"/>
      <path d="M22 214V130H12l36-38 36 38H74v84z"/>
      <path d="M62 214V108h96v106z"/>
      <path d="M54 110l56-58 56 58z"/>
      <path d="M126 112V60h30v52z"/>
      <path d="M120 62l21-54 21 54z"/>
      <path d="M156 214v-64h40v64z"/>
      <path d="M150 152l26-30 26 30z"/>
      <path d="M141 10V0M137 4h8" stroke="#050305" stroke-width="2"/>
    </g>
    ${WINDOWS.map(
      ([x, y, w, h], i) => `
      <g class="win" data-win="${i}">
        <rect class="pane" x="${x}" y="${y}" width="${w}" height="${h}" rx="1.5"/>
        <g class="figure"><circle cx="${x + w / 2}" cy="${y + h * 0.42}" r="${w * 0.2}"/><path d="M${x + w * 0.18} ${y + h}q${w * 0.32}-${h * 0.5} ${w * 0.64} 0z"/></g>
        <path class="mull" d="M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}"/>
      </g>`,
    ).join('')}
  </svg>`;

const BRANCH = `
  <svg viewBox="0 0 320 170" aria-hidden="true">
    <g fill="none" stroke="#050305" stroke-linecap="round">
      <path stroke-width="16" d="M-10 18C40 10 90 24 140 22"/>
      <path stroke-width="10" d="M138 22c40-2 80-14 112 2"/>
      <path stroke-width="6" d="M248 23c26 12 30 44 6 52-18 6-30-10-20-22 8-8 20-2 16 6"/>
      <path stroke-width="4" d="M70 18c-6-10-4-18 6-24M110 24c8 12 22 16 34 12M190 14c4-8 14-12 22-10"/>
    </g>
  </svg>`;

const LANTERN = `
  <svg viewBox="0 0 40 60" aria-hidden="true">
    <circle cx="20" cy="4" r="3.5" fill="none" stroke="#050305" stroke-width="2"/>
    <path fill="#050305" d="M8 15h24l-4-8H12z"/>
    <rect class="glass" x="10" y="15" width="20" height="29" rx="2"/>
    <path class="flame" d="M20 21c4 6 6 10 0 16-6-6-4-10 0-16z"/>
    <path stroke="#050305" stroke-width="2.5" d="M11 15v29M29 15v29"/>
    <path fill="#050305" d="M6 44h28l-3 7H9z"/>
  </svg>`;

const SPIDER = `
  <svg viewBox="0 0 40 40" aria-hidden="true">
    <g stroke="#050305" stroke-width="2" fill="none" stroke-linecap="round">
      <path d="M14 18l-8-6-4 4M14 21l-10-1-3 5M15 24l-9 5-1 6M17 26l-5 8"/>
      <path d="M26 18l8-6 4 4M26 21l10-1 3 5M25 24l9 5 1 6M23 26l5 8"/>
    </g>
    <ellipse cx="20" cy="22" rx="8" ry="9" fill="#050305"/>
    <circle cx="20" cy="12" r="5" fill="#050305"/>
    <circle cx="18" cy="12" r="1.3" fill="#ff5a2a"/><circle cx="22" cy="12" r="1.3" fill="#ff5a2a"/>
  </svg>`;

const PUMPKIN = `
  <svg viewBox="0 0 200 170" aria-hidden="true">
    <path fill="#0a0806" d="M94 36c-2-14 2-26 12-32l8 6c-8 6-10 14-8 26z"/>
    <path d="M110 14c14-10 30-6 34 6-8-6-18-6-26 2" fill="none" stroke="#0a0806" stroke-width="4" stroke-linecap="round"/>
    <ellipse class="lobe" cx="58" cy="102" rx="50" ry="64"/>
    <ellipse class="lobe" cx="142" cy="102" rx="50" ry="64"/>
    <ellipse class="lobe" cx="100" cy="102" rx="56" ry="66"/>
    <g class="pupils">
      <g class="face" filter="url(#hw-glow)">
        <path d="M52 86l22-30 22 30zM104 86l22-30 22 30zM92 106l8-14 8 14z"/>
        <path d="M44 118q56 50 112 0q-56 22-112 0z"/>
      </g>
      <path fill="#050305" d="M80 126h12v10H80zM110 126h12v10h-12z"/>
    </g>
  </svg>`;

const BAT = `
  <svg viewBox="0 0 60 30" aria-hidden="true">
    <g class="wings"><path d="M30 14C24 4 12 2 0 8c6 2 8 6 8 10 4-3 8-3 11 1 2-4 6-5 11-5zM30 14c6-10 18-12 30-6-6 2-8 6-8 10-4-3-8-3-11 1-2-4-6-5-11-5z"/></g>
    <ellipse cx="30" cy="16" rx="4.5" ry="7"/>
    <path d="M26.5 10l1-5 2 4M33.5 10l-1-5-2 4"/>
    <circle cx="28.4" cy="13" r="0.9" fill="#ff6a2a"/><circle cx="31.6" cy="13" r="0.9" fill="#ff6a2a"/>
  </svg>`;

function grassPath() {
  let d = 'M0 60V40';
  for (let x = 0; x < 1200; ) {
    const w = rand(6, 14);
    d += `L${(x + w / 2).toFixed(1)} ${rand(4, 30).toFixed(1)}L${(x + w).toFixed(1)} ${rand(34, 46).toFixed(1)}`;
    x += w;
  }
  return `${d}L1200 60z`;
}

function stars(n) {
  return Array.from({ length: n }, () => {
    const s = rand(1, 2.6).toFixed(1);
    return `<i style="left:${rand(0, 100).toFixed(1)}%;top:${rand(0, 55).toFixed(1)}%;width:${s}px;height:${s}px;animation-delay:-${rand(0, 4).toFixed(1)}s"></i>`;
  }).join('');
}

// ---------- tema ----------

export default {
  css: new URL('./halloween.css', import.meta.url).href,

  mount(stage, ctx) {
    const { pointer, reducedMotion, sfx } = ctx;
    const timers = new Set();
    const later = (fn, ms) => {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
      return id;
    };

    const root = document.createElement('div');
    root.className = 'hw';
    root.classList.toggle('is-lit', ctx.light);
    root.innerHTML = `
      ${DEFS}
      <div class="hw-sky"></div>
      <div class="hw-sky hw-sky-lit"></div>
      <div class="hw-stars">${stars(80)}</div>
      <button class="hw-moon" type="button" aria-label="Lua (solta um raio)"></button>
      <div class="hw-cloud c1"></div>
      <div class="hw-cloud c2"></div>
      <svg class="hw-bolt" viewBox="0 0 60 300" aria-hidden="true"><path d="M34 0L18 110h16L8 200h14L0 300l44-130H28l22-80H34z"/></svg>
      ${HILLS}
      ${HOUSE}
      <div class="hw-fog f1"></div>
      <div class="hw-yard"></div>
      <div class="hw-fog f2"></div>
      <svg class="hw-grass" viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true"><path d="${grassPath()}"/></svg>
      <div class="hw-dark"></div>
      <button class="hw-pumpkin" type="button" aria-label="Abóbora">${PUMPKIN}</button>
      <div class="hw-branch">
        ${BRANCH}
        <button class="hw-lantern" type="button" aria-label="Lampião (acende a luz)">${LANTERN}</button>
        <button class="hw-spider" type="button" aria-label="Aranha">${SPIDER}</button>
      </div>
      <div class="hw-bats"></div>
      <div class="hw-follower" aria-hidden="true"><svg viewBox="0 0 100 100">${MONSTERS.fantasma}</svg></div>
      <div class="hw-flash"></div>`;
    stage.append(root);

    const $ = (sel) => root.querySelector(sel);
    const yard = $('.hw-yard');
    const pumpkin = $('.hw-pumpkin');
    const spider = $('.hw-spider');
    const follower = $('.hw-follower');

    // ----- túmulos e personagens -----

    const anonymous = !ctx.people.length;
    const people = anonymous ? Array.from({ length: 3 }, (_, i) => ({ name: '', color: '#ff8a00', seed: `anon${i}` })) : ctx.people;

    const graves = people.map((p) => {
      const h = hash(p.seed ?? p.name.toLowerCase());
      const kind = KINDS[h % KINDS.length];
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'hw-grave';
      el.style.setProperty('--team', p.color);
      el.style.setProperty('--tilt', `${((h >>> 4) % 9) - 4}deg`);
      el.setAttribute('aria-label', p.name ? `Túmulo (quem sai é ${p.name})` : 'Túmulo');
      el.innerHTML = `
        <span class="hw-pit"><span class="hw-monster"><svg viewBox="0 0 100 100">${MONSTERS[kind]}</svg></span></span>
        <span class="hw-stone">
          <svg viewBox="0 0 100 120" preserveAspectRatio="none"><path d="${STONES[(h >>> 8) % STONES.length]}"/></svg>
          <span class="hw-rip">R.I.P</span>
        </span>
        <span class="hw-bubble"></span>`;
      yard.append(el);
      return { el, kind, name: p.name, h, monster: el.querySelector('.hw-monster'), bubble: el.querySelector('.hw-bubble'), state: 'down', timer: 0 };
    });

    function setGraveState(g, state, ms) {
      clearTimeout(g.timer);
      timers.delete(g.timer);
      g.state = state;
      g.el.classList.toggle('is-peek', state === 'peek');
      g.el.classList.toggle('is-up', state === 'up');
      if (ms) g.timer = later(() => setGraveState(g, 'down'), ms);
    }

    function rise(g, { sound = true, ms = 4500, short = false } = {}) {
      const lines = LINES[g.kind];
      if (!g.name) g.bubble.textContent = 'Buuu!';
      else if (short) g.bubble.textContent = g.name; // todos de uma vez: só o nome, para os balões não se atropelarem
      else g.bubble.textContent = lines[Math.floor(Math.random() * lines.length)].replace('{n}', g.name);
      setGraveState(g, 'up', ms);
      if (sound) sfx(MONSTER_SFX[g.kind]);
    }

    for (const g of graves) {
      g.el.addEventListener('click', () => (g.state === 'up' ? setGraveState(g, 'down') : rise(g)));
    }

    // Distribui os túmulos em fileiras entre a abóbora e a borda direita.
    function layout() {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const x0 = Math.min(pumpkin.getBoundingClientRect().right + 4, W * 0.3);
      const x1 = W - 8;
      const n = graves.length;
      const rows = n <= 5 ? 1 : n <= 12 ? 2 : 3;
      const perRow = Math.ceil(n / rows);
      const w = clamp(((x1 - x0) / perRow) * 0.8, 46, Math.min(132, H * 0.17));
      graves.forEach((g, i) => {
        const row = Math.floor(i / perRow); // 0 = frente
        const slot = (x1 - x0) / perRow;
        const k = i - row * perRow;
        const jitter = (((g.h >>> 12) % 100) / 100 - 0.5) * slot * 0.14;
        const size = w * (1 - row * 0.16);
        // Fileiras ímpares ficam nos vãos da fileira da frente (e na ponta).
        const x = x0 + jitter + (row % 2 ? slot * ((k + 1) % perRow) : slot * (k + 0.5));
        g.el.style.width = `${size}px`;
        g.el.style.left = `${clamp(x, x0 + size / 2, x1 - size / 2) - size / 2}px`;
        g.el.style.bottom = `${H * 0.035 + row * w * 0.62}px`;
        g.el.style.zIndex = String(10 - row);
        g.el.style.setProperty('--w', `${size}px`);
        g.el.classList.toggle('is-back', row > 0);
      });
    }
    layout();

    // De vez em quando alguém espia do túmulo.
    const peekLoop = setInterval(() => {
      if (reducedMotion || document.hidden) return;
      const down = graves.filter((g) => g.state === 'down');
      if (!down.length) return;
      setGraveState(down[Math.floor(Math.random() * down.length)], 'peek', 1800);
    }, 2600);

    // ----- luz, janelas, lampião, aranha, abóbora, lua -----

    function setLight(on) {
      root.classList.toggle('is-lit', on);
    }

    $('.hw-lantern').addEventListener('click', () => {
      sfx(SFX.click);
      ctx.setLight(!root.classList.contains('is-lit'));
    });

    root.querySelectorAll('.win').forEach((win) => {
      win.addEventListener('click', () => {
        sfx(SFX.click);
        const on = !win.classList.contains('on');
        win.classList.toggle('on', on);
        if (on && Math.random() < 0.45) {
          win.classList.add('boo');
          later(() => win.classList.remove('boo'), 1600);
        }
      });
    });

    spider.addEventListener('click', () => {
      if (spider.classList.contains('zip')) return;
      sfx(SFX.zip);
      spider.classList.add('zip');
      later(() => spider.classList.remove('zip'), 2600);
    });
    // Desce do galho ao abrir.
    requestAnimationFrame(() => requestAnimationFrame(() => spider.classList.add('is-down')));

    pumpkin.addEventListener('click', () => {
      sfx(SFX.laugh);
      pumpkin.classList.remove('laugh');
      void pumpkin.offsetWidth;
      pumpkin.classList.add('laugh');
    });

    const flash = $('.hw-flash');
    const bolt = $('.hw-bolt');
    function lightning(vol = 0.5) {
      bolt.style.left = `${rand(10, 85)}%`;
      root.classList.remove('is-flashing');
      void flash.offsetWidth;
      root.classList.add('is-flashing');
      later(() => root.classList.remove('is-flashing'), 800);
      sfx(() => SFX.thunder(vol));
    }
    $('.hw-moon').addEventListener('click', () => lightning());

    function scheduleStorm() {
      later(() => {
        if (!document.hidden) lightning(0.25);
        scheduleStorm();
      }, rand(35000, 70000));
    }
    if (!reducedMotion) scheduleStorm();

    // ----- morcegos -----

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;
    const bats = Array.from({ length: W() < 600 ? 5 : 9 }, () => {
      const el = document.createElement('div');
      el.className = 'hw-bat';
      el.innerHTML = BAT;
      const size = rand(30, 62);
      el.style.width = `${size}px`;
      el.style.setProperty('--flap', `${rand(0.16, 0.28).toFixed(2)}s`);
      $('.hw-bats').append(el);
      const dir = Math.random() < 0.5 ? -1 : 1;
      const bat = {
        el,
        size,
        x: rand(0, W()),
        y: rand(H() * 0.08, H() * 0.45),
        dir,
        speed: rand(0.6, 1.6),
        vx: dir,
        kx: 0,
        ky: 0,
        t: rand(0, 100),
        freq: rand(0.02, 0.05),
        amp: rand(0.4, 1.2),
        squeaked: 0,
      };
      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const away = Math.sign(bat.x - e.clientX) || 1;
        bat.kx = away * 14;
        bat.ky = -7;
        sfx(SFX.squeak);
      });
      return bat;
    });

    function moveBats(dt, now) {
      const recent = now - pointer.at < 1500;
      for (const b of bats) {
        b.t += dt;
        b.vx += (b.dir * b.speed - b.vx) * 0.02 * dt;
        const dx = b.x - pointer.x;
        const dy = b.y - pointer.y;
        const d = Math.hypot(dx, dy) || 1;
        if (recent && d < 130) {
          b.kx += (dx / d) * 0.9 * dt;
          b.ky += (dy / d) * 0.9 * dt;
          if (now - b.squeaked > 1800) {
            b.squeaked = now;
            sfx(SFX.squeak);
          }
        }
        b.kx *= 0.95 ** dt;
        b.ky *= 0.95 ** dt;
        b.x += (b.vx + b.kx) * dt;
        b.y += (Math.sin(b.t * b.freq) * b.amp + b.ky) * dt;
        if (b.y < H() * 0.04) b.ky += 0.4 * dt;
        if (b.y > H() * 0.55) b.ky -= 0.4 * dt;
        if (b.x > W() + 80) b.x = -80;
        if (b.x < -80) b.x = W() + 80;
        b.el.style.transform = `translate3d(${b.x - b.size / 2}px, ${b.y - b.size / 4}px, 0)`;
      }
    }

    // ----- quadro a quadro: morcegos, fantasminha e olhos seguindo -----

    const ghost = { x: pointer.x, y: pointer.y };
    const pumpkinFace = pumpkin.querySelector('.pupils');

    function look(el, target, reach) {
      const r = el.getBoundingClientRect();
      const ex = clamp((pointer.x - (r.left + r.width / 2)) / 220, -1, 1);
      const ey = clamp((pointer.y - (r.top + r.height / 2)) / 220, -1, 1);
      target.style.transform = `translate(${(ex * reach).toFixed(2)}px, ${(ey * reach * 0.8).toFixed(2)}px)`;
    }

    let raf = 0;
    let last = performance.now();
    function frame(now) {
      const dt = Math.min(3, (now - last) / 16.67);
      last = now;
      if (!reducedMotion) moveBats(dt, now);

      const awake = now - pointer.at < 3500;
      ghost.x += (pointer.x + 26 - ghost.x) * 0.04 * dt;
      ghost.y += (pointer.y + 26 - ghost.y) * 0.04 * dt;
      follower.style.transform = `translate3d(${ghost.x}px, ${ghost.y}px, 0)`;
      follower.classList.toggle('is-on', awake && pointer.at > 0);

      for (const g of graves) {
        if (g.state !== 'down') look(g.monster, g.monster.querySelector('.pupils'), 3);
      }
      look(pumpkin, pumpkinFace, 5);
      raf = requestAnimationFrame(frame);
    }
    if (!reducedMotion) {
      raf = requestAnimationFrame(frame);
    } else {
      bats.forEach((b) => (b.el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0)`));
    }

    return {
      setLight,
      layout,
      callAll() {
        graves.forEach((g, i) => later(() => rise(g, { sound: i === 0, ms: 6000, short: true }), i * 140));
      },
      destroy() {
        cancelAnimationFrame(raf);
        clearInterval(peekLoop);
        timers.forEach(clearTimeout);
        root.remove();
      },
    };
  },
};
