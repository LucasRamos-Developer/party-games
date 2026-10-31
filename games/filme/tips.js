// Balões da rodada de treino, por fase.
export const TIPS = {
  play: [
    { sel: '.who-kicker', text: 'A dica geral ajuda a equipe a começar.' },
    { sel: '.stages', text: 'Cada pista nova vale menos: <b>10, 8, 6, 4 e 2</b> pontos.' },
    { sel: '.stage-stack .word-card', text: 'A equipe da vez tenta adivinhar o filme por esta pista.' },
    { sel: '[data-act="hit"]', text: 'Acertaram? Toque aqui e ganham os pontos da pista atual.' },
    { sel: '[data-act="miss"]', text: 'Erraram o chute? Abre a próxima pista, mais fácil.' },
  ],
  reveal: [
    { sel: '.title-reveal', text: 'Aqui aparece o filme certo.' },
    { sel: '[data-act="next"]', text: 'Toque para passar a vez para a próxima equipe.' },
  ],
};
