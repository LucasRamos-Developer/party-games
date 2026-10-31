// Balões da rodada de treino, por fase.
export const TIPS = {
  ready: [
    { sel: '.handoff .who-title', text: 'Esta pessoa pega o tablet e vai <b>explicar</b> as palavras para a própria equipe.' },
    { sel: '#hud-teams', text: 'Aqui fica o placar. A equipe em destaque é a da vez.' },
    { sel: '.clock', text: 'Quando estiver pronto, <b>toque no relógio</b> para começar. Tocar de novo pausa.' },
  ],
  playing: [
    { sel: '#card', text: 'Esta é a palavra. Explique <b>sem dizer</b> ela nem as palavras em vermelho. Nada de gestos!' },
    { sel: '[data-mark="hit"]', text: 'A equipe acertou? Toque em <b>Acertou</b> (+1) e já vem a próxima palavra.' },
    { sel: '[data-mark="skip"]', text: 'Muito difícil? <b>Pular</b> troca a palavra.' },
    { sel: '[data-mark="taboo"]', text: 'Os <b>adversários</b> fiscalizam: se ouvirem uma palavra proibida, tocam aqui (−1).' },
    { sel: '.clock', text: 'Quando o tempo acaba, a bomba explode e o turno termina.' },
  ],
  review: [
    { sel: '.review-list', text: 'Confiram o turno. Marcou errado? <b>Toque na palavra</b> para trocar o resultado.' },
    { sel: '[data-act="confirm"]', text: 'Tudo certo? Confirme para somar os pontos e passar a vez.' },
  ],
};
