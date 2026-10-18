/* motor-node.mjs — o motor do editor (assets/lua/motor.mjs + lua.wasm) rodando no Node 24.
   Usado por tools/sim.js e tools/testar-missoes.js: o mesmo lua.wasm e o mesmo
   código que o navegador usa, num worker_thread (para poder parar um laço infinito).

   import { abrirMotor } from "./motor-node.mjs";
   const m = await abrirMotor();            // { info, rodar(req, opc), fechar() }
   const r = await m.rodar({ arquivos:[{nome:"main.lua", codigo:"print(1)\n"}], stdin:null },
                           { digitar: ["Ana"], tempo: 10000, aoSaida(t, s) {} });
   r = { saida, segs:[{t,s}], eco, exit, excecao, traceback, arquivos, interrompido, motivo, ms, modo }
*/
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { fileURLToPath, pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
export const RAIZ = path.resolve(AQUI, "..");
const LUA = path.join(RAIZ, "assets", "lua");

if (!isMainThread && workerData && workerData.guiaMotor) {
  // ---------- dentro do worker ----------
  const { servirMotor } = await import(pathToFileURL(path.join(LUA, "motor.mjs")).href);
  await servirMotor({
    modulo: WebAssembly.compile(fs.readFileSync(path.join(LUA, "lua.wasm"))),
    jspi: workerData.jspi,
    enviar: (m) => parentPort.postMessage(m),
    aoReceber: (f) => parentPort.on("message", f),
  });
}

export async function abrirMotor(opc = {}) {
  // o fuso do "navegador" no Node: o do lab (America/Sao_Paulo), se ninguém escolheu outro (TZ=…)
  if (!process.env.TZ) process.env.TZ = opc.tz || "America/Sao_Paulo";
  let w = null, info = null, seq = 0;
  async function iniciar() {
    w = new Worker(fileURLToPath(import.meta.url), { workerData: { guiaMotor: true, jspi: opc.jspi !== false }, stdout: true, stderr: true });
    w.stdout.on("data", () => {}); w.stderr.on("data", (d) => { if (opc.depurar) process.stderr.write(d); });
    info = await new Promise((ok, falha) => {
      const f = (m) => { if (m.ev === "pronto") { w.off("message", f); ok(m.info); } else if (m.ev === "falha") falha(new Error(m.msg)); };
      w.on("message", f);
      w.once("error", falha);
    });
  }
  await iniciar();

  /* opc: { digitar: [linhas] (o leitor digitando; null = sem teclado: fim de entrada),
            tempo: ms (limite, sem contar a espera pelo teclado), aoSaida(t, s), aoEspera(), aoEco(texto) } */
  async function rodar(req, o = {}) {
    if (!w) await iniciar();
    const id = ++seq, segs = [], t0 = Date.now();
    const digitar = o.digitar ? o.digitar.slice() : [];
    const limite = o.tempo || 10000;
    const eco = [];
    return await new Promise((ok) => {
      let fim = false;
      const relogio = setInterval(() => {
        if (Date.now() - t0 > limite) terminar({ interrompido: true, motivo: "tempo" });
      }, 100);
      function terminar(extra) {
        if (fim) return;
        fim = true; clearInterval(relogio);
        const ms = Date.now() - t0;
        const acabar = () => {
          const saida = segs.map((x) => x.s).join("");
          ok(Object.assign({ saida, segs, eco, ms, interrompido: false }, extra));
        };
        if (!extra.interrompido) { w.off("message", ouvir); acabar(); return; }
        // encerra o worker, mas ainda recebe a saída que ele mandou antes de morrer
        const morto = w; w = null;
        morto.terminate().then(() => setTimeout(() => { morto.off("message", ouvir); acabar(); }, 20));
      }
      function ouvir(m) {
        if (fim && m.ev !== "saida") return;
        if (m.id !== id) { if (m.ev === "falha" && !m.id) terminar({ interrompido: true, motivo: "falha", msg: m.msg }); return; }
        if (m.ev === "saida") {
          for (const p of m.partes) {
            const u = segs[segs.length - 1];
            if (u && u.t === p.t) u.s += p.s; else segs.push({ t: p.t, s: p.s });
            if (o.aoSaida) o.aoSaida(p.t, p.s);
          }
        } else if (m.ev === "eco") { eco.push(m.texto); if (o.aoEco) o.aoEco(m.texto); }
        else if (m.ev === "espera") {
          if (o.aoEspera) o.aoEspera();
          if (o.digitar && digitar.length) { const l = digitar.shift(); const e = l + "\n"; eco.push(e); if (o.aoEco) o.aoEco(e); w.postMessage({ op: "entrada", texto: l + "\n" }); }
          else w.postMessage({ op: "eof" });
        } else if (m.ev === "limite") terminar({ interrompido: true, motivo: "limite" });
        else if (m.ev === "fim") terminar(Object.assign({}, m.res));
        else if (m.ev === "falha") terminar({ interrompido: true, motivo: "falha", msg: m.msg });
      }
      w.on("message", ouvir);
      w.postMessage({ op: "executar", id, req });
    });
  }
  return {
    get info() { return info; },
    rodar,
    async fechar() { if (w) { await w.terminate(); w = null; } },
  };
}
