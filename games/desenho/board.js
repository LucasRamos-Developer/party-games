// Tabuleiro em SVG: caminho em serpentina de hexágonos (pontas para cima).
// Linhas pares são trechos retos; linhas ímpares têm uma casa de ligação na
// ponta, alternando direita/esquerda.

const NS = 'http://www.w3.org/2000/svg';
const SQ3 = Math.sqrt(3);
const S = 10; // raio do hexágono, em unidades do viewBox
const W = SQ3 * S;
const COLS = 8;
const MIN_COLS = 4;
const MAX_COLS = 16;
const STEP_MS = 230;
const PAWN_SLOTS = [
  [-0.34, -0.32],
  [0.34, -0.32],
  [-0.34, 0.34],
  [0.34, 0.34],
];

function el(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

const center = (row, col) => ({ x: W * (col + (row % 2 ? 0.5 : 0)), y: 1.5 * S * row });

export function pathLayout(n, cols = COLS) {
  const pts = [];
  for (let row = 0; pts.length < n; row++) {
    const ltr = Math.floor(row / 2) % 2 === 0;
    if (row % 2 === 0) {
      for (let k = 0; k < cols && pts.length < n; k++) pts.push(center(row, ltr ? k : cols - 1 - k));
    } else {
      pts.push(center(row, ltr ? cols - 1 : -1));
    }
  }
  return pts;
}

function bounds(pts) {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs) - W / 2 - 1;
  const minY = Math.min(...ys) - S - 1;
  return { minX, minY, width: Math.max(...xs) + W / 2 + 1 - minX, height: Math.max(...ys) + S + 1 - minY };
}

// Escolhe o número de colunas que deixa as casas maiores no espaço disponível.
function bestCols(n, boxW, boxH) {
  if (!boxW || !boxH) return COLS;
  let best = COLS;
  let bestScale = 0;
  for (let c = MIN_COLS; c <= MAX_COLS; c++) {
    const { width, height } = bounds(pathLayout(n, c));
    const scale = Math.min(boxW / width, boxH / height);
    if (scale > bestScale) {
      bestScale = scale;
      best = c;
    }
  }
  return best;
}

function hexPoints(r) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

function peopleIcon(dy = 0) {
  const g = el('g', { class: 'icon', transform: `translate(0 ${dy})` });
  for (const dx of [-0.32, 0.32, 0]) {
    const big = dx === 0 ? 1.15 : 1;
    const x = dx * S;
    const headR = 0.11 * S * big;
    const bodyR = 0.17 * S * big;
    g.append(el('circle', { cx: x, cy: -0.14 * S, r: headR }));
    g.append(el('path', { d: `M ${x - bodyR} ${0.3 * S} a ${bodyR} ${bodyR} 0 0 1 ${2 * bodyR} 0 Z` }));
  }
  return g;
}

export function createBoardView(container) {
  let board = [];
  let cols = 0;
  let pts = [];
  let pawnLayer = null;
  let pawnEls = [];
  let teams = [];
  let activeId = null;

  function slotOffset(team) {
    const sharing = teams.filter((t) => t.pos === team.pos).length;
    if (sharing < 2) return [0, 0];
    const [dx, dy] = PAWN_SLOTS[team.id % PAWN_SLOTS.length];
    return [dx * S, dy * S];
  }

  function place(g, pos, [dx, dy] = [0, 0]) {
    const p = pts[pos];
    g.style.transform = `translate(${p.x + dx}px, ${p.y + dy}px)`;
  }

  function draw() {
    pts = pathLayout(board.length, cols);
    const last = board.length - 1;
    const { minX, minY, width, height } = bounds(pts);

    const svg = el('svg', {
      viewBox: `${minX.toFixed(2)} ${minY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`,
      class: 'board-svg',
      role: 'img',
      'aria-label': `Tabuleiro com ${board.length} casas`,
    });
    svg.append(el('polyline', { class: 'track', points: pts.map((p) => `${p.x},${p.y}`).join(' ') }));

    board.forEach((type, i) => {
      const edge = i === 0 ? 'cell-start' : i === last ? 'cell-end' : '';
      const g = el('g', { class: `cell cell-${type} ${edge}`, transform: `translate(${pts[i].x} ${pts[i].y})` });
      const title = el('title');
      title.textContent = `${i === 0 ? 'Início' : i === last ? 'Fim' : `Casa ${i}`}: ${
        type === 'todos' ? 'todos jogam' : type === 'escolha' ? 'escolha a categoria e todos jogam' : 'casa comum'
      }`;
      g.append(title, el('polygon', { points: hexPoints(S * 0.93) }));
      if (edge) {
        g.append(peopleIcon(-0.18 * S));
        const label = el('text', { class: 'cell-label', y: 0.58 * S, 'text-anchor': 'middle', 'dominant-baseline': 'central' });
        label.textContent = i === 0 ? 'INÍCIO' : 'FIM';
        g.append(label);
      } else if (type === 'todos') {
        g.append(peopleIcon());
      } else if (type === 'escolha') {
        const q = el('text', { class: 'icon-q', 'text-anchor': 'middle', 'dominant-baseline': 'central', y: 0.5 });
        q.textContent = '?';
        g.append(el('rect', { class: 'icon-card', x: -0.3 * S, y: -0.4 * S, width: 0.6 * S, height: 0.8 * S, rx: 1.2 }), q);
      }
      svg.append(g);
    });

    pawnLayer = el('g', { class: 'pawns' });
    svg.append(pawnLayer);
    pawnEls = [];
    container.replaceChildren(svg);
  }

  // Redesenha só quando o melhor número de colunas muda.
  function fit() {
    if (!board.length) return false;
    const next = bestCols(board.length, container.clientWidth, container.clientHeight);
    if (next === cols) return false;
    cols = next;
    draw();
    return true;
  }

  const api = {
    build(nextBoard) {
      board = nextBoard;
      cols = 0;
      teams = [];
      fit();
    },

    renderPawns(nextTeams, nextActiveId) {
      teams = nextTeams;
      activeId = nextActiveId;
      while (pawnEls.length < teams.length) {
        const g = el('g', { class: 'pawn' });
        const label = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' });
        g.append(el('circle', { class: 'ring', r: 0.5 * S }), el('circle', { class: 'body', r: 0.33 * S }), label);
        pawnLayer.append(g);
        pawnEls.push(g);
      }
      teams.forEach((t, i) => {
        const g = pawnEls[i];
        g.style.setProperty('--team', t.color);
        g.lastChild.textContent = String(t.id + 1);
        g.classList.toggle('active', t.id === activeId);
        place(g, t.pos, slotOffset(t));
      });
    },

    // Anda casa a casa com o peão da equipe, antes do render final.
    async animateMove(teamId, from, to) {
      const g = pawnEls[teamId];
      if (!g) return;
      pawnLayer.append(g); // traz o peão para frente
      for (let p = from + 1; p <= to; p++) {
        place(g, p);
        await new Promise((r) => setTimeout(r, STEP_MS));
      }
    },
  };

  new ResizeObserver(() => {
    if (fit() && teams.length) api.renderPawns(teams, activeId);
  }).observe(container);

  return api;
}
