// Balões da rodada de treino (modo um aparelho). Chaves vêm de tipKey (ui.js).
export const TIPS = {
  pass: [
    { sel: '.handoff .who-title', text: 'Passe o aparelho para esta pessoa. <b>Só ela</b> olha a tela!' },
    { sel: '[data-act="show"]', text: 'Ela toca aqui para ver a carta: a palavra secreta ou "IMPOSTOR".' },
  ],
  card: [
    { sel: '.secret-card', text: 'Memorize e não deixe ninguém ver. O impostor só sabe a <b>categoria</b>.' },
    { sel: '[data-act="hide"]', text: 'Esconda e passe o aparelho para a próxima pessoa.' },
  ],
  discuss: [
    { sel: '.handoff .who-title', text: 'Esta pessoa começa. Na ordem, cada um diz <b>uma palavra</b> ligada à secreta, sem entregar demais!' },
    { sel: '.clock', text: 'Toque no relógio para cronometrar a conversa.' },
    { sel: '[data-act="toVote"]', text: 'Quando acabar a conversa, vão para a votação.' },
  ],
  vote: [{ sel: '.vote-grid', text: 'Todos apontam em quem desconfiam. Contem os votos e toquem no <b>mais votado</b>.' }],
  result: [{ sel: '[data-act="nextRound"]', text: 'Pegaram o impostor? Cada um dos outros ganha +1. Ele escapou? Ganha +2.' }],
};
