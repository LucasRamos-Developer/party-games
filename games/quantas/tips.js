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
    { sel: '.bid-clock', text: `Cada vez tem <b>${s.settings.bidTime} segundos</b> para decidir. Se acabar, quem estava decidindo tem que responder!` },
    { sel: '.bid-row', text: 'Escolha o número e dê um lance <b>maior</b> que o atual. A vez passa para o outro lado.' },
    { sel: '[data-act="pass"]', text: 'Achou demais? <b>Passe</b>: quem deu o último lance tem que cumprir.' },
  ],
  answer: [
    { sel: '.answer-clock', text: 'Quando quem responde estiver pronto, <b>toque no relógio</b>.' },
    { sel: '.plus-btn', text: 'A cada resposta certa, toque em <b>+1</b>. A equipe adversária confere.' },
    { sel: '.count-big', text: 'Chegou na meta antes do tempo acabar? Ponto na hora!' },
  ],
  result: [{ sel: '[data-act="next"]', text: 'Ponto marcado! Agora vem o próximo confronto.' }],
};
