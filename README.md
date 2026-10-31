# Party Games

Central de jogos de festa que roda no navegador, publicada no GitHub Pages.
Os jogos substituem as peças físicas (tabuleiro, dados, ampulheta), e o resto
continua na mesa (cartas, papel e caneta).

## Jogos

- **Rabisco & Adivinha** (`games/desenho/`): apoio para jogo de desenho ou
  mímica em equipes, pensado para tablet. Antes, cadastram-se os times; depois
  a tela principal é o **timer** (toque inicia/pausa, alerta de bomba no fim,
  cor da equipe da vez ou laranja em "todos jogam"). Na mesma tela se marca a
  categoria, quem acertou e quantas casas andar. Nos ajustes: tempo, dados
  virtuais (sorteia categoria e casas sozinho), tabuleiro oculto/pequeno/grande,
  som e desenho/mímica.

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
assets/css/base.css         tokens de cor (claro/escuro) e componentes comuns
assets/js/core/
  storage.js                persistência (localStorage hoje)
  dice.js                   dado genérico com animação
  timer.js                  timer com som e wake lock
  teams-setup.js            cadastro de jogadores e divisão em equipes
  dom.js                    helpers de DOM
games/desenho/
  state.js                  estado da partida e regras (funções puras)
  board.js                  tabuleiro em SVG
  ui.js                     liga estado, tela e eventos
```

## Trocar o localStorage por um servidor

Os jogos só usam o objeto `storage` de `assets/js/core/storage.js`, que tem a
interface assíncrona `load(key)`, `save(key, value)`, `remove(key)` e
`list(prefix)`. Para usar um backend, crie um `ApiAdapter` com esses mesmos
métodos (por exemplo, fazendo `fetch` para a sua API) e troque o `export const
storage`. O estado da partida já é um objeto JSON serializável.

## Adicionar um jogo novo

1. Crie `games/<nome>/index.html` importando `../../assets/css/base.css`.
2. Reaproveite os módulos de `assets/js/core/`.
3. Adicione um card em `index.html`.
