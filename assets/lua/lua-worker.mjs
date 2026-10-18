/* lua-worker.mjs — o Web Worker do editor do Guia Lua (module worker).
   Baixa o lua.wasm desta pasta (o interpretador oficial do Lua 5.5 em WebAssembly),
   compila uma vez e atende o assets/luasim.js (protocolo em motor.mjs).
   Cada Rodar cria uma instância nova do lua.wasm: memória, variáveis e arquivos
   partem do zero, como um "lua main.lua" novo no terminal. */
import { servirMotor } from "./motor.mjs";

const AQUI = new URL("./", import.meta.url).href;
let aoReceber = null, guardadas = [], pedirModulo;
const modulo = new Promise((ok, falha) => { pedirModulo = { ok, falha }; });

async function baixar(total, versao) {
  const r = await fetch(AQUI + "lua.wasm" + (versao ? "?v=" + encodeURIComponent(versao) : ""));
  if (!r.ok) throw new Error("Não consegui baixar o Lua (" + r.status + ")");
  let lidos = 0, ultimo = 0;
  const partes = [];
  if (r.body && r.body.getReader) {
    const leitor = r.body.getReader();
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      partes.push(value); lidos += value.byteLength;
      const agora = Date.now();
      if (agora - ultimo > 100) { ultimo = agora; self.postMessage({ ev: "progresso", lidos, total }); }
    }
  } else partes.push(new Uint8Array(await r.arrayBuffer()));
  const b = new Uint8Array(partes.reduce((s, p) => s + p.byteLength, 0));
  let o = 0; for (const p of partes) { b.set(p, o); o += p.byteLength; }
  self.postMessage({ ev: "progresso", lidos: b.length, total: b.length });
  return WebAssembly.compile(b);
}

self.onmessage = function (e) {
  const m = e.data;
  if (m && m.op === "carregar") { baixar(m.total || 0, m.versao).then(pedirModulo.ok, pedirModulo.falha); return; }
  if (aoReceber) aoReceber(m); else guardadas.push(m);
};
servirMotor({
  modulo,
  enviar: (m) => self.postMessage(m),
  aoReceber: (f) => { aoReceber = f; const g = guardadas; guardadas = []; g.forEach(f); },
}).catch(function (e) {
  self.postMessage({ ev: "falha", msg: String((e && e.message) || e) });
});
