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
### coleta-lixo.html (2026-10-18 20:39 UTC)

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

<!-- pagina:math-random.html -->
### math-random.html (2026-10-18 20:39 UTC)

**caixa 1, solução (linha 100)** — saída diferente: + Dados: 3 e 2 | + Soma: 5 | - Dados: 1 e 6 | - Soma: 7 (esperado: números sorteados sem math.randomseed(N))

```lua
local d1 = math.random(6)
local d2 = math.random(6)
print("Dados: " .. d1 .. " e " .. d2)
print("Soma: " .. d1 + d2)
```

- editor (código de saída 0):

```
Dados: 1 e 6
Soma: 7
```
- lab, lua (código de saída 0):

```
Dados: 3 e 2
Soma: 5
```

**caixa 2, código inicial (linha 150)** — saída diferente: + 965 492 938 | + 489 312 264 | - 391 769 798 | - 750 105 256 (esperado: números sorteados sem math.randomseed(N))

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
391 769 798
750 105 256
iguais: false
```
- lab, lua (código de saída 0):

```
965 492 938
489 312 264
iguais: false
```

**caixa 3, solução (linha 352)** — saída diferente: + Número da sorte: 2 | - Número da sorte: 7 (esperado: números sorteados sem math.randomseed(N))

```lua
local sorte = math.random(1, 10)
print("Número da sorte: " .. sorte)
```

- editor (código de saída 0):

```
Número da sorte: 7
```
- lab, lua (código de saída 0):

```
Número da sorte: 2
```

**caixa 4, solução (linha 432)** — saída diferente: + Vencedor: Bia | - Vencedor: Ana (esperado: números sorteados sem math.randomseed(N))

```lua
local nomes = {"Ana", "Bia", "Caio", "Duda", "Edu"}
local i = math.random(#nomes)
print("Vencedor: " .. nomes[i])
```

- editor (código de saída 0):

```
Vencedor: Ana
```
- lab, lua (código de saída 0):

```
Vencedor: Bia
```
<!-- /pagina:math-random.html -->

<!-- pagina:os-execute.html -->
### os-execute.html (2026-10-18 20:40 UTC)

**caixa 1, código inicial (linha 216)** — saída diferente: + main.lua | + true	exit	0 | - sh: 1: ls: not found | - nil	exit	127 (esperado: comandos do sistema (os.execute/io.popen: no navegador não há outros programas); informações do sistema (os.execute, io.popen, os.getenv))

```lua
print(os.execute())
print(os.execute("ls"))
print(os.execute("exit 3"))
local p = io.popen("date +%Y")
print("[" .. p:read("a") .. "]")
print(p:close())
```

- editor (código de saída 0):

```
true
sh: 1: ls: not found
nil	exit	127
nil	exit	3
sh: 1: date: not found
[]
nil	exit	127
```
- lab, lua (código de saída 0):

```
true
main.lua
true	exit	0
nil	exit	3
[2026
]
true	exit	0
```
<!-- /pagina:os-execute.html -->

<!-- pagina:os-funcoes.html -->
### os-funcoes.html (2026-10-18 20:40 UTC)

**caixa 2, código inicial (linha 195)** — saída diferente: + Levou 0.0086 segundos. | - Levou 0.0083 segundos. (esperado: data, hora e tempo medido)

```lua
local inicio = os.clock()
local soma = 0
for i = 1, 1000000 do
  soma = soma + i
end
local gasto = os.clock()
print("Soma: " .. soma)
print(string.format("Levou %.4f segundos.", gasto))
```

- editor (código de saída 0):

```
Soma: 500000500000
Levou 0.0083 segundos.
```
- lab, lua (código de saída 0):

```
Soma: 500000500000
Levou 0.0086 segundos.
```

**caixa 2, solução (linha 206)** — saída diferente: + Levou 0.0050 segundos. | - Levou 0.0073 segundos. (esperado: data, hora e tempo medido)

```lua
local inicio = os.clock()
local soma = 0
for i = 1, 1000000 do
  soma = soma + i
end
local gasto = os.clock() - inicio
print("Soma: " .. soma)
print(string.format("Levou %.4f segundos.", gasto))
```

- editor (código de saída 0):

```
Soma: 500000500000
Levou 0.0073 segundos.
```
- lab, lua (código de saída 0):

```
Soma: 500000500000
Levou 0.0050 segundos.
```
<!-- /pagina:os-funcoes.html -->

<!-- pagina:pairs.html -->
### pairs.html (2026-10-18 20:40 UTC)

**caixa 1, código inicial (linha 86)** — saída diferente: + leite: 12 | - feijao: 3 | + feijao: 3 | - leite: 12 (esperado: ordem do pairs/next (chaves de texto: muda a cada execução))

```lua
local estoque = {arroz = 5, feijao = 3, leite = 12, cafe = 2, pao = 40}
for produto, quantidade in pairs(estoque) do
  print(produto .. ": " .. quantidade)
end
```

- editor (código de saída 0):

```
feijao: 3
arroz: 5
cafe: 2
pao: 40
leite: 12
```
- lab, lua (código de saída 0):

```
leite: 12
arroz: 5
cafe: 2
pao: 40
feijao: 3
```

**caixa 3, código inicial (linha 493)** — saída diferente: - feijao: 3 | - cafe: 2 | + feijao: 3 | + cafe: 2 (esperado: ordem do pairs/next (chaves de texto: muda a cada execução))

```lua
local estoque = {arroz = 5, feijao = 3, leite = 12, cafe = 2, pao = 40}
for produto, quantidade in pairs(estoque) do
  print(produto .. ": " .. quantidade)
end
```

- editor (código de saída 0):

```
feijao: 3
arroz: 5
cafe: 2
pao: 40
leite: 12
```
- lab, lua (código de saída 0):

```
arroz: 5
pao: 40
leite: 12
feijao: 3
cafe: 2
```
<!-- /pagina:pairs.html -->

<!-- pagina:projeto-agenda.html -->
### projeto-agenda.html (2026-10-18 20:40 UTC)

**caixa 1, código inicial (linha 186)** — saída diferente: + Bia Souza    11 98888-1234  bia@exemplo.com | + Davi Rocha   41 95555-4321  davi@exemplo.com | - Davi Rocha   41 95555-4321  davi@exemplo.com | - Bia Souza    11 98888-1234  bia@exemplo.com (esperado: ordem do pairs/next (chaves de texto: muda a cada execução))

```lua
local agenda = {
  ["Bia Souza"] = { telefone = "11 98888-1234", email = "bia@exemplo.com" },
  ["Carlos Lima"] = { telefone = "21 97777-5678", email = "carlos@exemplo.com" },
  ["Ana Paula"] = { telefone = "31 96666-0000", email = "anapaula@exemplo.com" },
}

-- Um contato, pelo nome:
local bia = agenda["Bia Souza"]
print("Telefone da Bia: " .. bia.telefone)

-- Um contato novo:
agenda["Davi Rocha"] = { telefone = "41 95555-4321", email = "davi@exemplo.com" }

-- Todos, em ordem alfabética:
local nomes = {}
for nome in pairs(agenda) do
  nomes[#nomes + 1] = nome
end
-- ponha os nomes em ordem aqui

print()
for _, nome in ipairs(nomes) do
  local contato = agenda[nome]
  print(string.format("%-12s %-14s %s", nome, contato.telefone, contato.email))
end
```

- editor (código de saída 0):

```
Telefone da Bia: 11 98888-1234

Ana Paula    31 96666-0000  anapaula@exemplo.com
Carlos Lima  21 97777-5678  carlos@exemplo.com
Davi Rocha   41 95555-4321  davi@exemplo.com
Bia Souza    11 98888-1234  bia@exemplo.com
```
- lab, lua (código de saída 0):

```
Telefone da Bia: 11 98888-1234

Bia Souza    11 98888-1234  bia@exemplo.com
Davi Rocha   41 95555-4321  davi@exemplo.com
Ana Paula    31 96666-0000  anapaula@exemplo.com
Carlos Lima  21 97777-5678  carlos@exemplo.com
```
<!-- /pagina:projeto-agenda.html -->

<!-- pagina:projeto-banco.html -->
### projeto-banco.html (2026-10-18 20:40 UTC)

**caixa 5, código inicial (linha 902)** — saída diferente: + table: 0x557cf4063620 | - table: 0x80f310 | + table: 0x557cf4063620 | - table: 0x80f310 (esperado: endereços de memória (table: 0x…, function: 0x…))

```lua
-- Banco da Ana, versão 4: herança (a poupança) e erros como tabelas

local Conta = {}
Conta.__index = Conta

function Conta.nova(titular)
  local conta = { titular = titular, saldo = 0, extrato = {} }
  return setmetatable(conta, Conta)
end

-- Um erro que o programa consegue reconhecer: uma tabela com código e mensagem.
local function falhar(codigo, mensagem)
  error({ codigo = codigo, mensagem = mensagem }, 2)
end

function Conta:depositar(valor)
  if type(valor) ~= "number" or valor <= 0 then
    falhar("VALOR", "valor inválido: " .. tostring(valor))
  end
  self.saldo = self.saldo + valor
  table.insert(self.extrato, string.format("depósito  +%8.2f", valor))
end

function Conta:sacar(valor)
  if type(valor) ~= "number" or valor <= 0 then
    falhar("VALOR", "valor inválido: " .. tostring(valor))
  end
  if valor > self.saldo then
    falhar("SALDO", string.format("saldo insuficiente (saldo R$ %.2f)", self.saldo))
  end
  self.saldo = self.saldo - valor
  table.insert(self.extrato, string.format("saque     -%8.2f", valor))
end

function Conta:descricao()
  return string.format("Conta de %s: R$ %.2f", self.titular, self.saldo)
end

function Conta.__tostring(conta)
  return conta:descricao()
end

-- A poupança é uma Conta com rendimento: o que ela não tiver, procura em Conta.
local Poupanca = setmetatable({}, { __index = Conta })
Poupanca.__index = Poupanca

function Poupanca.nova(titular, taxa)
  local conta = Conta.nova(titular)       -- monta a parte de Conta
  conta.taxa = taxa
  return setmetatable(conta, Poupanca)    -- e passa a ser uma Poupanca
end

function Poupanca:render()
  local juros = self.saldo * self.taxa
  self:depositar(juros)
  return juros
end

-- Sobrescreve a descrição: mostra também a taxa.
function Poupanca:descricao()
  return Conta.descricao(self) .. string.format(" (poupança, %.1f%% ao mês)", self.taxa * 100)
end

local ana = Conta.nova("Ana")
local cofrinho = Poupanca.nova("Ana", 0.01)
ana:depositar(300)
cofrinho:depositar(1000)
print(ana)
print(cofrinho)
print(string.format("Rendeu R$ %.2f", cofrinho:render()))
print(cofrinho)

-- Tentar sacar demais, e reconhecer o tipo do erro pelo código.
for _, valor in ipairs({ 50, 5000, -1 }) do
  local ok, erro = pcall(cofrinho.sacar, cofrinho, valor)
  if ok then
    print(string.format("Saque de %.2f: ok", valor))
  elseif erro.codigo == "SALDO" then
    print("Recusado por falta de saldo: " .. erro.mensagem)
  else
    print("Recusado (" .. erro.codigo .. "): " .. erro.mensagem)
  end
end
print(cofrinho)
```

- editor (código de saída 0):

```
Conta de Ana: R$ 300.00
table: 0x80f310
Rendeu R$ 10.00
table: 0x80f310
Saque de 50.00: ok
Recusado por falta de saldo: saldo insuficiente (saldo R$ 960.00)
Recusado (VALOR): valor inválido: -1
table: 0x80f310
```
- lab, lua (código de saída 0):

```
Conta de Ana: R$ 300.00
table: 0x557cf4063620
Rendeu R$ 10.00
table: 0x557cf4063620
Saque de 50.00: ok
Recusado por falta de saldo: saldo insuficiente (saldo R$ 960.00)
Recusado (VALOR): valor inválido: -1
table: 0x557cf4063620
```
<!-- /pagina:projeto-banco.html -->

<!-- pagina:projeto-palavras.html -->
### projeto-palavras.html (2026-10-18 20:40 UTC)

**caixa 3, código inicial (linha 410)** — saída diferente: +  1. já      1 | +  2. há      2 | +  3. pão     5 | +  4. animada  1 (esperado: ordem do pairs/next (chaves de texto: muda a cada execução))

```lua
-- Contador de Palavras, versão 3: contar e ordenar

-- Uma "letra": as letras sem acento (%a) ou um byte de 128 a 255,
-- que são os pedaços das letras acentuadas no UTF-8.
local LETRAS = "[%a\128-\255]+"

-- O lower() só conhece A-Z; as maiúsculas acentuadas vão por esta tabela.
local ACENTUADAS = {
  ["À"] = "à", ["Á"] = "á", ["Â"] = "â", ["Ã"] = "ã", ["Ç"] = "ç",
  ["É"] = "é", ["Ê"] = "ê", ["Í"] = "í", ["Ó"] = "ó", ["Ô"] = "ô",
  ["Õ"] = "õ", ["Ú"] = "ú",
}

local function minusculas(texto)
  return (texto:lower():gsub("\195[\128-\159]", ACENTUADAS))
end

local arquivo = assert(io.open("texto.txt", "r"))
local texto = minusculas(arquivo:read("a"))
arquivo:close()

local palavras = {}
for palavra in texto:gmatch(LETRAS) do
  palavras[#palavras + 1] = palavra
end

-- Conta: contagem["pão"] = 5
local contagem = {}
for _, palavra in ipairs(palavras) do
  contagem[palavra] = (contagem[palavra] or 0) + 1
end

-- Passa para uma lista, para poder ordenar (a ordem do pairs não serve).
local lista = {}
for palavra, n in pairs(contagem) do
  lista[#lista + 1] = { palavra = palavra, n = n }
end
-- ordene a lista: mais vezes primeiro; empate, ordem alfabética

print(string.format("%d palavras, %d diferentes.", #palavras, #lista))
for i = 1, math.min(10, #lista) do
  print(string.format("%2d. %-8s %d", i, lista[i].palavra, lista[i].n))
end
```

- editor (código de saída 0):

```
72 palavras, 40 diferentes.
 1. abre     2
 2. a        5
 3. está    1
 4. seis     1
 5. bairro   2
 6. forte    1
 7. amanhã  1
 8. horas    1
 9. padaria  2
10. anda     1
```
- lab, lua (código de saída 0):

```
72 palavras, 40 diferentes.
 1. já      1
 2. há      2
 3. pão     5
 4. animada  1
 5. não     2
 6. abre     2
 7. fila     3
 8. leva     2
 9. o        5
10. novo     1
```
<!-- /pagina:projeto-palavras.html -->

<!-- pagina:simulador-teste-interno.html -->
### simulador-teste-interno.html (2026-10-18 20:40 UTC)

**caixa 10, código inicial (linha 174)** — saída diferente: + total 4 | + -rw-rw-r-- 1 ana ana 227 Oct 18 17:40 main.lua | + true	exit	0 | - sh: 1: ls: not found (esperado: comandos do sistema (os.execute/io.popen: no navegador não há outros programas); informações do sistema (os.execute, io.popen, os.getenv))

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
-rw-rw-r-- 1 ana ana 227 Oct 18 17:40 main.lua
true	exit	0
nil	exit	3
true	exit	0
dom. 18 out 2026 17:40:12 -03

true	exit	0
/home/ana	ana	nil
```

**caixa 11, código inicial (linha 187)** — saída diferente: + true	1	0.77344270768769385 | - true	5	0.5480124738675568 (esperado: data, hora e tempo medido; informações do sistema (os.execute, io.popen, os.getenv))

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
true	2026-10-18 17:40:12	-0300 -03
00:00	1767279600
true	5	0.5480124738675568
50	76
true
oi
C
```
- lab, lua (código de saída 0):

```
true	2026-10-18 17:40:12	-0300 -03
00:00	1767279600
true	1	0.77344270768769385
50	76
true
oi
C
```

**caixa 12, código inicial (linha 202)** — saída diferente: + false	table: 0x559a3f5acd10 | - false	table: 0x80eb80 | + false	not enough memory | - false	resulting string too large (esperado: endereços de memória (table: 0x…, function: 0x…); limites de memória (o editor é WebAssembly de 32 bits, com no máximo 256 MB); memória usada (o editor é de 32 bits: números menores))

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
false	table: 0x559a3f5acd10
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

**caixa 15, código inicial (linha 239)** — saída diferente: + Pensei num número (sorteado: 510) | + pairs começa por	chave16 | - Pensei num número (sorteado: 239) | - pairs começa por	chave3 (esperado: números sorteados sem math.randomseed(N); ordem do pairs/next (chaves de texto: muda a cada execução))

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
Pensei num número (sorteado: 239)
pairs começa por	chave3
Número: dobro:	20
Número: Isso não é um número.
Número: dobro:	10
Número: tchau
```
- lab, lua (código de saída 0):

```
Pensei num número (sorteado: 510)
pairs começa por	chave16
Número: dobro:	20
Número: Isso não é um número.
Número: dobro:	10
Número: tchau
```
<!-- /pagina:simulador-teste-interno.html -->

<!-- pagina:simulador.html -->
### simulador.html (2026-10-18 20:40 UTC)

**caixa 10, código inicial (linha 345)** — saída diferente: + main.lua | + true	exit	0 | - sh: 1: ls: not found | - nil	exit	127 (esperado: comandos do sistema (os.execute/io.popen: no navegador não há outros programas); informações do sistema (os.execute, io.popen, os.getenv))

```lua
print(os.execute("ls"))
```

- editor (código de saída 0):

```
sh: 1: ls: not found
nil	exit	127
```
- lab, lua (código de saída 0):

```
main.lua
true	exit	0
```
<!-- /pagina:simulador.html -->

<!-- pagina:tabelas.html -->
### tabelas.html (2026-10-18 20:40 UTC)

**caixa 2, código inicial (linha 330)** — saída diferente: + table: 0x55c2582ba6f0 | - table: 0x80e560 (esperado: endereços de memória (table: 0x…, function: 0x…))

```lua
local compras = {"pão", "leite", "café"}
print(compras)
for i = 1, #compras do
  print(i, compras[i])
end
```

- editor (código de saída 0):

```
table: 0x80e560
1	pão
2	leite
3	café
```
- lab, lua (código de saída 0):

```
table: 0x55c2582ba6f0
1	pão
2	leite
3	café
```
<!-- /pagina:tabelas.html -->

<!-- pagina:tostring-call-len.html -->
### tostring-call-len.html (2026-10-18 20:40 UTC)

**caixa 1, código inicial (linha 136)** — saída diferente: + table: 0x55de8d0a0570 | - table: 0x80e9a0 (esperado: endereços de memória (table: 0x…, function: 0x…))

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
table: 0x80e9a0
```
- lab, lua (código de saída 0):

```
table: 0x55de8d0a0570
```
<!-- /pagina:tostring-call-len.html -->
