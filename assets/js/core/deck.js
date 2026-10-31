// Baralho serializável: guarda só a ordem e a posição, para caber no estado
// salvo da partida. Quando acaba, embaralha de novo (sem repetir em seguida).

import { shuffle } from './random.js';

export function createDeck(count, rng) {
  return { order: shuffle([...Array(count).keys()], rng), index: 0 };
}

// Devolve [índice da carta, novo baralho]; não altera o baralho recebido.
export function draw(deck, rng) {
  if (deck.index < deck.order.length) {
    return [deck.order[deck.index], { ...deck, index: deck.index + 1 }];
  }
  const last = deck.order.at(-1);
  let order = shuffle(deck.order, rng);
  if (order.length > 1 && order[0] === last) order = [...order.slice(1), order[0]];
  return [order[0], { order, index: 1 }];
}
