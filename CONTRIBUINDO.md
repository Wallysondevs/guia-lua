# Como escrever uma página do Guia Lua

O guia é uma **escola**, estilo W3Schools, para quem **nunca programou**. **Uma aula = um assunto.** O dono do projeto já reclamou de outro guia que juntava vários assuntos numa página. Nunca mostre código "seco":
- explique cada parte (anatomia);
- mostre a **saída real**, colhida no Lua de verdade (laboratório);
- mostre o que acontece quando dá errado, com a mensagem **real** do Lua;
- deixe o leitor praticar no editor do guia, que roda **o Lua de verdade** no navegador.

Antes de tudo, leia o `RECURSOS.md`: onde trabalhar (VPS) e como.

## 1. Esqueleto do arquivo
Use como modelo a estrutura de uma aula do Guia Python, por exemplo `~/guia-python/print.html` e `~/guia-python/while.html` (cabeçalho, `<main>`, blocos, rodapé, `.exercise`, `.mc`, `dl.anatomy`, `div.cenario`, `div.note`, `table.ref`). Troque:
- `<title>Lua TEMA — descrição | Guia Lua</title>`;
- `<h1>Lua <span class="hl">TEMA</span></h1>`;
- a caixa `.trypy` por **`.trylua`** (seção 3), `main.py` por `main.lua`, `python3` por `lua`.

Menu, selo e Anterior/Próximo vêm de `assets/site.js` (`NIVEIS`). **Não mude a `NIVEIS`.** Links internos só para páginas que estão nela.

## 2. Ordem de uma aula
1. Intro.
2. "Você vai aprender".
3. A ideia antes do código, com uma comparação do dia a dia (uma receita de bolo, uma caixa com etiqueta, uma lista de compras).
4. Do simples ao completo, uma novidade por vez, com `dl.anatomy` ou uma tabela "parte → o que faz".
5. **A saída real** depois de cada exemplo: `pre.term` com `$ lua arquivo.lua` (ou o `> ` do modo interativo) e o que o Lua respondeu no lab.
6. **Pelo menos dois "Experimente"** (`.trylua`) por aula: um no meio e uma missão no fim.
7. Formas diferentes de fazer a mesma coisa + tabela "qual usar".
8. **Quando dá errado** (`div.cenario`): o código errado e a **mensagem de erro real** (colha no lab, nunca de memória), explicada linha por linha em português (`lua: main.lua:3: attempt to …`, o `stack traceback:`).
9. Referência (`table.ref`).
10. Exercícios (3 ou mais: `.exercise`, `.mc`).
11. Resumo.

Páginas de **Projetos**: passo a passo (versão 1, 2, 3… do programa, cada uma com um `.trylua`). Páginas de **Referência**: tabelas, com poucos `.trylua` (1 ou 2).

## 3. Componentes

### Código para ler
```html
<pre class="file" data-file="ola.lua">local nome = "Ana"
print("Olá, " .. nome .. "!")
</pre>
```
Dentro de `<pre>`, escape `<`, `>` e `&` (`&lt;`, `&gt;`, `&amp;`): `if x &lt; 10 then`, `x &amp; 0xFF`, `local f &lt;close&gt; = …`, `[[ … ]]` fica como está. O testador confere.

### Terminal (`pre.term`)
- `$ ` = `ana@notebook:~$` (o prompt aparece sozinho);
- `> ` e `>> ` = o modo interativo do Lua e a continuação dele — **só depois de uma linha `$ lua`** (ou `$ lua -i arquivo.lua`); o site destaca como prompt até o próximo `$ `;
- `> ` logo depois de um comando do bash (fora do modo interativo) = continuação do bash (heredoc);
- `«` = anotação (vira um comentário em cinza à direita).

Toda saída vem do lab. Exemplo:
```html
<pre class="term">$ lua ola.lua
Olá, Ana!
</pre>
```

### Editor "Experimente" (`.trylua`), com o Lua de verdade
```html
<div class="trylua" data-goal="out:Olá, Ana!">
<p class="try-task"><strong>Missão:</strong> troque "mundo" por "Ana" e clique em Rodar.</p>
<pre class="script" data-file="main.lua">print("Olá, mundo!")
</pre>
<pre class="solucao" data-file="main.lua">print("Olá, Ana!")
</pre>
</div>
```
- **Rodar** executa o código no **interpretador oficial do Lua** (o `lua.c` de lua.org) compilado para WebAssembly, carregado na primeira vez que o leitor clica em Rodar. A caixa mostra a saída, o erro em vermelho e o código de saída.
- **Vários arquivos** (módulo próprio, `.txt`, `.csv`): vários `<pre class="script" data-file="…">` na mesma caixa viram abas; o primeiro é o que roda (`lua main.lua`), os outros ficam na pasta do programa (`require "contas"` acha `contas.lua`).
- `data-stdin="linha1\nlinha2"`: o que o `io.read()` vai ler. Sem `data-stdin`, o programa **pede e o leitor digita** no terminal da caixa.
- `data-args="a b"`: o que chega em `arg[1]`, `arg[2]`… (e em `...` do arquivo principal).
- `data-repl`: o **modo interativo**. Sem `pre.script`, a caixa é um terminal com `lua` (o leitor digita depois do `> `; o botão vira **Abrir o lua**); com `pre.script`, é `lua -i main.lua`. Caixa sem `pre.script` é sempre livre (sem `data-goal`). Ponha em `data-digitar="1 + 1\nx = 10"` o que o testador deve digitar (detalhes na §4.3).
- Sem `data-goal`: caixa livre. Com `data-goal`: missão, e o `pre.solucao` é **obrigatório** (um por aba que muda).
- Cada Rodar parte do zero: arquivos e variáveis da execução anterior somem.

### Metas (`data-goal`) — regras fixas, não invente outras
Várias metas se separam com **`;;`** (ex.: `data-goal="out:Total: 30;;semerro"`); **todas** precisam passar.

| Meta | Verdade quando… |
| --- | --- |
| `out:TEXTO` | a saída do programa (stdout e stderr, na ordem, como no terminal) **contém** o texto, exatamente |
| `outre:REGEX` | a saída inteira casa com a regex |
| `semerro` | o programa terminou sem erro não tratado (nem erro de sintaxe): o `lua` não escreveu `lua: …` |
| `erro:TEXTO` ou `erro:/REGEX/` | o programa terminou com erro não tratado (ou de sintaxe) e a mensagem (`lua: main.lua:3: …` + `stack traceback`) contém o texto (ou casa) — ex.: `erro:attempt to perform arithmetic on a nil value` |
| `exit:N` | o código de saída foi N (`os.exit(N)`; erro não tratado = 1; normal = 0) |
| `src:REGEX` | o código do leitor (todas as abas) casa com a regex — para exigir um recurso: `src:\bfor\b` |
| `arquivo:NOME` | depois de rodar, o arquivo NOME existe na pasta do programa |
| `arquivo:NOME~TEXTO` | …e contém o texto |

**Regras exatas:**
- Regex é a do JavaScript. `outre:` aplica **sem flags** à saída inteira: `^`/`$` são começo e fim da saída toda; escreva `\n` para as quebras (`outre:^1\n2\n3\n$`). `src:` aplica com a flag `m`. `erro:/…/` aceita flags (`/…/i`).
- Dentro de regex, `|` é alternativa e `\|` é a barra vertical literal. Não há outros escapes no `data-goal` além do HTML (`&quot;`, `&lt;`, `&amp;`).
- `out:`/`outre:` olham só a saída do programa (o que `print`/`io.write` escreveram e a mensagem de erro do `lua`), nunca mensagens do editor.
- O **código inicial não pode cumprir a meta**, e a **solução tem de cumprir** (o testador confere os dois).
- **Prefira metas tolerantes** (`out:` com um trecho que só a resposta certa produz, `semerro`, `src:`) a um `outre:` que só aceita uma escrita exata.
- **A meta não pode depender** do que muda entre execuções ou entre o editor e o lab: `math.random` sem `math.randomseed(N)`, data e hora (`os.time`, `os.date`, `os.clock`), endereços (`table: 0x55…`, `function: 0x…`), **a ordem do `pairs`** em tabelas com chaves de texto (muda de uma execução para outra — ordene as chaves antes), tempo de execução, caminhos de pasta.

### Outros blocos
`dl.anatomy`, `div.note/.tip/.warning/.cenario`, `ol.passo`, `div.table-wrap > table.ref`, `.exercise`, `.mc`, `figure`, `<span class="versao">5.5</span>`.

No `.exercise`, `data-answer="a|b"` aceita respostas alternativas (a comparação é **exata**: `true` ≠ `True`). Para uma barra vertical dentro da resposta, escreva `\|`.

## 4. O editor do guia: o Lua real no navegador (`assets/luasim.js`)
> **Esta seção é mantida pelo agente do simulador.** Antes de escrever uma frase do tipo "no editor…" que não esteja aqui, confira com as ferramentas dele (`tools/sim.js`).

### 4.1 O que é
- **Editor = Lua 5.5.0**: o interpretador oficial (o `lua.c` e a biblioteca de lua.org, `lua-5.5.0.tar.gz`) compilado para WebAssembly (`assets/lua/lua.wasm`, **340 KB**, baixado no 1º Rodar e guardado pelo navegador). **Lab = `lua5.5` 5.5.0-3ubuntu0.1** do Ubuntu 26.04: o mesmo código-fonte. O `luaconf.h` recebeu o mesmo remendo do pacote do Ubuntu, então `package.path`/`package.cpath` e a lista do `module 'x' not found:` saem **iguais** às do lab. Detalhes em `assets/lua/VERSAO.txt` e em `tools/construir-lua.sh`.
- As mensagens de erro, o `stack traceback:`, `_VERSION` (`Lua 5.5`), o jeito de escrever números (`3.5`, `1e+100`, `0.30000000000000004`, `9007199254740992.0`, `-nan`), `string.format`, `%q`, `utf8`, `goto`, `global`, `<const>`, `<close>` e as corrotinas saem **iguais** às do lab (conferido com o `tools/testar-missoes.js --nativo` e com dezenas de programas de teste).
- Roda num Web Worker: a página não trava. Cada **Rodar** é um `lua main.lua` novo: memória nova, variáveis zeradas, `/home/ana` só com os arquivos das abas. O que o programa cria (`io.open("x.txt", "w")`) existe até o fim daquele Rodar (a meta `arquivo:` enxerga).
- O terminal da caixa mostra `ana@notebook:~$ lua main.lua` (+ `data-args`), a saída (stderr e a mensagem de erro em **vermelho**; cores ANSI como `"\27[31m"` desenhadas) e, no fim, `[código de saída: N]`.
- Metas: o `data-goal` é lido **já decodificado** (`&lt;`/`&quot;` viram `<`/`"`) e só então separado nos `;;` — no editor e no testador.

### 4.2 Números fixos (não mudam sem aviso)
| O quê | Valor |
|---|---|
| Tempo máximo rodando | **10 s** (sem contar a espera pelo teclado). Passou: `(o editor parou o programa: ele rodou mais de 10 segundos sem terminar — laço infinito?)` e `[programa interrompido]` |
| Botão **■ Parar** (o Rodar vira Parar) e **Ctrl+C** no campo de entrada | encerram na hora: mostra `^C` e `[programa interrompido]`. **Não** aparece `lua: interrupted!` (no lab, Ctrl+C mostra `lua: interrupted!` + `stack traceback:` e o código de saída é 1) |
| Saída máxima | **2 milhões de caracteres** (passou: `(o programa escreveu demais…)` e `[programa interrompido]`); o terminal desenha as primeiras **3000 linhas** e as últimas 40 (as metas veem tudo) |
| Memória | no máximo **256 MB**: passou disso, `not enough memory` (no lab o limite é a memória da máquina) |
| Pilha | igual ao lab: recursão infinita em Lua dá `stack overflow` (depois de ~1 milhão de chamadas, nos dois); funções C aninhadas (`pcall` dentro de `pcall`…) param em ~200 com `C stack overflow` |
| Velocidade | ~1,6× mais lento que o lab (`fib(30)` + 200 mil `tostring` + 100 mil chaves: 0,33 s × 0,20 s) |
| Primeiro Rodar | baixa (340 KB) e prepara o Lua; no teste local, ~0,1 s. Depois, cada Rodar leva ~30 ms |

### 4.3 Entrada (`io.read`)
- **Com `data-stdin`**: `io.read()`, `io.read("n")`, `io.read("l")`, `io.read("L")`, `io.read("a")`, `io.read(5)`, `io.lines()` e `io.stdin:read` leem dali (uma linha por `\n`); a caixa ganha um campo **Entrada** editável. A linha lida aparece no terminal em branco, como se fosse digitada, mas **não entra no `out:`** (a saída do programa é a mesma de `lua main.lua < entrada.txt` no lab). Acabou o texto → `io.read()` devolve `nil`.
- **Sem `data-stdin`**: o programa para no `io.read` e o leitor **digita no terminal da caixa** (Enter envia; **Ctrl+D** = fim da entrada, o `io.read()` devolve `nil`; Ctrl+C = Parar). Funciona em laços, com `io.read("n")` (o resto da linha fica para o próximo `io.read`, como no lab), `io.lines()` e `io.read("a")`. O `io.write("Nome: ")` sem `\n` aparece **antes** de esperar, como no terminal do lab.
- Como: no **Chrome/Edge** (e onde houver JSPI) o programa fica de fato parado esperando. Nos navegadores sem JSPI (Safari e, conforme a versão, Firefox) o editor usa o modo **por repetição**: roda até o `io.read`, o leitor digita, e roda **de novo do começo** com as linhas já digitadas, mostrando só o que é novo — parece contínuo. Nesse modo o relógio (`os.time`) começa igual a cada repetição e `math.random` (mesmo sem `math.randomseed`) e a ordem do `pairs` se repetem, para a saída não mudar no meio; um programa lento fica lento a cada linha.
- **Missão que lê o teclado**: use `data-stdin` (o mais simples) ou, se o leitor deve **digitar**, **`data-digitar="Bia\n30"`**: o editor ignora esse atributo (o leitor digita), mas o testador e o `testar-navegador.js` digitam essas linhas quando o programa pede. Sem nenhum dos dois, o testador manda "fim de entrada" (`nil`) e avisa.
- **Modo interativo (`data-repl`)**: a caixa sem `pre.script` mostra `ana@notebook:~$ lua`, o cabeçalho `Lua 5.5.0  Copyright…` e o `> `; o leitor digita (Enter executa, Ctrl+D sai, ■ Parar encerra). Com `pre.script`, é `lua -i main.lua`. No editor, o `data-stdin` é ignorado nessas caixas (`lua < arquivo` não é interativo); o testador digita o `data-digitar`. Uma mensagem de erro mostrada no `> ` conta como erro para as metas (`semerro` falha), mesmo que a sessão continue.
- **Laço infinito de propósito** (para mostrar o ■ Parar): ponha **`data-sem-fim`** na `div.trylua`. O testador confere que ele de fato não termina (FALHA se terminar). Sem o atributo, uma caixa que passa de 10 s é FALHA.

### 4.4 O que funciona e o que não funciona no editor (conferido com `tools/sim.js` e no Chromium)
| Recurso | No editor |
|---|---|
| `print`, `io.write`, `string.*`, `table.*`, `math.*`, `utf8.*`, `coroutine.*`, `debug.traceback`, metatabelas, `pcall`/`error`/`xpcall`, `load`, `goto`, `global`, `<const>`, `<close>` | ✔ iguais ao lab |
| Arquivos: `io.open` (ler, `"w"`, `"a"`), `f:read/write/seek/lines`, `io.lines("x.txt")`, `io.output`, `io.tmpfile`, `os.remove`, `os.rename`, `os.tmpname` (`/tmp/lua_XXXXXX`) | ✔ na `/home/ana` da caixa (some no próximo Rodar). As abas extras (`data-file="precos.txt"`) já estão lá. Erros iguais aos do lab: `nil  nada.txt: No such file or directory  2` |
| Módulo próprio: `require "contas"` com a aba `contas.lua` | ✔ (acha `./contas.lua`; sem a aba, a mensagem `module 'contas' not found:` lista os mesmos caminhos do lab) |
| `arg`, `...` do arquivo principal (`data-args`) | ✔ `arg[0]` = `main.lua`, `arg[-1]` = `lua` |
| `os.exit(n)`, `os.exit(true/false)` | ✔ o código de saída aparece na caixa (`exit:N`); o que estava no buffer (`io.write` sem `\n`) é escrito antes, como no lab |
| `os.time`, `os.date`, `os.clock`, `os.difftime` | ✔ com o **relógio e o fuso do navegador do leitor** (`os.date("%z %Z")` = `-0300 -03` em São Paulo). `os.clock()` conta o tempo rodando, sem a espera pelo teclado |
| `os.getenv` | ✔ as mesmas variáveis do lab: `HOME`=`/home/ana`, `USER`=`ana`, `LANG`=`pt_BR.UTF-8`, `TERM`, `SHELL`, `PATH`, `EDITOR`…; só o `TZ` é o fuso do leitor (`America/Sao_Paulo` no lab) |
| `math.random` | ✔ sem `math.randomseed` sorteia diferente a cada Rodar (como no lab); `math.randomseed(42)` dá **os mesmos números do lab** |
| `os.execute("ls")`, `io.popen("date")` | **✘** no navegador não há shell nem outros programas: o comando responde como num Linux em que ele não existe — `sh: 1: ls: not found` (no stderr) e `nil  exit  127`; `io.popen(...)` lê `""` e o `:close()` dá `nil  exit  127`. Só `os.execute()` (= `true`), `"true"`, `"false"` e `"exit N"` funcionam. Mostre comandos do sistema no lab |
| `require` de módulo em C (`.so`), `package.loadlib`, LuaRocks | **✘** não há bibliotecas dinâmicas no navegador: `module 'x' not found:` (igual ao lab quando o módulo não está instalado) ou `x.so: cannot open shared object file: No such file or directory`. Ensine LuaRocks no lab |
| `os.setlocale`: `"pt_BR.UTF-8"`, `""` (= `pt_BR.UTF-8`, o `LANG` da Ana), `"pt_PT.UTF-8"`, `"en_US.UTF-8"`, `"C"`, `"C.UTF-8"`, `"POSIX"`, com ou sem categoria (`"numeric"`, `"time"`, `"collate"`…) | ✔ como no lab (são os locales instalados lá): devolve o mesmo nome (um que não existe, como `"pt_BR"` ou `"fr_FR.UTF-8"`, dá `nil`); com `numeric` em português os números saem e entram com vírgula (`3,5`, `tonumber("3,5")`, `string.format("%.2f")` = `1,50`); com `time`, `os.date` em português (`qui 05 mar 2026 14:07:09`, `março`, `%x` = `05/03/2026`); com `collate`, `<` e `table.sort` comparam textos na ordem do idioma (`álvaro Ana bia caio Érica Zeca`). Conferido com o lab, linha a linha |
| Arquivos do sistema (`/etc/passwd`, `/usr/share/…`) | **✘** o disco do editor só tem `/home/ana`, `/tmp` e `/etc/hostname` (`notebook`) |
| O modo interativo: `data-repl` (§3) | ✔ `lua` (o leitor digita depois do `> `, a continuação `>> `, o `warning: locals do not survive…`, os erros `stdin:1: …` e o Ctrl+D que sai: tudo igual ao lab `-t`) e `lua -i main.lua` (com `pre.script`). Sem setas nem histórico (↑) do readline |
| `lua -e`, `lua -v`, `lua -` , `luac` | **✘** o editor roda `lua main.lua` (ou o `data-repl`); mostre esses no lab |

### 4.5 Diferenças editor × lab (com o mesmo programa)
| Assunto | Editor | Lab (`lua`) |
|---|---|---|
| Endereços: `print({})`, `tostring(print)`, `coroutine.running()` | curtos e costumam repetir a cada Rodar: `table: 0x80dd70` | longos e mudam a cada execução: `table: 0x56503425a5e0` |
| Ordem do `pairs`/`next` com chaves de texto | muda de um Rodar para outro (com o relógio) | muda a cada execução — **nunca** use essa ordem em meta (§3); ordene as chaves |
| `math.random` sem `math.randomseed(N)` | números diferentes dos do lab | sorteio novo a cada execução |
| Hora e fuso (`os.time`, `os.date`) | o **relógio e o fuso do leitor** | `America/Sao_Paulo` (`-03`) |
| `os.execute`, `io.popen` | `sh: 1: ls: not found`, `nil exit 127` | rodam o comando de verdade |
| `string.packsize("l")`, `("L")`, `("T")` (`long`, `size_t`) | `4` (o WebAssembly é de 32 bits) | `8`. Os outros formatos (`i`, `j`, `n`, `d`, `s`…) são iguais |
| Memória medida: `collectgarbage("count")`, `collectgarbage("param", "stepsize")` | números menores (32 bits: cada tabela, texto e ponteiro ocupa menos) | maiores (64 bits) |
| `string.rep("x", 1 << 40)` (texto gigante) | `resulting string too large` | `not enough memory` |
| Memória cheia (laço que guarda sem parar) | `not enough memory` ao passar de 256 MB | continua até a memória da máquina acabar |
| `0/0` | `-nan` no PC; pode sair `nan` em aparelhos com outro processador | `-nan` |
| Ctrl+C | Parar: `^C`, sem mensagem | `lua: interrupted!` + `stack traceback:`, código 1 |
| Desempenho | ~1,6× mais lento | — |

Por isso: **meta e texto da aula não podem depender** de nada da tabela acima (§3). Diga "no editor…" só com o que está nesta seção; o resto, mostre no lab.

### 4.6 As ferramentas (na VPS, dentro de `~/guia-lua`; Node 24: `. ~/.profile` antes)
- **`tools/sim.js`** — roda um programa **como o editor** (o mesmo `lua.wasm` e o mesmo motor):
  ```
  timeout 60 node tools/sim.js main.lua [contas.lua precos.txt] [--stdin "Ana\n30"] [--args "a 'b c'"] [--goal "out:Olá;;semerro"]
  timeout 60 node tools/sim.js - < programa.lua          (o programa vem da entrada; vira main.lua)
  timeout 60 node tools/sim.js -e 'print(10 // 3)'
  timeout 60 node tools/sim.js main.lua --digitar "Ana\n30"   (o leitor digitando, sem data-stdin; --repeticao força o modo por repetição)
  timeout 60 node tools/sim.js --repl --digitar "1 + 1\nx = 10\nx * 2"   (o modo interativo, data-repl; com main.lua: lua -i main.lua)
  ```
  Mostra o terminal da caixa e `[código de saída: N]`; com `--goal`, diz se a missão passaria e qual meta falhou. `--json` dá tudo em JSON. Sem `--stdin`/`--digitar`, o `io.read()` recebe fim de entrada (`nil`). O fuso do `sim.js` é `America/Sao_Paulo` (o do lab); outro: `TZ=Europe/Lisbon node tools/sim.js …`.
- **`tools/testar-missoes.js`** (ou, do notebook, `~/guia-lua-lab/testar pagina.html`) — confere a página: contrato das caixas, metas, **inicial falha e solução passa**, `data-sem-fim`, `data-digitar`, `<`/`&` sem escape em `pre`, links fora da NIVEIS (aviso), privacidade (FALHA; inclui a lista de `~/.guia-proibido`):
  ```
  timeout 300 node tools/testar-missoes.js pagina.html [-q]
  timeout 600 node tools/testar-missoes.js --nativo pagina.html   (+ roda inicial e solução no lua do lab; diferenças em tools/DIFERENCAS.md)
  ```
- **`tools/testar-navegador.js`** — a página num Chromium de verdade (Rodar em todas as caixas, erros de console). Ver `tools/ESTADO.md`.

## 5. Fidelidade: o laboratório (`~/guia-lua-lab/lab`, na VPS)
É a máquina da Ana (usuária `ana`, computador `notebook`, `/home/ana`, pt_BR, Ubuntu 26.04) com o **Lua 5.5 do Ubuntu, de verdade**. Toda saída de terminal mostrada numa aula vem de lá (detalhes em `~/guia-lua-lab/COMO-USAR.md`):
- programa em arquivo: crie o `.lua` na home da Ana e rode `lua arquivo.lua`;
- modo interativo (`> `): `-t` (terminal de verdade), passando a saída pelo `tela` (ver COMO-USAR);
- **as mensagens de erro do Lua saem em inglês** (`attempt to call a nil value (global 'pirnt')`): copie como saíram e explique em português;
- **Privacidade:** nada da máquina real nem da VPS; só `/home/ana/…`, `ana@notebook`.

## 6. Versão
O guia ensina o **Lua 5.5** (o pacote `lua5.5` do Ubuntu 26.04 e o do editor). O que é novo no 5.5 (a declaração `global`, a variável de controle do `for` que não pode ser alterada, etc.) fica marcado com `<span class="versao">5.5</span>` e reunido em `novidades.html`. Muita gente usa um Lua mais antigo sem saber: o **LuaJIT/5.1** (Neovim, LÖVE, OpenResty), o **Luau** (Roblox), o 5.4 (Debian 13, muitos jogos). Quando algo for diferente lá (inteiros, `//`, `goto`, `<const>`, `table.unpack` × `unpack`), avise numa `div.note` e aponte para `versoes.html`. Nunca afirme algo de uma versão sem conferir no manual oficial (`https://www.lua.org/manual/5.5/`, e o `readme.html#changes` de cada versão) — marque como **ilustrativo** o que não deu para rodar.

## 7. Escrita
- Português do Brasil, frases curtas, "você". O leitor nunca programou.
- Termos em inglês ganham tradução na primeira vez: `print` = "imprimir/mostrar", `if` = "se", `then` = "então", `end` = "fim".
- Exemplos com a vida da Ana: a lista de compras, as notas da turma, o estoque da lojinha, a agenda, a padaria do bairro.
- Boas práticas desde o começo, sempre com o porquê: **`local` sempre** (e por que a variável global é perigosa), nomes claros em minúsculas_com_sublinhado, **2 espaços** de indentação (explique uma vez, em `estilo.html`, que a comunidade usa 2, 3 ou 4), `string.format` para formatar, `io.open` sempre com o `f:close()` (ou `<close>`).
- Nomes de variáveis em português e sem acento (`preco`, `quantidade`): no Lua, **identificador com acento não funciona** (é erro de sintaxe) — conte isso uma vez em `nomes-variaveis.html`. Texto com acento dentro de strings funciona (o `#` conta bytes: veja `utf8.html`).
