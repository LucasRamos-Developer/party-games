// Balões da rodada de treino, por fase.
export const TIPS = {
  ready: [
    { sel: '.handoff .who-title', text: 'Esta pessoa segura o aparelho na <b>testa</b>, com a tela virada para a equipe, sem olhar.' },
    { sel: '[data-act="ready"]', text: 'Toque em <b>Pronto</b>: vem uma contagem 3-2-1 para colocar o aparelho na testa.' },
  ],
  playing: (s) => [
    { sel: '#word', text: 'A equipe vê esta palavra e dá dicas (ou faz mímica) para quem está com o aparelho.' },
    {
      sel: '[data-zone="hit"]',
      text: `Acertou? Toque em <b>✓ Acertou</b>${s.settings.control === 'tilt' ? ' ou incline a tela para baixo' : ''}.`,
    },
    {
      sel: '[data-zone="pass"]',
      text: `Não sabe? Toque em <b>✗ Passou</b>${s.settings.control === 'tilt' ? ' ou incline a tela para cima' : ''}.`,
    },
  ],
  review: [
    { sel: '.review-list', text: 'Confiram as palavras. Marcou errado? <b>Toque na palavra</b> para trocar.' },
    { sel: '[data-act="confirm"]', text: 'Confirme para somar os acertos e passar o aparelho para a próxima equipe.' },
  ],
};
