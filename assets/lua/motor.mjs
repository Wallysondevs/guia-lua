/* =====================================================================
   motor.mjs — o "lua main.lua" do editor do Guia Lua.
   O MESMO código roda no navegador (Web Worker assets/lua/lua-worker.mjs)
   e no Node (worker_thread de tools/motor-node.mjs: tools/sim.js e
   tools/testar-missoes.js), então o testador roda os programas exatamente
   como o editor.

   lua.wasm é o interpretador oficial (lua.c + biblioteca de lua.org 5.5.0)
   compilado para WebAssembly WASI preview1 (tools/construir-lua.sh). Este
   arquivo é o "Linux" dele: argumentos, variáveis de ambiente da Ana, um
   sistema de arquivos em memória (/home/ana com as abas, /tmp), o terminal
   (stdout com buffer de linha, stderr), o teclado (stdin) linha por linha,
   o relógio e o fuso do navegador.

   Protocolo (mensagens):
     para o motor:  {op:"executar", id, req} | {op:"entrada", texto} | {op:"eof"}
     do motor:      {ev:"pronto", info} | {ev:"saida", id, partes:[{t:"out"|"err", s}]}
                    {ev:"eco", id, texto}     (linha do data-stdin que o programa leu)
                    {ev:"espera", id}         (o programa quer uma linha do teclado)
                    {ev:"limite", id}         (saída grande demais: o dono encerra o worker)
                    {ev:"fim", id, res}  |  {ev:"falha", id, msg}
   req = { arquivos:[{nome, codigo}], args:[…], stdin: texto|null, repl: bool,
           modo: "texto"|"jspi"|"repeticao"|"auto", conferir:[nomes], semente }
   res = { exit, excecao: bool (o lua escreveu "lua: …"), tipo: null, traceback,
           arquivos:{nome: texto|null}, modo, repeticoes, sinal, detalhe }
   ===================================================================== */

export const HOME = "/home/ana";
export const LIMITE_SAIDA = 2000000; // caracteres de saída por execução
// as variáveis de ambiente do lab (env no terminal da Ana); o TZ é o fuso do leitor (o relógio do editor)
export const AMBIENTE = {
  EDITOR: "nano", HOME: HOME, LANG: "pt_BR.UTF-8", LANGUAGE: "pt_BR:pt:en", LOGNAME: "ana",
  PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin", PWD: HOME, SHELL: "/bin/bash",
  SHLVL: "1", TERM: "xterm-256color", TERMINFO: "/usr/share/terminfo", TZ: "America/Sao_Paulo", USER: "ana",
  _: "/usr/bin/lua",
};
function ambiente() {
  const a = Object.assign({}, AMBIENTE);
  try { const z = Intl.DateTimeFormat().resolvedOptions().timeZone; if (z) a.TZ = z; } catch (e) { /* fica o do lab */ }
  return a;
}

const enc = new TextEncoder();

/* ---------------------------------------------------------------------
   1. O teclado: linhas já conhecidas (data-stdin ou já digitadas) e,
      quando acabam, "fim de entrada" (null) ou "ainda não" (undefined).
   --------------------------------------------------------------------- */
export function criarEntrada(opts) {
  const fila = [];
  let eof = !!opts.eof, esperando = false, quemEspera = null;
  function adicionar(texto, digitada) {
    for (const p of String(texto).split(/(?<=\n)/)) if (p !== "") fila.push({ linha: p, digitada: !!digitada });
  }
  if (opts.linhas) for (const l of opts.linhas) adicionar(l, true);
  if (opts.texto !== null && opts.texto !== undefined) { adicionar(opts.texto, false); eof = true; }
  let atual = null, k = 0;
  return {
    /** até max bytes de UMA linha; null = fim de arquivo; undefined = esperar */
    ler(max) {
      if (!atual || k >= atual.length) {
        if (!fila.length) {
          if (eof) return null;
          if (!esperando) { esperando = true; if (opts.aoEspera) opts.aoEspera(); }
          return undefined;
        }
        const it = fila.shift();
        atual = enc.encode(it.linha); k = 0; esperando = false;
        if (!it.digitada && opts.aoEco) opts.aoEco(it.linha);
        if (it.digitada && opts.aoLida) opts.aoLida(it.linha);
      }
      const n = Math.min(max, atual.length - k);
      const r = atual.subarray(k, k + n); k += n;
      return r;
    },
    adicionar(texto) { adicionar(texto, true); const f = quemEspera; quemEspera = null; if (f) f(); },
    fim() { eof = true; const f = quemEspera; quemEspera = null; if (f) f(); },
    esperar() { return new Promise((ok) => { quemEspera = ok; }); },
  };
}

/* ---------------------------------------------------------------------
   2. O disco da "máquina da Ana": /home/ana com as abas, /tmp, /etc/hostname.
   --------------------------------------------------------------------- */
let inodeSeq = 100;
function novoArq(dados) { return { tipo: "arq", dados: dados || new Uint8Array(0), ino: ++inodeSeq, mtime: BigInt(Date.now()) * 1000000n }; }
function novaPasta() { return { tipo: "dir", filhos: new Map(), ino: ++inodeSeq, mtime: BigInt(Date.now()) * 1000000n }; }

export function criarDisco(arquivos) {
  const raiz = novaPasta();
  const mk = (caminho) => {
    let d = raiz;
    for (const p of caminho.split("/").filter(Boolean)) {
      if (!d.filhos.has(p)) d.filhos.set(p, novaPasta());
      d = d.filhos.get(p);
    }
    return d;
  };
  mk("/tmp"); mk("/usr/bin"); mk("/etc");
  raiz.filhos.get("etc").filhos.set("hostname", novoArq(enc.encode("notebook\n")));
  const casa = mk(HOME);
  for (const a of arquivos || []) {
    const partes = a.nome.replace(/^\/+/, "").split("/").filter(Boolean);
    let d = a.nome.startsWith("/") ? raiz : casa;
    for (let i = 0; i < partes.length - 1; i++) { if (!d.filhos.has(partes[i])) d.filhos.set(partes[i], novaPasta()); d = d.filhos.get(partes[i]); }
    d.filhos.set(partes[partes.length - 1], novoArq(typeof a.codigo === "string" ? enc.encode(a.codigo) : a.codigo));
  }
  return raiz;
}

/** conteúdo (texto) de um arquivo do disco, relativo a /home/ana; null se não existe */
export function lerDoDisco(disco, nome) {
  let d = disco;
  const partes = (nome.startsWith("/") ? nome : HOME + "/" + nome).split("/").filter((p) => p && p !== ".");
  for (const p of partes) {
    if (!d || d.tipo !== "dir") return null;
    d = d.filhos.get(p);
  }
  if (!d || d.tipo !== "arq") return null;
  return new TextDecoder("utf-8", { fatal: false }).decode(d.dados);
}

/* ---------------------------------------------------------------------
   3. O fuso horário: o do navegador do leitor (no Node: o TZ do processo)
   --------------------------------------------------------------------- */
function fusoDe(t) {
  const d = new Date(t * 1000);
  return isNaN(d.getTime()) ? 0 : -d.getTimezoneOffset() * 60;
}
function veraoDe(t) {
  const d = new Date(t * 1000);
  if (isNaN(d.getTime())) return 0;
  const a = d.getFullYear();
  const jan = -new Date(a, 0, 1).getTimezoneOffset(), jul = -new Date(a, 6, 1).getTimezoneOffset();
  return jan !== jul && fusoDe(t) / 60 > Math.min(jan, jul) ? 1 : 0;
}
const p2 = (n) => String(n).padStart(2, "0");
let fmtFuso = null;
const coladores = {};
function nomeFusoDe(t) {
  const off = fusoDe(t);
  let n = "";
  try {
    const d = new Date(t * 1000);
    if (!isNaN(d.getTime())) {
      fmtFuso = fmtFuso || new Intl.DateTimeFormat("en-US", { timeZoneName: "short" });
      const p = fmtFuso.formatToParts(d).find((x) => x.type === "timeZoneName");
      n = p ? p.value : "";
    }
  } catch (e) { n = ""; }
  if (/^[A-Z]{2,5}$/.test(n) && n !== "GMT") return n;         // EST, PDT, UTC…
  if (off === 0) return "UTC";
  const s = off < 0 ? "-" : "+", a = Math.abs(off), h = Math.floor(a / 3600), m = Math.floor((a % 3600) / 60);
  return s + p2(h) + (m ? p2(m) : "");                            // "-03", como no tzdata
}

/* ---------------------------------------------------------------------
   4. Rodar o lua.wasm (WASI preview1)
   --------------------------------------------------------------------- */
export class SaidaPrograma { constructor(code) { this.code = code; } }
export class PrecisaEntrada { }
export class LimiteSaida { }

const E = { SUCCESS: 0, ACCES: 2, AGAIN: 6, BADF: 8, EXIST: 20, INVAL: 28, IO: 29, ISDIR: 31, NAMETOOLONG: 37, NOENT: 44, NOSYS: 52, NOTDIR: 54, NOTEMPTY: 55, NOTSUP: 58, PERM: 63, SPIPE: 70, NOTCAPABLE: 76 };
const FT = { UNKNOWN: 0, CHAR: 2, DIR: 3, FILE: 4 };
const TODOS_DIREITOS = 0x1fffffffn;
const DIREITOS_TTY = (1n << 1n) | (1n << 3n) | (1n << 6n) | (1n << 21n) | (1n << 27n);

/** gerador de bytes "aleatórios" repetível (modo por repetição) */
export function sorteador(semente) {
  let s = (semente >>> 0) || 0x9e3779b9;
  return (b) => {
    for (let i = 0; i < b.length; i++) {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      b[i] = ((t ^ (t >>> 14)) >>> 0) & 255;
    }
  };
}

/**
 * modulo: WebAssembly.Module do lua.wasm.
 * opts: { args: ["lua", "main.lua", …], env, disco, entrada, aoSaida(t, Uint8Array),
 *         jspi, limiteSaida, relogio: { base: ms do relógio no começo } , aleatorio(Uint8Array) }
 * → { exit, erro: bool, msgErro: Uint8Array, sinal, detalhe }   (lança PrecisaEntrada / LimiteSaida)
 */
export async function rodarLua(modulo, opts) {
  const args = opts.args || ["lua"];
  const env = Object.entries(opts.env || ambiente()).map(([k, v]) => k + "=" + v);
  const disco = opts.disco || criarDisco([]);
  const entrada = opts.entrada || criarEntrada({ texto: "" });
  const jspi = !!opts.jspi && typeof WebAssembly.Suspending === "function";
  const stdinTty = opts.stdinTty !== false; // texto do data-stdin = "lua main.lua < entrada.txt" (não é terminal)
  const limite = opts.limiteSaida || LIMITE_SAIDA * 4;
  const inicio = performance.now();
  const base = opts.relogio && opts.relogio.base !== undefined ? opts.relogio.base : Date.now();
  let esperou = 0; // ms esperando o teclado (não conta como tempo de CPU)
  let memoria = null, totalSaida = 0, erro = false;
  const msgErro = [];
  const mem = () => new DataView(memoria.buffer);
  const bytes = () => new Uint8Array(memoria.buffer);
  const lerStr = (p, n) => new TextDecoder().decode(bytes().slice(p, p + n));
  const aleatorio = opts.aleatorio || ((b) => { for (let o = 0; o < b.length; o += 65536) crypto.getRandomValues(b.subarray(o, Math.min(b.length, o + 65536))); });

  const fds = new Map();
  fds.set(0, { tipo: "tty", fd: 0 });
  fds.set(1, { tipo: "tty", fd: 1 });
  fds.set(2, { tipo: "tty", fd: 2 });
  fds.set(3, { tipo: "dir", no: disco, caminho: "/", preaberto: true });
  let proxFd = 4;

  function resolver(dirFd, caminho, criarPai) {
    const b = fds.get(dirFd);
    if (!b || b.tipo !== "dir") return { erro: E.BADF };
    const partes = caminho.split("/").filter((p) => p !== "" && p !== ".");
    const pilha = [b.no];
    if (caminho.startsWith("/")) pilha.length = 1, pilha[0] = disco;
    for (let i = 0; i < partes.length - 1; i++) {
      const p = partes[i];
      if (p === "..") { if (pilha.length > 1) pilha.pop(); continue; }
      const atual = pilha[pilha.length - 1];
      if (atual.tipo !== "dir") return { erro: E.NOTDIR };
      let prox = atual.filhos.get(p);
      if (!prox) { if (criarPai) { prox = novaPasta(); atual.filhos.set(p, prox); } else return { erro: E.NOENT }; }
      pilha.push(prox);
    }
    let nome = partes.length ? partes[partes.length - 1] : ".";
    let pai = pilha[pilha.length - 1];
    if (nome === "..") { if (pilha.length > 1) pilha.pop(); pai = pilha.length > 1 ? pilha[pilha.length - 2] : pilha[0]; return { pai, nome: ".", no: pilha[pilha.length - 1] }; }
    if (pai.tipo !== "dir") return { erro: E.NOTDIR };
    const no = nome === "." ? pai : pai.filhos.get(nome);
    return { pai, nome, no };
  }

  function escreverFilestat(p, no) {
    const v = mem();
    v.setBigUint64(p, 1n, true);
    v.setBigUint64(p + 8, BigInt(no.ino || 1), true);
    v.setUint8(p + 16, no.tipo === "dir" ? FT.DIR : no.tipo === "arq" ? FT.FILE : FT.CHAR);
    v.setBigUint64(p + 24, 1n, true);
    v.setBigUint64(p + 32, BigInt(no.tipo === "arq" ? no.dados.length : 0), true);
    const t = no.mtime || 0n;
    v.setBigUint64(p + 40, t, true); v.setBigUint64(p + 48, t, true); v.setBigUint64(p + 56, t, true);
  }

  function saida(fd, b) {
    if (erro && fd === 2) msgErro.push(b.slice());
    if (totalSaida + b.length > limite) {
      const resto = Math.max(0, limite - totalSaida);
      if (resto) opts.aoSaida(fd === 2 ? "err" : "out", b.slice(0, resto));
      totalSaida = limite;
      throw new LimiteSaida();
    }
    totalSaida += b.length;
    opts.aoSaida(fd === 2 ? "err" : "out", b.slice());
  }
  function iovecs(iovs, n) {
    const v = mem(), r = [];
    for (let i = 0; i < n; i++) r.push([v.getUint32(iovs + i * 8, true), v.getUint32(iovs + i * 8 + 4, true)]);
    return r;
  }
  function lerStdinSinc(iovs, n, pLidos) {
    let total = 0;
    for (const [p, len] of iovecs(iovs, n)) {
      if (!len) continue;
      const r = entrada.ler(len);
      if (r === undefined) { if (total) break; return undefined; }
      if (r === null) break;
      bytes().set(r, p); total += r.length;
      break; // no máximo uma linha por leitura, como o terminal
    }
    mem().setUint32(pLidos, total, true);
    return E.SUCCESS;
  }
  function tocar(no) { no.mtime = BigInt(Date.now()) * 1000000n; }
  // arquivo que cresce: buffer com folga (no.buf), para muitos io.write não copiarem tudo a cada vez
  function gravar(no, pos, b) {
    const fim = pos + b.length;
    if (fim > no.dados.length) {
      let buf = no.buf;
      if (!buf || no.dados.buffer !== buf.buffer || no.dados.byteOffset !== 0 || fim > buf.length) {
        buf = new Uint8Array(Math.max(fim, 2 * (buf && no.dados.buffer === buf.buffer ? buf.length : no.dados.length), 256));
        buf.set(no.dados); no.buf = buf;
      }
      no.dados = buf.subarray(0, fim);
    }
    no.dados.set(b, pos); tocar(no);
  }

  const wasi = {
    args_sizes_get(pc, pt) { mem().setUint32(pc, args.length, true); mem().setUint32(pt, args.reduce((s, a) => s + enc.encode(a).length + 1, 0), true); return 0; },
    args_get(pv, pb) { let o = pb; args.forEach((a, i) => { mem().setUint32(pv + i * 4, o, true); const b = enc.encode(a + "\0"); bytes().set(b, o); o += b.length; }); return 0; },
    environ_sizes_get(pc, pt) { mem().setUint32(pc, env.length, true); mem().setUint32(pt, env.reduce((s, a) => s + enc.encode(a).length + 1, 0), true); return 0; },
    environ_get(pv, pb) { let o = pb; env.forEach((a, i) => { mem().setUint32(pv + i * 4, o, true); const b = enc.encode(a + "\0"); bytes().set(b, o); o += b.length; }); return 0; },
    clock_res_get(id, p) { mem().setBigUint64(p, 1000n, true); return 0; },
    clock_time_get(id, prec, p) {
      const agora = performance.now();
      let ms;
      if (id === 0) ms = base + (agora - inicio);                 // relógio (os.time, os.date)
      else if (id === 1) ms = agora;                             // monotônico
      else ms = Math.max(0, agora - inicio - esperou);           // tempo de CPU (os.clock): sem a espera pelo teclado
      mem().setBigUint64(p, BigInt(Math.floor(ms * 1e6)), true); return 0;
    },
    fd_write(fd, iovs, n, pEscritos) {
      const f = fds.get(fd);
      if (!f) return E.BADF;
      let total = 0;
      if (f.tipo === "tty") {
        if (fd === 0) return E.BADF;
        const partes = iovecs(iovs, n).filter(([, l]) => l);
        let tam = 0; partes.forEach(([, l]) => { tam += l; });
        const b = new Uint8Array(tam); let o = 0;
        for (const [p, l] of partes) { b.set(bytes().subarray(p, p + l), o); o += l; }
        if (tam) saida(f.fd, b);
        total = tam;
      } else if (f.tipo === "arq") {
        if (!f.escrita) return E.BADF;
        for (const [p, l] of iovecs(iovs, n)) {
          if (!l) continue;
          if (f.append) f.pos = f.no.dados.length;
          gravar(f.no, f.pos, bytes().subarray(p, p + l)); f.pos += l; total += l;
        }
      } else return E.ISDIR;
      mem().setUint32(pEscritos, total, true);
      return 0;
    },
    fd_read(fd, iovs, n, pLidos) {
      const f = fds.get(fd);
      if (!f) return E.BADF;
      if (f.tipo === "tty") {
        if (f.fd !== 0) return E.BADF;
        const r = lerStdinSinc(iovs, n, pLidos);
        if (r !== undefined) return r;
        if (!jspi) throw new PrecisaEntrada();
        const t0 = performance.now();
        return entrada.esperar().then(() => { esperou += performance.now() - t0; return wasi.fd_read(fd, iovs, n, pLidos); });
      }
      if (f.tipo !== "arq") return E.ISDIR;
      if (!f.leitura) return E.BADF;
      let total = 0;
      for (const [p, l] of iovecs(iovs, n)) {
        const d = f.no.dados, k = Math.min(l, Math.max(0, d.length - f.pos));
        if (k > 0) { bytes().set(d.subarray(f.pos, f.pos + k), p); f.pos += k; total += k; }
        if (k < l) break;
      }
      mem().setUint32(pLidos, total, true); return 0;
    },
    fd_seek(fd, off, whence, pNovo) {
      const f = fds.get(fd);
      if (!f) return E.BADF;
      if (f.tipo !== "arq") return f.tipo === "tty" ? E.SPIPE : E.ISDIR;
      const b = whence === 0 ? 0 : whence === 1 ? f.pos : f.no.dados.length;
      const novo = b + Number(off);
      if (novo < 0) return E.INVAL;
      f.pos = novo;
      mem().setBigUint64(pNovo, BigInt(novo), true); return 0;
    },
    fd_tell(fd, p) { const f = fds.get(fd); if (!f) return E.BADF; if (f.tipo !== "arq") return E.SPIPE; mem().setBigUint64(p, BigInt(f.pos), true); return 0; },
    fd_close(fd) { if (!fds.has(fd)) return E.BADF; if (fd > 3) fds.delete(fd); return 0; },
    fd_sync() { return 0; }, fd_datasync() { return 0; }, fd_advise() { return 0; },
    fd_fdstat_get(fd, p) {
      const f = fds.get(fd);
      if (!f) return E.BADF;
      const v = mem();
      v.setUint8(p, f.tipo === "tty" ? (f.fd === 0 && !stdinTty ? FT.UNKNOWN : FT.CHAR) : f.tipo === "dir" ? FT.DIR : FT.FILE);
      v.setUint16(p + 2, f.append ? 1 : 0, true);
      v.setBigUint64(p + 8, f.tipo === "tty" ? DIREITOS_TTY : TODOS_DIREITOS, true);
      v.setBigUint64(p + 16, f.tipo === "tty" ? 0n : TODOS_DIREITOS, true);
      return 0;
    },
    fd_fdstat_set_flags(fd, flags) { const f = fds.get(fd); if (!f) return E.BADF; f.append = !!(flags & 1); return 0; },
    fd_filestat_get(fd, p) {
      const f = fds.get(fd);
      if (!f) return E.BADF;
      escreverFilestat(p, f.tipo === "tty" ? { tipo: "tty", ino: 1 + fd } : f.no);
      return 0;
    },
    fd_filestat_set_size(fd, tam) {
      const f = fds.get(fd);
      if (!f || f.tipo !== "arq") return E.BADF;
      const n = Number(tam), d = new Uint8Array(n); d.set(f.no.dados.subarray(0, n)); f.no.dados = d; tocar(f.no); return 0;
    },
    fd_prestat_get(fd, p) {
      const f = fds.get(fd);
      if (!f || !f.preaberto) return E.BADF;
      mem().setUint8(p, 0); mem().setUint32(p + 4, enc.encode(f.caminho).length, true); return 0;
    },
    fd_prestat_dir_name(fd, p, n) {
      const f = fds.get(fd);
      if (!f || !f.preaberto) return E.BADF;
      bytes().set(enc.encode(f.caminho).subarray(0, n), p); return 0;
    },
    fd_renumber(de, para) { const f = fds.get(de); if (!f) return E.BADF; fds.set(para, f); fds.delete(de); return 0; },
    path_open(dirFd, dirflags, p, n, oflags, rBase, rInh, fdflags, pFd) {
      const caminho = lerStr(p, n);
      const r = resolver(dirFd, caminho, false);
      if (r.erro) return r.erro;
      let no = r.no;
      const criar = oflags & 1, soDir = oflags & 2, excl = oflags & 4, trunc = oflags & 8;
      if (no && criar && excl) return E.EXIST;
      if (!no) {
        if (!criar) return E.NOENT;
        if (r.pai.tipo !== "dir") return E.NOTDIR;
        no = novoArq(); r.pai.filhos.set(r.nome, no);
      }
      if (soDir && no.tipo !== "dir") return E.NOTDIR;
      const direitos = BigInt(rBase);
      const escrita = (direitos & ((1n << 6n) | (1n << 4n))) !== 0n;
      if (no.tipo === "dir") {
        if (escrita && !soDir && (oflags & 9)) return E.ISDIR;
        const fd = proxFd++; fds.set(fd, { tipo: "dir", no, caminho });
        mem().setUint32(pFd, fd, true); return 0;
      }
      if (trunc) { no.dados = new Uint8Array(0); tocar(no); }
      const fd = proxFd++;
      fds.set(fd, { tipo: "arq", no, pos: 0, leitura: (direitos & 2n) !== 0n, escrita, append: !!(fdflags & 1) });
      mem().setUint32(pFd, fd, true); return 0;
    },
    path_create_directory(dirFd, p, n) {
      const r = resolver(dirFd, lerStr(p, n), false);
      if (r.erro) return r.erro;
      if (r.no) return E.EXIST;
      r.pai.filhos.set(r.nome, novaPasta()); return 0;
    },
    path_filestat_get(dirFd, flags, p, n, pSt) {
      const r = resolver(dirFd, lerStr(p, n), false);
      if (r.erro) return r.erro;
      if (!r.no) return E.NOENT;
      escreverFilestat(pSt, r.no); return 0;
    },
    path_filestat_set_times() { return 0; },
    path_remove_directory(dirFd, p, n) {
      const r = resolver(dirFd, lerStr(p, n), false);
      if (r.erro) return r.erro;
      if (!r.no) return E.NOENT;
      if (r.no.tipo !== "dir") return E.NOTDIR;
      if (r.no.filhos.size) return E.NOTEMPTY;
      r.pai.filhos.delete(r.nome); return 0;
    },
    path_unlink_file(dirFd, p, n) {
      const r = resolver(dirFd, lerStr(p, n), false);
      if (r.erro) return r.erro;
      if (!r.no) return E.NOENT;
      if (r.no.tipo === "dir") return E.ISDIR;
      r.pai.filhos.delete(r.nome); return 0;
    },
    path_rename(fd1, p1, n1, fd2, p2_, n2) {
      const a = resolver(fd1, lerStr(p1, n1), false), b = resolver(fd2, lerStr(p2_, n2), false);
      if (a.erro) return a.erro; if (b.erro) return b.erro;
      if (!a.no) return E.NOENT;
      if (b.no && b.no.tipo === "dir" && b.no.filhos.size) return E.NOTEMPTY;
      if (b.no && b.no.tipo === "dir" && a.no.tipo !== "dir") return E.ISDIR;
      a.pai.filhos.delete(a.nome); b.pai.filhos.set(b.nome, a.no); return 0;
    },
    path_link() { return E.NOTSUP; }, path_symlink() { return E.NOTSUP; }, path_readlink() { return E.INVAL; },
    poll_oneoff() { return E.NOTSUP; },
    proc_exit(code) { throw new SaidaPrograma(code); },
    proc_raise(sig) { throw new SaidaPrograma(128 + sig); },
    random_get(p, n) { const b = new Uint8Array(n); aleatorio(b); bytes().set(b, p); return 0; },
    sched_yield() { return 0; },
  };

  const guia = {
    erro() { erro = true; },
    fuso: (t) => fusoDe(t),
    verao: (t) => veraoDe(t),
    // os.setlocale(…, "collate") com pt_BR/pt_PT (2) ou en_US (1): a ordem do idioma (como o glibc)
    comparar(pa, la, pb, lb, id) {
      const d = new TextDecoder();
      const a = d.decode(bytes().subarray(pa, pa + la)), b = d.decode(bytes().subarray(pb, pb + lb));
      const c = coladores[id] || (coladores[id] = new Intl.Collator(id === 2 ? "pt-BR" : "en-US", { ignorePunctuation: true }));
      return c.compare(a, b);
    },
    fuso_nome(t, p, n) { const b = enc.encode(nomeFusoDe(t)).subarray(0, n - 1); bytes().set(b, p); bytes()[p + b.length] = 0; },
  };
  const imports = { wasi_snapshot_preview1: {}, guia };
  for (const imp of WebAssembly.Module.imports(modulo)) {
    if (imp.kind !== "function") continue;
    if (imp.module === "wasi_snapshot_preview1") {
      let f = wasi[imp.name] || (() => E.NOSYS);
      if (jspi && imp.name === "fd_read") f = new WebAssembly.Suspending(f);
      imports.wasi_snapshot_preview1[imp.name] = f;
    } else if (imp.module !== "guia") {
      imports[imp.module] = imports[imp.module] || {};
      imports[imp.module][imp.name] = () => { throw new WebAssembly.RuntimeError("import ausente: " + imp.module + "." + imp.name); };
    }
  }
  const inst = await WebAssembly.instantiate(modulo, imports);
  memoria = inst.exports.memory;
  const iniciar = jspi ? WebAssembly.promising(inst.exports._start) : inst.exports._start;
  const fim = (extra) => Object.assign({ erro, msgErro: juntar(msgErro), sinal: null }, extra);
  try {
    await iniciar();
    return fim({ exit: 0 });
  } catch (e) {
    if (e instanceof SaidaPrograma) return fim({ exit: e.code & 255 });
    if (e instanceof PrecisaEntrada || e instanceof LimiteSaida) throw e;
    const msg = String((e && e.message) || e);
    if (e instanceof WebAssembly.RuntimeError || e instanceof RangeError || /call stack/i.test(msg)) {
      // não deveria acontecer com o Lua (ele mesmo trata pilha e memória);
      // no Linux seria uma falha de segmentação ou um abort
      const sinal = /unreachable/i.test(msg) ? 6 : 11;
      return fim({ exit: 128 + sinal, sinal, detalhe: msg });
    }
    throw e;
  }
}
function juntar(lista) {
  let n = 0; for (const b of lista) n += b.length;
  const r = new Uint8Array(n); let o = 0;
  for (const b of lista) { r.set(b, o); o += b.length; }
  return r;
}

/* ---------------------------------------------------------------------
   5. servirMotor: atende as mensagens (navegador e Node).
   opts = { modulo: Promise<WebAssembly.Module>, enviar(msg), aoReceber(fn), jspi?: bool }
   --------------------------------------------------------------------- */
export async function servirMotor(opts) {
  const enviar = opts.enviar;
  let atual = null;             // execução em andamento
  let entradaViva = null;       // a entrada do modo JSPI (recebe o que o leitor digita)
  let guardadas = [];           // digitado antes de ser pedido
  let carregou;
  let fila = new Promise((ok) => { carregou = ok; });
  opts.aoReceber(function (m) {
    if (m.op === "entrada" || m.op === "eof") {
      if (entradaViva) { if (m.op === "eof") entradaViva.fim(); else entradaViva.adicionar(String(m.texto)); }
      else guardadas.push(m);
      return;
    }
    if (m.op === "executar") fila = fila.then(() => executar(m)).catch((e) => enviar({ ev: "falha", id: m.id, msg: String((e && e.stack) || e) }));
  });

  const modulo = await opts.modulo;
  const temJspi = opts.jspi !== false && typeof WebAssembly.Suspending === "function" && typeof WebAssembly.promising === "function";

  // saída: cada pedaço vai na hora (um laço infinito logo depois pode fazer o dono encerrar o worker)
  let total = 0, estourou = false;
  function paraFila(t, s) {
    if (estourou || !atual) return;
    total += s.length;
    if (total > LIMITE_SAIDA) {
      estourou = true;
      enviar({ ev: "limite", id: atual.id });
      throw new LimiteSaida();
    }
    enviar({ ev: "saida", id: atual.id, partes: [{ t, s }] });
  }

  // "lua main.lua args…"; no modo interativo (req.repl): "lua" (sem programa) ou "lua -i main.lua"
  function argsDe(req) {
    const a = (req.args || []).map(String);
    if (!req.repl) return ["lua", req.arquivos[0].nome].concat(a);
    return req.arquivos[0].codigo.trim() ? ["lua", "-i", req.arquivos[0].nome].concat(a) : ["lua"];
  }

  async function umaVez(req, cfg) {
    // no modo interativo sem programa ("lua"), a pasta não tem o main.lua vazio
    const disco = criarDisco(req.repl && !req.arquivos[0].codigo.trim() ? req.arquivos.slice(1) : req.arquivos);
    const dec = { out: new TextDecoder(), err: new TextDecoder() };
    const r = await rodarLua(modulo, {
      args: argsDe(req),
      disco, entrada: cfg.entrada, jspi: cfg.jspi, relogio: cfg.relogio, aleatorio: cfg.aleatorio, stdinTty: cfg.stdinTty,
      aoSaida: (t, b) => { const s = dec[t].decode(b, { stream: true }); if (s) cfg.saida(t, s); },
    });
    const fimOut = dec.out.decode(), fimErr = dec.err.decode();
    if (fimOut) cfg.saida("out", fimOut);
    if (fimErr) cfg.saida("err", fimErr);
    const arquivos = {};
    for (const nome of req.conferir || []) arquivos[nome] = lerDoDisco(disco, nome);
    return { exit: r.exit, excecao: !!r.erro, tipo: null, traceback: new TextDecoder().decode(r.msgErro), arquivos, sinal: r.sinal, detalhe: r.detalhe || null };
  }

  async function executar(m) {
    const req = Object.assign({}, m.req);
    let modo = req.modo || "auto";
    if (req.stdin !== null && req.stdin !== undefined) modo = "texto";
    else if (modo === "auto") modo = temJspi ? "jspi" : "repeticao";
    if (modo === "jspi" && !temJspi) modo = "repeticao";
    total = 0; estourou = false;
    const semente = req.semente !== undefined && req.semente !== null ? req.semente : Math.floor(Math.random() * 2 ** 31);
    let res, repeticoes = 1;
    try {
      if (modo !== "repeticao") {
        atual = { id: m.id };
        const entrada = criarEntrada({
          texto: modo === "texto" ? (req.stdin || "") : null,
          aoEco: (l) => enviar({ ev: "eco", id: m.id, texto: l }),
          aoEspera: () => enviar({ ev: "espera", id: m.id }),
        });
        if (modo === "jspi") {
          entradaViva = entrada;
          const g = guardadas; guardadas = [];
          for (const x of g) { if (x.op === "eof") entrada.fim(); else entrada.adicionar(String(x.texto)); }
        }
        res = await umaVez(req, { entrada, jspi: modo === "jspi", stdinTty: modo !== "texto", saida: paraFila, aleatorio: req.semente !== undefined && req.semente !== null ? sorteador(semente) : undefined });
      } else {
        // "por repetição" (navegador sem JSPI): roda até pedir uma linha nova; o leitor
        // digita; roda de novo do começo com as linhas já digitadas, mostrando só o que
        // ainda não apareceu. O relógio e os sorteios se repetem iguais a cada vez.
        const linhas = []; let eof = false, mostrado = 0;
        const base = Math.floor(Date.now() / 1000) * 1000;
        repeticoes = 0;
        for (;;) {
          repeticoes++;
          let pos = 0;
          atual = { id: m.id };
          const saida = (t, s) => {
            const ini = pos; pos += s.length;
            if (pos <= mostrado) return;
            const corte = Math.max(0, mostrado - ini);
            mostrado = pos;
            paraFila(t, s.slice(corte));
          };
          const entrada = criarEntrada({ linhas, eof });
          try {
            res = await umaVez(req, { entrada, jspi: false, saida, relogio: { base }, aleatorio: sorteador(semente) });
            break;
          } catch (e) {
            if (!(e instanceof PrecisaEntrada)) throw e;
          }
          enviar({ ev: "espera", id: m.id });
          const l = await new Promise((ok) => {
            const g = guardadas.shift();
            if (g) { ok(g.op === "eof" ? null : String(g.texto)); return; }
            entradaViva = { adicionar: (t) => { entradaViva = null; ok(t); }, fim: () => { entradaViva = null; ok(null); } };
          });
          if (l === null) eof = true; else linhas.push(l);
        }
      }
    } catch (e) {
      if (!(e instanceof LimiteSaida)) throw e;
      res = { exit: null, excecao: false, tipo: null, traceback: "", arquivos: {}, limite: true };
    } finally {
      entradaViva = null; guardadas = [];
    }
    res.modo = modo; res.repeticoes = repeticoes;
    if (estourou) res.limite = true;
    enviar({ ev: "fim", id: m.id, res });
    atual = null;
  }

  // a versão (e um primeiro "lua -v" para aquecer)
  let versao = "";
  await rodarLua(modulo, { args: ["lua", "-v"], aoSaida: (t, b) => { versao += new TextDecoder().decode(b); } });
  carregou();
  const info = { lua: (versao.match(/Lua\s+([\d.]+)/) || [, "?"])[1], versaoCompleta: versao.trim(), jspi: temJspi };
  enviar({ ev: "pronto", info });
  return info;
}
