// Balões da rodada de treino, por fase.
export const TIPS = {
  play: [
    { sel: '.who-kicker', text: 'A dica geral ajuda a equipe a começar.' },
    { sel: '.stages', text: 'Cada pista nova vale menos: <b>10, 8, 6, 4 e 2</b> pontos.' },
    { sel: '.stage-stack .word-card', text: 'A equipe da vez tenta adivinhar o filme por esta pista.' },
    { sel: '.guesses', text: 'Achou? Toque no filme da lista. Acertou, ganha os pontos; <b>errou, zera</b>!' },
    { sel: '[data-act="clue"]', text: 'Na dúvida, abra a próxima pista: vale menos, mas a lista diminui.' },
  ],
  reveal: [
    { sel: '.title-reveal', text: 'Aqui aparece o filme certo.' },
    { sel: '[data-act="next"]', text: 'Toque para passar a vez para a próxima equipe.' },
  ],
};
