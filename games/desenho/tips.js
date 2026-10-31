// Balões da rodada de treino. Chaves vêm de tipKey (ui.js).
export const TIPS = {
  ready: [
    { sel: '#who', text: 'Aqui aparece de quem é a vez. Na <b>cor de uma equipe</b>, só ela joga; em <b>laranja</b>, todos jogam.' },
    { sel: '#cats', text: 'Toque na letra que saiu no dado de categoria (ou <b>Sortear</b>). É opcional.' },
    { sel: '.clock', text: 'Pegue a carta e <b>toque no relógio</b>: a rodada começa e o tempo corre. Tocar de novo pausa.' },
    { sel: '#sidebar', text: 'Na lateral ficam as equipes, o botão Todos jogam, o mini tabuleiro e os ajustes.' },
  ],
  drawing: [
    { sel: '[data-act="hit"]', text: 'A equipe acertou o desenho? Toque em <b>Acertou</b>.' },
    { sel: '[data-act="miss"]', text: 'Não acertou ou o tempo acabou? Toque em <b>Errou</b> e a vez passa.' },
    { sel: '#btn-restart', text: 'Se reiniciar no meio da rodada, o app pergunta antes quem acertou.' },
  ],
  drawingAll: [
    { sel: '#who-chips', text: '<b>Todos jogam</b>: cada equipe desenha ao mesmo tempo, com o seu desenhista.' },
    { sel: '.clock', text: 'Toque no relógio para pausar, se precisar. No fim do tempo a bomba explode!' },
    { sel: '.picks', text: 'Toque em quem acertou primeiro (marque mais de uma se empatarem) e confirme embaixo.' },
  ],
  move: (s) =>
    s.settings.virtualDice ? [] : [{ sel: '.nums', text: 'Toque no número que saiu no dado físico: o peão anda essas casas.' }],
};
