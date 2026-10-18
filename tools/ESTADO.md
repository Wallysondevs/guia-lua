# Estado do simulador do Guia Lua (editor `.trylua`)

Atualizado em 18/10/2026 pelo agente do simulador.

## O que está pronto
| Peça | Arquivo | Estado |
|---|---|---|
| Motor | `assets/lua/lua.wasm` — o **Lua 5.5.0 oficial** (`lua.c` + biblioteca, de lua.org) compilado para WebAssembly WASI com o wasi-sdk 34, com o `luaconf.h` do pacote `lua5.5` do Ubuntu (caminhos do `require` iguais aos do lab). 340 KB. Versão e tamanho: `assets/lua/VERSAO.txt`; licença: `assets/lua/LICENSE-lua.txt` | pronto |
| Adaptações ao navegador | `tools/lua-src/` (`guia-rt.c`, `guia.h`, `guia-lua-c.h`, `inc/sys/wait.h`, o patch do Debian): pasta `/home/ana`, stdout aparece antes de ler o teclado, `os.execute`/`io.popen` (= `sh: 1: X: not found`), `os.tmpname`, `io.tmpfile`, fuso do navegador, números e textos de erro (`errno`, `strerror`) do Linux, `dlopen` que falha como no glibc, `os.setlocale` com os locales do lab (vírgula decimal, datas em português, ordem de textos), aviso de erro ao editor | pronto |
| "Linux" do lua.wasm + protocolo | `assets/lua/motor.mjs` (WASI preview1: disco em memória, terminal, teclado linha a linha, relógio; JSPI ou "por repetição") — usado pelo navegador **e** pelo Node | pronto |
| Web Worker | `assets/lua/lua-worker.mjs` (baixa e compila o `lua.wasm` uma vez; cada Rodar é uma instância nova) | pronto |
| Interface | `assets/luasim.js` (cópia adaptada do `pysim.js` do Guia Python; usa as classes `.ts-*`/`.tc-*`/`.tp` do `style.css` e injeta a moldura da `.trylua`) | pronto |
| Ferramentas | `tools/sim.js`, `tools/testar-missoes.js` (`--nativo` via `tools/lab-nativo.js`), `tools/testar-navegador.js`, `tools/motor-node.mjs`, `tools/construir-lua.sh` | prontas |
| Página de teste | `simulador-teste-interno.html` (fora da NIVEIS, `noindex`): 16 caixas que exercitam tudo | pronta |
| Documentação | §4 do `CONTRIBUINDO.md` | pronta |

## Como o editor funciona (resumo; detalhes na §4 do CONTRIBUINDO)
- Um Web Worker por página. O `lua.wasm` é baixado e compilado no 1º Rodar (~0,1 s no teste local); cada Rodar instancia um `lua main.lua` novo (~30 ms).
- **Parar** e o limite de **10 s** (sem contar o teclado) encerram o worker (`terminate`) e já preparam outro (do cache). Saída máxima: 2 milhões de caracteres. A saída é mandada na hora (nada se perde no Parar).
- `io.read` sem `data-stdin`: **JSPI** (Chrome/Edge: o programa fica parado de verdade no `fd_read`) ou, sem JSPI, **por repetição** (roda de novo do começo com as linhas já digitadas; o relógio e os sorteios se repetem iguais em todas as repetições).
- "Terminou com erro" (metas `semerro`/`erro:`) = o `lua.c` escreveu a mensagem `lua: …` (o `lua_writestringerror` do `lua.c` avisa o editor antes de escrever). `os.exit(1)` não conta como erro.
- Atributos de teste (o editor ignora): `data-digitar="Bia\n30"` (o que os testadores digitam) e `data-sem-fim` (laço infinito de propósito).

## Como rodar (na VPS, em `~/guia-lua`, depois de `. ~/.profile`)
```bash
timeout 60  node tools/sim.js main.lua [contas.lua dados.txt] [--stdin "Ana\n30"] [--digitar "Ana"] [--args "a b"] [--goal "out:…;;semerro"] [--json]
timeout 60  node tools/sim.js - < programa.lua
timeout 60  node tools/sim.js -e 'print(10 // 3)'
timeout 300 node tools/testar-missoes.js [-q] pagina.html…        # do notebook: ~/guia-lua-lab/testar pagina.html
timeout 900 node tools/testar-missoes.js -q --todas
timeout 900 node tools/testar-missoes.js --nativo pagina.html      # + lua do lab; diferenças em tools/DIFERENCAS.md
timeout 600 node tools/testar-navegador.js [-q] [--semjspi] [--fotos DIR] pagina.html…
```
- `testar-navegador.js` precisa do puppeteer-core de `~/rascunho/coord/cdp/node_modules` (ou `PUPPETEER_DIR`) e do `/usr/bin/chromium` (ou `CHROMIUM`). Na `simulador-teste-interno.html` ele clica de verdade: Rodar, Ctrl+Enter, indentação automática (2 espaços depois de `do`/`then`/`function(…)`/`{`), Tab, Restaurar, abas, Ver solução (cancelar/sim), `io.read` digitado, Ctrl+D, campo Entrada, Argumentos, Parar, a trava de 10 s, erro em vermelho, erro de sintaxe, `os.execute`, cores ANSI. Também mede os tempos.
- `--semjspi` testa o modo por repetição (Safari/Firefox sem JSPI).
- `--nativo` usa `~/guia-lua-lab/lab` (ou `LUA_LAB=…`): roda `lua main.lua` lá dentro com `stdbuf -oL` (stdout em linhas, como no terminal).

## Regenerar o lua.wasm
`bash tools/construir-lua.sh` (baixa o `lua-5.5.0.tar.gz` de lua.org e confere o sha256; precisa do wasi-sdk em `~/opt/wasi-sdk-34.0-x86_64-linux` ou `WASI_SDK=…`). Ele atualiza `assets/lua/lua.wasm`, `VERSAO.txt`, `LICENSE-lua.txt` e o `LUA_BYTES` do `luasim.js`. Depois: `testar-missoes.js --todas`, `testar-navegador.js simulador-teste-interno.html` (e `--semjspi`), conferir a §4 e commitar.

## Pendências / ideias
- `--nativo` foi testado com um lab provisório (o rootfs do Ubuntu 26.04 com o `lua5.5`); conferir de novo quando o `~/guia-lua-lab/lab` estiver pronto (variáveis de ambiente, `stdbuf`).
- `os.execute("clear")` responde `not found`; poderia limpar o terminal da caixa.
