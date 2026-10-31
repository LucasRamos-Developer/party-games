# Party Games

Central de jogos de festa que roda no navegador, publicada no GitHub Pages.
Os jogos substituem as peças físicas (tabuleiro, dados, ampulheta), e o resto
continua na mesa (cartas, papel e caneta).

## Jogos

| Jogo | Pasta | Como se joga |
|---|---|---|
| **Rabisco & Adivinha** | `games/desenho/` | Desenho ou mímica em equipes. O timer é a tela principal; marca categoria, quem acertou e casas; dados virtuais e tabuleiro opcionais. |
| **Fala Sem Falar** | `games/fala-sem-falar/` | Explicar a palavra sem dizer as 4 proibidas. Um tablet, timer com bomba, revisão do turno e meta de pontos. |
| **Na Testa** | `games/na-testa/` | Celular na testa: inclinar para baixo = acertou, para cima = passa (ou tocar na tela). 8 categorias. |
| **Impostor** | `games/impostor/` | Todos têm a mesma palavra, menos o impostor. Um aparelho passando de mão em mão, ou **cada um no seu celular** com código de sala (sorteio com semente, sem servidor). |
| **Qual é a Nota?** | `games/nota/` | Quem segura o tablet sabe uma nota de 0 a 10; 2 perguntas sorteadas + 2 livres. Acertar em cheio vale 10; cada pergunta extra desconta (−1 sorteada, −2 livre, mínimo 2). |
| **Que Filme É Esse?** | `games/filme/` | 5 pistas do mais difícil ao mais fácil (10, 8, 6, 4, 2 pontos). Aceita imagens próprias em `games/filme/frames/`. |
| **Quantas Palavras?** | `games/quantas/` | Leilão de respostas: um jogador de cada equipe; lances alternados com tempo por vez (se acabar, quem estava decidindo responde); quem ganha tem 1min30 para falar a quantidade prometida. Modo invertido, sorteio aleatório ou escolhido, nível Fácil/Misto/Desafio. |

Todos os jogos têm **Como jogar** (no setup e no menu) e uma **rodada de treino**: uma rodada que não vale ponto, com balões explicando cada botão na hora (`assets/js/core/coach.js` e `practice.js`).

## Rodar localmente

Os scripts usam ES modules, que não funcionam abrindo o arquivo direto
(`file://`). Suba um servidor estático na raiz:

```bash
python3 -m http.server 8000
```

Depois abra http://localhost:8000/.

## Publicar no GitHub Pages

1. Faça push para o GitHub.
2. Em **Settings → Pages**, escolha **Deploy from a branch**, branch `main`,
   pasta `/ (root)`.
3. O site fica em `https://<usuario>.github.io/<repositorio>/`.

Não há build: todos os caminhos são relativos e o `.nojekyll` desliga o
processamento do Jekyll.

## Estrutura

```
index.html                  central com a lista de jogos
assets/css/base.css         tema escuro neon e componentes comuns
assets/css/game.css         kit dos jogos: vidro, relógio, botões, placar, explosão
assets/js/core/
  storage.js                persistência (localStorage hoje)
  store.js                  estado da partida com desfazer e salvamento
  shell.js                  setup/retomada/menu/placar dos jogos em equipe
  teams-setup.js            cadastro de jogadores e divisão em equipes
  timer.js, clock.js        timer com alerta de bomba e relógio em anel
  sound.js                  sons sintetizados (WebAudio)
  random.js, deck.js        sorteio com semente e baralho sem repetição
  turns.js                  fila de vezes e desempate
  coach.js, practice.js     balões guiados e rodada de treino
  dice.js, dom.js           dado animado e helpers de DOM
games/<jogo>/
  state.js                  regras (funções puras)
  ui.js                     liga estado, tela e eventos
  words.js / filmes.js      conteúdo (palavras, perguntas, filmes)
```

## Trocar o localStorage por um servidor

Os jogos só usam o objeto `storage` de `assets/js/core/storage.js`, que tem a
interface assíncrona `load(key)`, `save(key, value)`, `remove(key)` e
`list(prefix)`. Para usar um backend, crie um `ApiAdapter` com esses mesmos
métodos (por exemplo, fazendo `fetch` para a sua API) e troque o `export const
storage`. O estado da partida já é um objeto JSON serializável.

## Adicionar um jogo novo

1. Copie a estrutura de um jogo em equipes (ex.: `games/filme/`): `index.html` com `base.css` + `game.css`, `state.js` com `reduce(state, action)` puro e `ui.js` usando `createStore` + `createShell`.
2. Reaproveite os módulos de `assets/js/core/`.
3. Adicione um card em `index.html`.
