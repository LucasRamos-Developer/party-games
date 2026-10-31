// Dado genérico com animação de rolagem. As faces podem ser números, letras
// ou qualquer valor; `render` decide como cada face aparece.

export function randomInt(n) {
  if (globalThis.crypto?.getRandomValues) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  }
  return Math.floor(Math.random() * n);
}

const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

// Renderiza um dado numérico com bolinhas (grade 3x3).
export function renderPips(node, value) {
  node.classList.add('die-pips');
  node.replaceChildren(
    ...Array.from({ length: 9 }, (_, i) => {
      const pip = document.createElement('span');
      pip.className = PIPS[value]?.includes(i) ? 'pip on' : 'pip';
      return pip;
    }),
  );
  node.setAttribute('aria-label', value ? `Dado: ${value}` : 'Dado ainda não rolado');
}

function renderText(node, value) {
  node.textContent = value ?? '?';
  node.setAttribute('aria-label', value ? `Dado: ${value}` : 'Dado ainda não rolado');
}

export function createDie(el, faces, { render = renderText, duration = 650 } = {}) {
  let value = null;
  const show = (v) => {
    render(el, v);
    el.dataset.value = v ?? '';
  };
  show(null);

  return {
    get value() {
      return value;
    },
    set(v) {
      value = v;
      show(v);
    },
    roll() {
      return new Promise((resolve) => {
        el.classList.add('rolling');
        const end = performance.now() + duration;
        const iv = setInterval(() => {
          const v = faces[randomInt(faces.length)];
          show(v);
          if (performance.now() >= end) {
            clearInterval(iv);
            value = v;
            el.classList.remove('rolling');
            resolve(v);
          }
        }, 75);
      });
    },
  };
}
