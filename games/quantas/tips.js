// Balões da rodada de treino, por fase.
export const TIPS = {
  draw: (s) => [
    s.settings.draw === 'random'
      ? { sel: '.confront', text: 'Este é o confronto: um jogador de cada equipe. Não gostou? Dá para sortear outro.' }
      : { sel: '.pick-teams', text: 'Toque em um jogador de cada uma de <b>duas</b> equipes. Quem já jogou não aparece.' },
    {
      sel: '[data-act="go"]',
      text:
        s.settings.mode === 'team'
          ? 'Os dois sorteados <b>saem de perto</b> (não podem ver a pergunta). Depois toque aqui.'
          : 'Os dois sorteados vêm para o tablet. Toque aqui para ver a pergunta.',
    },
  ],
  auction: (s) => [
    { sel: '.q-card', text: 'A pergunta: quantos itens dela vocês conseguem falar no tempo?' },
    { sel: '.bid-side.is-active .bid-clock', text: `Cada equipe tem o seu relógio: <b>${s.settings.bidTime} segundos</b> no total, que só correm na sua vez. Zerou, essa equipe tem que responder!` },
    { sel: '.bid-side.is-active .quick-bids', text: 'Toque num número para dar o lance. A vez passa para o lado da outra equipe, já com os próximos números.' },
    { sel: '.bid-side.is-active .bid-stepper', text: 'Quer mais alto? Ajuste no <b>− / +</b> e toque no número.' },
    { sel: '.bid-side.is-active .doubt-btn', text: 'Achou demais? Diga <b>Duvido!</b>: a outra equipe é obrigada a cumprir o lance dela.' },
  ],
  answer: [
    { sel: '.answer-clock', text: 'Quando quem responde estiver pronto, <b>toque no relógio</b>.' },
    { sel: '.plus-btn', text: 'A cada resposta certa, toque em <b>+1</b>. A equipe adversária confere.' },
    { sel: '.count-big', text: 'Chegou na meta antes do tempo acabar? Ponto na hora!' },
  ],
  result: [{ sel: '[data-act="next"]', text: 'Ponto marcado! Agora vem o próximo confronto.' }],
};
