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
