# Diferenças: editor do guia (lua.wasm) × lua do lab

Mantido pelo `tools/testar-missoes.js --nativo`. O editor roda o **Lua 5.5.0 oficial compilado
para WebAssembly** (versão em `assets/lua/VERSAO.txt`) no navegador; o lab (`~/guia-lua-lab/lab`)
roda o **lua5.5 do Ubuntu 26.04**. O testador roda o código inicial e a solução de cada caixa nos dois,
com o mesmo stdin e os mesmos argumentos, e compara a saída (stdout + stderr) e o código de saída.

## Diferenças conhecidas (esperadas)
Estão na §4 do `CONTRIBUINDO.md`: endereços (`table: 0x…`), a ordem do `pairs` com chaves de
texto, `math.random` sem `math.randomseed(N)`, hora/fuso (o do navegador do leitor),
`os.execute`/`io.popen` (no navegador não há outros programas), desempenho.
Uma diferença que **não** está lá é um achado: avise o agente do simulador.

## Diferenças encontradas
<!-- AUTO: cada página tem a sua seção, reescrita a cada --nativo. Página sem diferença não aparece. -->

<!-- pagina:coleta-lixo.html -->
### coleta-lixo.html (2026-10-18 19:46 UTC)

**caixa 1, código inicial (linha 110)** — saída diferente: + Com a lista:        5777.9 KB | + Depois de limpar:   5600.9 KB | - Com a lista:        4943.7 KB | - Depois de limpar:   4816.4 KB (esperado: memória usada (o editor é de 32 bits: números menores))

```lua
local lista = {}
for i = 1, 100000 do
  lista[i] = "item " .. i
end
local com_lista = collectgarbage("count")
print(string.format("Com a lista:      %8.1f KB", com_lista))

collectgarbage("collect")
local depois = collectgarbage("count")
print(string.format("Depois de limpar: %8.1f KB", depois))
print("Liberou mais da metade?", depois < com_lista / 2)
```

- editor (código de saída 0):

```
Com a lista:        4943.7 KB
Depois de limpar:   4816.4 KB
Liberou mais da metade?	false
```
- lab, lua (código de saída 0):

```
Com a lista:        5777.9 KB
Depois de limpar:   5600.9 KB
Liberou mais da metade?	false
```

**caixa 1, solução (linha 124)** — saída diferente: + Com a lista:        5777.9 KB | + Depois de limpar:    529.7 KB | - Com a lista:        4943.7 KB | - Depois de limpar:    526.5 KB (esperado: memória usada (o editor é de 32 bits: números menores))

```lua
local lista = {}
for i = 1, 100000 do
  lista[i] = "item " .. i
end
local com_lista = collectgarbage("count")
print(string.format("Com a lista:      %8.1f KB", com_lista))
lista = nil
collectgarbage("collect")
local depois = collectgarbage("count")
print(string.format("Depois de limpar: %8.1f KB", depois))
print("Liberou mais da metade?", depois < com_lista / 2)
```

- editor (código de saída 0):

```
Com a lista:        4943.7 KB
Depois de limpar:    526.5 KB
Liberou mais da metade?	true
```
- lab, lua (código de saída 0):

```
Com a lista:        5777.9 KB
Depois de limpar:    529.7 KB
Liberou mais da metade?	true
```
<!-- /pagina:coleta-lixo.html -->

<!-- pagina:tabelas.html -->
### tabelas.html (2026-10-18 19:46 UTC)

**caixa 2, código inicial (linha 330)** — saída diferente: + table: 0x5620ec6236f0 | - table: 0x80dd20 (esperado: endereços de memória (table: 0x…, function: 0x…))

```lua
local compras = {"pão", "leite", "café"}
print(compras)
for i = 1, #compras do
  print(i, compras[i])
end
```

- editor (código de saída 0):

```
table: 0x80dd20
1	pão
2	leite
3	café
```
- lab, lua (código de saída 0):

```
table: 0x5620ec6236f0
1	pão
2	leite
3	café
```
<!-- /pagina:tabelas.html -->

<!-- pagina:pairs.html -->
### pairs.html (2026-10-18 19:47 UTC)

**caixa 1, código inicial (linha 86)** — saída diferente: + leite: 12 | - pao: 40 | + arroz: 5 | + pao: 40 (esperado: ordem do pairs/next (chaves de texto: muda a cada execução))

```lua
local estoque = {arroz = 5, feijao = 3, leite = 12, cafe = 2, pao = 40}
for produto, quantidade in pairs(estoque) do
  print(produto .. ": " .. quantidade)
end
```

- editor (código de saída 0):

```
pao: 40
feijao: 3
cafe: 2
arroz: 5
leite: 12
```
- lab, lua (código de saída 0):

```
leite: 12
feijao: 3
arroz: 5
cafe: 2
pao: 40
```

**caixa 3, código inicial (linha 493)** — saída diferente: + cafe: 2 | + arroz: 5 | - cafe: 2 | - arroz: 5 (esperado: ordem do pairs/next (chaves de texto: muda a cada execução))

```lua
local estoque = {arroz = 5, feijao = 3, leite = 12, cafe = 2, pao = 40}
for produto, quantidade in pairs(estoque) do
  print(produto .. ": " .. quantidade)
end
```

- editor (código de saída 0):

```
pao: 40
feijao: 3
cafe: 2
arroz: 5
leite: 12
```
- lab, lua (código de saída 0):

```
cafe: 2
arroz: 5
pao: 40
feijao: 3
leite: 12
```
<!-- /pagina:pairs.html -->

<!-- pagina:tostring-call-len.html -->
### tostring-call-len.html (2026-10-18 19:49 UTC)

**caixa 1, código inicial (linha 136)** — saída diferente: + table: 0x55e8d373b570 | - table: 0x80e160 (esperado: endereços de memória (table: 0x…, function: 0x…))

```lua
local Retangulo = {}

local function retangulo(largura, altura)
  return setmetatable({ largura = largura, altura = altura }, Retangulo)
end

local janela = retangulo(3, 4)
print(janela)
```

- editor (código de saída 0):

```
table: 0x80e160
```
- lab, lua (código de saída 0):

```
table: 0x55e8d373b570
```
<!-- /pagina:tostring-call-len.html -->

<!-- pagina:math-random.html -->
### math-random.html (2026-10-18 19:51 UTC)

**caixa 1, código inicial (linha 95)** — saída diferente: + Dado: 1 | - Dado: 5 (esperado: números sorteados sem math.randomseed(N))

```lua
local d1 = math.random(6)
print("Dado: " .. d1)
```

- editor (código de saída 0):

```
Dado: 5
```
- lab, lua (código de saída 0):

```
Dado: 1
```

**caixa 1, solução (linha 100)** — saída diferente: + Dados: 4 e 5 | + Soma: 9 | - Dados: 5 e 2 | - Soma: 7 (esperado: números sorteados sem math.randomseed(N))

```lua
local d1 = math.random(6)
local d2 = math.random(6)
print("Dados: " .. d1 .. " e " .. d2)
print("Soma: " .. d1 + d2)
```

- editor (código de saída 0):

```
Dados: 5 e 2
Soma: 7
```
- lab, lua (código de saída 0):

```
Dados: 4 e 5
Soma: 9
```

**caixa 2, código inicial (linha 150)** — saída diferente: + 521 395 778 | + 372 974 960 | - 605 498 728 | - 543 391 786 (esperado: números sorteados sem math.randomseed(N))

```lua
local function tres()
  return math.random(1000) .. " " .. math.random(1000) .. " " .. math.random(1000)
end

local a = tres()
local b = tres()
print(a)
print(b)
print("iguais: " .. tostring(a == b))
```

- editor (código de saída 0):

```
605 498 728
543 391 786
iguais: false
```
- lab, lua (código de saída 0):

```
521 395 778
372 974 960
iguais: false
```

**caixa 3, solução (linha 352)** — saída diferente: + Número da sorte: 7 | - Número da sorte: 2 (esperado: números sorteados sem math.randomseed(N))

```lua
local sorte = math.random(1, 10)
print("Número da sorte: " .. sorte)
```

- editor (código de saída 0):

```
Número da sorte: 2
```
- lab, lua (código de saída 0):

```
Número da sorte: 7
```
<!-- /pagina:math-random.html -->

<!-- pagina:simulador-teste-interno.html -->
### simulador-teste-interno.html (2026-10-18 19:51 UTC)

**caixa 10, código inicial (linha 174)** — saída diferente: + total 4 | + -rw-rw-r-- 1 ana ana 227 Oct 18 16:51 main.lua | + true	exit	0 | - sh: 1: ls: not found (esperado: comandos do sistema (os.execute/io.popen: no navegador não há outros programas); informações do sistema (os.execute, io.popen, os.getenv))

```lua
print(os.execute())
print(os.execute("ls -l"))
print(os.execute("exit 3"))
print(os.execute("true"))
local p = io.popen("date")
print(p:read("a"))
print(p:close())
print(os.getenv("HOME"), os.getenv("USER"), os.getenv("NADA"))
```

- editor (código de saída 0):

```
true
sh: 1: ls: not found
nil	exit	127
nil	exit	3
true	exit	0
sh: 1: date: not found

nil	exit	127
/home/ana	ana	nil
```
- lab, lua (código de saída 0):

```
true
total 4
-rw-rw-r-- 1 ana ana 227 Oct 18 16:51 main.lua
true	exit	0
nil	exit	3
true	exit	0
dom. 18 out 2026 16:51:53 -03

true	exit	0
/home/ana	ana	nil
```

**caixa 11, código inicial (linha 187)** — saída diferente: + true	2	0.19835945970324609 | - true	2	0.060057839238028987 (esperado: data, hora e tempo medido; informações do sistema (os.execute, io.popen, os.getenv); os.setlocale (o editor só tem o locale C))

```lua
print(os.time() > 1700000000, os.date("%Y-%m-%d %H:%M:%S"), os.date("%z %Z"))
print(os.date("!%H:%M", 0), os.time({ year = 2026, month = 1, day = 1, hour = 12 }))
print(os.clock() < 1, math.random(1, 6), math.random())
math.randomseed(42)
print(math.random(1, 100), math.random(1, 100))
local nome = os.tmpname()
print(nome:match("^/tmp/lua_%w%w%w%w%w%w$") ~= nil)
local t = io.tmpfile()
t:write("oi") t:seek("set") print(t:read("a"))
print(os.setlocale())
```

- editor (código de saída 0):

```
true	2026-10-18 16:51:53	-0300 -03
00:00	1767279600
true	2	0.060057839238028987
50	76
true
oi
C
```
- lab, lua (código de saída 0):

```
true	2026-10-18 16:51:53	-0300 -03
00:00	1767279600
true	2	0.19835945970324609
50	76
true
oi
C
```

**caixa 12, código inicial (linha 202)** — saída diferente: + false	table: 0x55a76a892d10 | - false	table: 0x80eb80 | + false	not enough memory | - false	resulting string too large (esperado: endereços de memória (table: 0x…, function: 0x…); limites de memória (o editor é WebAssembly de 32 bits, com no máximo 256 MB); memória usada (o editor é de 32 bits: números menores))

```lua
print(pcall(error, "falhou"))
print(pcall(error, { codigo = 7 }))
print(select(2, pcall(function () error("nível 1", 1) end)))
print(xpcall(function () local t = nil; return t.x end, debug.traceback))
local co = coroutine.create(function () coroutine.yield(1); error("dentro da corrotina") end)
print(coroutine.resume(co))
print(coroutine.resume(co))
print(coroutine.status(co))
local function f(n) return f(n + 1) + 1 end
local ok, msg = pcall(f, 1)
print(ok, msg)
local function g(n) if n == 0 then return 0 end return pcall(g, n - 1) end
print(pcall(g, 300))
print(pcall(string.rep, "x", 1 << 40))
print(collectgarbage("count") > 0)
```

- editor (código de saída 0):

```
false	falhou
false	table: 0x80eb80
main.lua:3: nível 1
false	main.lua:4: attempt to index a nil value (local 't')
stack traceback:
	main.lua:4: in function <main.lua:4>
	[C]: in global 'xpcall'
	main.lua:4: in main chunk
	[C]: in ?
true	1
false	main.lua:5: dentro da corrotina
dead
false	main.lua:9: stack overflow
true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	false	C stack overflow
false	resulting string too large
true
```
- lab, lua (código de saída 0):

```
false	falhou
false	table: 0x55a76a892d10
main.lua:3: nível 1
false	main.lua:4: attempt to index a nil value (local 't')
stack traceback:
	main.lua:4: in function <main.lua:4>
	[C]: in global 'xpcall'
	main.lua:4: in main chunk
	[C]: in ?
true	1
false	main.lua:5: dentro da corrotina
dead
false	main.lua:9: stack overflow
true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	true	false	C stack overflow
false	not enough memory
true
```

**caixa 15, código inicial (linha 239)** — saída diferente: + Pensei num número (sorteado: 851) | + pairs começa por	chave8 | - Pensei num número (sorteado: 878) | - pairs começa por	chave1 (esperado: números sorteados sem math.randomseed(N); ordem do pairs/next (chaves de texto: muda a cada execução))

```lua
local sorteado = math.random(1, 1000)
print("Pensei num número (sorteado: " .. sorteado .. ")")
local t = {}
for i = 1, 20 do t["chave" .. i] = i end
local ordem = {}
for k in pairs(t) do ordem[#ordem + 1] = k end
print("pairs começa por", ordem[1])
while true do
  io.write("Número: ")
  local linha = io.read()
  if not linha then print("tchau") break end
  local n = tonumber(linha)
  if n then print("dobro:", n * 2) else print("Isso não é um número.") end
end
```

- editor (código de saída 0):

```
Pensei num número (sorteado: 878)
pairs começa por	chave1
Número: dobro:	20
Número: Isso não é um número.
Número: dobro:	10
Número: tchau
```
- lab, lua (código de saída 0):

```
Pensei num número (sorteado: 851)
pairs começa por	chave8
Número: dobro:	20
Número: Isso não é um número.
Número: dobro:	10
Número: tchau
```
<!-- /pagina:simulador-teste-interno.html -->
