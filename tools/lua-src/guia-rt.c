/* guia-rt.c — ligado ao lua.wasm do editor do Guia Lua (tools/construir-lua.sh).
   Não muda o Lua; só deixa o WebAssembly (WASI) parecido com o Linux do lab:
   1. o programa roda na pasta /home/ana (onde ficam as abas da caixa);
   2. antes de ler o teclado (stdin), a saída que está no buffer do stdout
      aparece, como na glibc: io.write("Nome: ") e depois io.read() mostram
      "Nome: " antes de esperar (a musl, base da wasi-libc, não faz isso);
   3. os.execute/io.popen: no navegador não há shell nem outros programas.
      Um comando responde como num Linux em que ele não existe:
      "sh: 1: ls: not found" e status 127 (só os comandos internos
      true, false, ":" e exit N do sh funcionam);
   4. os.tmpname: mkstemp("/tmp/lua_XXXXXX"), e io.tmpfile, como no Linux;
   5. os.date/os.time: o fuso horário é o do navegador do leitor
      (a wasi-libc só conhece o UTC). */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <fcntl.h>
#include <unistd.h>
#include <time.h>
#include <sys/types.h>

#define GUIA(n) __attribute__((import_module("guia"), import_name(n)))
GUIA("fuso") int guia_fuso(double t);                       /* segundos a leste do UTC no instante t */
GUIA("verao") int guia_verao(double t);                     /* 1 = horário de verão no instante t */
GUIA("fuso_nome") void guia_fuso_nome(double t, char *buf, int n);

__attribute__((constructor(101))) static void guia_pasta_inicial(void) { (void)chdir("/home/ana"); }

/* ---- 2. stdout aparece antes de ler o teclado ---- */
size_t __real___stdio_read(FILE *f, unsigned char *buf, size_t len);
size_t __wrap___stdio_read(FILE *f, unsigned char *buf, size_t len) {
    if (f == stdin) fflush(stdout);
    return __real___stdio_read(f, buf, len);
}

/* ---- 3. o "sh" do editor ---- */
static int eh_fim_palavra(char c) {
    return c == '\0' || c == ' ' || c == '\t' || c == '\n' || c == ';' || c == '|' || c == '&' || c == '<' || c == '>' || c == '(' || c == ')';
}
/* status no formato do wait() do Linux (WEXITSTATUS = byte de cima) */
static int sh(const char *cmd) {
    char palavra[256];
    size_t n = 0;
    const char *p = cmd;
    while (*p == ' ' || *p == '\t' || *p == '\n') p++;
    while (!eh_fim_palavra(*p)) {
        char c = *p++;
        if (c == '\'' || c == '"') {               /* 'ls' e "ls" viram ls */
            while (*p && *p != c) { if (n < sizeof palavra - 1) palavra[n++] = *p; p++; }
            if (*p) p++;
            continue;
        }
        if (c == '\\' && *p) c = *p++;
        if (n < sizeof palavra - 1) palavra[n++] = c;
    }
    palavra[n] = '\0';
    if (n == 0) return 0;
    if (!strcmp(palavra, "true") || !strcmp(palavra, ":")) return 0;
    if (!strcmp(palavra, "false")) return 1 << 8;
    if (!strcmp(palavra, "exit")) {
        while (*p == ' ' || *p == '\t') p++;
        return (*p >= '0' && *p <= '9') ? ((atoi(p) & 0xff) << 8) : 0;
    }
    fflush(stdout);
    fprintf(stderr, "sh: 1: %s: not found\n", palavra);
    fflush(stderr);
    return 127 << 8;
}

int system(const char *cmd) {
    if (!cmd) return 1; /* "há um shell" (os.execute() devolve true, como no Linux) */
    return sh(cmd);
}

static ssize_t nada_ler(void *c, char *b, size_t n) { (void)c; (void)b; (void)n; return 0; }
static ssize_t nada_escrever(void *c, const char *b, size_t n) { (void)c; (void)b; return (ssize_t)n; }
static int nada_fechar(void *c) { (void)c; return 0; }
static int ultimo_status = 0;

/* io.popen: o comando "roda" (e falha) já ao abrir; ler dá "" e escrever é descartado */
FILE *popen(const char *cmd, const char *modo) {
    cookie_io_functions_t io = { nada_ler, nada_escrever, NULL, nada_fechar };
    ultimo_status = sh(cmd);
    return fopencookie(NULL, modo, io);
}
int pclose(FILE *f) {
    fclose(f);
    return ultimo_status;
}

/* ---- 4. mkstemp ---- */
int mkstemp(char *modelo) {
    static const char letras[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    size_t n = strlen(modelo);
    if (n < 6 || memcmp(modelo + n - 6, "XXXXXX", 6)) { errno = EINVAL; return -1; }
    for (int tentativa = 0; tentativa < 100; tentativa++) {
        unsigned char r[6];
        if (getentropy(r, sizeof r)) return -1;
        for (int i = 0; i < 6; i++) modelo[n - 6 + i] = letras[r[i] % 62];
        int fd = open(modelo, O_RDWR | O_CREAT | O_EXCL, 0600);
        if (fd >= 0 || errno != EEXIST) return fd;
    }
    errno = EEXIST;
    return -1;
}

/* ---- 5. hora local = fuso do navegador ---- */
struct tm *__wrap_localtime_r(const time_t *t, struct tm *r) {
    static char nomes[4][16];
    static int k = 0;
    double tt = (double)*t;
    int off = guia_fuso(tt);
    time_t l = *t + off;
    if (!gmtime_r(&l, r)) return NULL;
    r->tm_gmtoff = off;
    r->tm_isdst = guia_verao(tt);
    char *nome = nomes[k++ & 3];
    guia_fuso_nome(tt, nome, (int)sizeof nomes[0]);
    r->tm_zone = nome;
    return r;
}
struct tm *__wrap_localtime(const time_t *t) {
    static struct tm r;
    return __wrap_localtime_r(t, &r);
}
time_t __wrap_mktime(struct tm *tm) {
    struct tm c = *tm;
    time_t g = timegm(&c);              /* os campos lidos como UTC (e normalizados) */
    if (g == (time_t)-1 && errno) return -1;
    int off = guia_fuso((double)g);
    time_t t = g - off;
    int off2 = guia_fuso((double)t);
    if (off2 != off) t = g - off2;
    if (!__wrap_localtime_r(&t, tm)) return -1;
    return t;
}
/* %Z (nome do fuso): a strftime da wasi-libc só conhece o UTC */
size_t __real_strftime(char *restrict s, size_t n, const char *restrict f, const struct tm *restrict tm);
size_t __wrap_strftime(char *restrict s, size_t n, const char *restrict f, const struct tm *restrict tm) {
    if (!strstr(f, "%Z") || !tm->tm_zone) return __real_strftime(s, n, f, tm);
    char g[512];
    size_t o = 0;
    for (const char *p = f; *p && o < sizeof g - 40; p++) {
        if (p[0] == '%' && p[1] == '%') { g[o++] = '%'; g[o++] = '%'; p++; continue; }
        if (p[0] == '%' && p[1] == 'Z') {
            for (const char *z = tm->tm_zone; *z && o < sizeof g - 40; z++) { if (*z == '%') g[o++] = '%'; g[o++] = *z; }
            p++; continue;
        }
        g[o++] = *p;
    }
    g[o] = '\0';
    return __real_strftime(s, n, g, tm);
}

/* io.tmpfile: um arquivo em /tmp que some ao fechar (como no Linux) */
FILE *tmpfile(void) {
    char nome[] = "/tmp/tmpfXXXXXX";
    int fd = mkstemp(nome);
    if (fd < 0) return NULL;
    unlink(nome);
    FILE *f = fdopen(fd, "w+");
    if (!f) close(fd);
    return f;
}
