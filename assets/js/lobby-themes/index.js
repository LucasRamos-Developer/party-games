// Temas da tela de espera (games/espera/). Tema novo: crie `<id>.js` (+ css)
// nesta pasta seguindo o contrato de halloween.js e acrescente uma linha aqui.

export const THEMES = [
  { id: 'halloween', label: 'Halloween', load: () => import('./halloween.js') },
];

export const themeById = (id) => THEMES.find((t) => t.id === id) ?? THEMES[0];
