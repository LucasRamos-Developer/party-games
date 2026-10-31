// Balões da rodada de treino. As chaves vêm de tipKey (ui.js).
export const TIPS = {
  secret: [
    { sel: '.handoff .who-title', text: 'Só esta pessoa pode ver a nota. A equipe <b>não olha</b>!' },
    { sel: '[data-act="peek"]', text: 'Toque para ver a nota secreta, de 0 a 10.' },
  ],
  peek: [
    { sel: '.nota-big', text: 'Esta é a nota: <b>0 é o pior</b> e <b>10 é o melhor</b>. Guarde de cabeça!' },
    { sel: '[data-act="hide"]', text: 'Guardou de cabeça? Toque aqui para <b>esconder a nota</b>.' },
  ],
  hidden: [
    { sel: '[data-act="known"]', text: 'Agora vire o tablet para a equipe e toque para ver a primeira pergunta.' },
  ],
  questions: [
    { sel: '.question-card', text: 'A pergunta aparece aqui. Quem sabe a nota responde com algo que combine com ela. Ex.: comida nota 2 = jiló!' },
    { sel: '.prize', text: 'Acertar a nota exata vale estes pontos.' },
    { sel: '[data-act="next-card"]', text: 'São 4 perguntas, intercaladas: 2 sorteadas e 2 que a <b>equipe inventa</b>.' },
  ],
  extra: [
    { sel: '.extra', text: 'Ainda em dúvida? Peçam mais perguntas, mas cada uma desconta: sorteada −1, livre −2 (mínimo 2).' },
    { sel: '[data-act="toGuess"]', text: 'Quando souberem, toquem em <b>Chutar a nota</b>.' },
  ],
  guess: [{ sel: '.nota-pad', text: 'A equipe chuta a nota. Só vale ponto se acertar <b>exatamente</b>.' }],
  result: [{ sel: '[data-act="next"]', text: 'Agora é a vez da próxima equipe.' }],
};
