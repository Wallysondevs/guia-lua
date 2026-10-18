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

(em construção: o que funciona e o que não funciona — `os.execute`, `io.popen`, `require` de módulos em C, LuaRocks —, diferenças editor × lab, as ferramentas `tools/testar-missoes.js` e `tools/sim.js`.)

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
