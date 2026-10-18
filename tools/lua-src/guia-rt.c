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
#include <dlfcn.h>

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
static void expandir_tempo(const char *f, const struct tm *tm, char *g, size_t cap);
size_t __wrap_strftime(char *restrict s, size_t n, const char *restrict f0, const struct tm *restrict tm) {
    char e[512];
    expandir_tempo(f0, tm, e, sizeof e);
    const char *f = e;
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

/* ---- 6. o número do erro (3º valor de io.open/os.remove… em caso de falha) ----
   A wasi-libc numera os erros como o WASI (ENOENT = 44); o Linux, como o glibc
   (ENOENT = 2). O construir-lua.sh troca, no lauxlib.c (luaL_fileresult),
   lua_pushinteger(L, en) por lua_pushinteger(L, guia_errno(en)). A mensagem
   (strerror) já é a mesma do Linux. */
int guia_errno(int e) {
    switch (e) {
    case 0: return 0;
    case EPERM: return 1;         case ENOENT: return 2;        case ESRCH: return 3;
    case EINTR: return 4;         case EIO: return 5;           case ENXIO: return 6;
    case E2BIG: return 7;         case ENOEXEC: return 8;       case EBADF: return 9;
    case ECHILD: return 10;       case EAGAIN: return 11;       case ENOMEM: return 12;
    case EACCES: return 13;       case EFAULT: return 14;       case EBUSY: return 16;
    case EEXIST: return 17;       case EXDEV: return 18;        case ENODEV: return 19;
    case ENOTDIR: return 20;      case EISDIR: return 21;       case EINVAL: return 22;
    case ENFILE: return 23;       case EMFILE: return 24;       case ENOTTY: return 25;
    case ETXTBSY: return 26;      case EFBIG: return 27;        case ENOSPC: return 28;
    case ESPIPE: return 29;       case EROFS: return 30;        case EMLINK: return 31;
    case EPIPE: return 32;        case EDOM: return 33;         case ERANGE: return 34;
    case EDEADLK: return 35;      case ENAMETOOLONG: return 36; case ENOLCK: return 37;
    case ENOSYS: return 38;       case ENOTEMPTY: return 39;    case ELOOP: return 40;
    case EILSEQ: return 84;       case ENOTSUP: return 95;      case ETIMEDOUT: return 110;
    default: return e;
    }
}

/* ---- 7. as mensagens de erro do sistema com o texto da glibc (a do lab) ----
   (a musl escreve algumas de outro jeito: "Invalid seek" × "Illegal seek") */
char *__real_strerror(int e);
char *__wrap_strerror(int e) {
    switch (e) {
    case ESPIPE: return "Illegal seek";
    case EMFILE: return "Too many open files";
    case ENOMEM: return "Cannot allocate memory";
    case ENOTSUP: return "Operation not supported";
    case EXDEV: return "Invalid cross-device link";
    case ENAMETOOLONG: return "File name too long";
    case ELOOP: return "Too many levels of symbolic links";
    case EBUSY: return "Device or resource busy";
    case EIO: return "Input/output error";
    case ERANGE: return "Numerical result out of range";
    case EDOM: return "Numerical argument out of domain";
    case EILSEQ: return "Invalid or incomplete multibyte or wide character";
    case ENFILE: return "Too many open files in system";
    case ETXTBSY: return "Text file busy";
    case ENOTTY: return "Inappropriate ioctl for device";
    case EAGAIN: return "Resource temporarily unavailable";
    case 0: return "Success";
    default: return __real_strerror(e);
    }
}

/* ---- 8. package.loadlib / require de módulo em C (.so) ----
   No navegador não há bibliotecas dinâmicas: dlopen sempre falha, com a mensagem
   que o glibc daria (arquivo que não existe; ou um arquivo que não é ELF). */
#include <sys/stat.h>
static char dl_msg[640];
static int dl_tem = 0;
void *dlopen(const char *caminho, int flags) {
    struct stat st;
    (void)flags;
    if (!caminho) { snprintf(dl_msg, sizeof dl_msg, "dlopen: invalid caller"); dl_tem = 1; return NULL; }
    if (!strchr(caminho, '/') || stat(caminho, &st) != 0)
        snprintf(dl_msg, sizeof dl_msg, "%s: cannot open shared object file: No such file or directory", caminho);
    else if (S_ISDIR(st.st_mode))
        snprintf(dl_msg, sizeof dl_msg, "%s: cannot read file data: Is a directory", caminho);
    else if (st.st_size < 64)
        snprintf(dl_msg, sizeof dl_msg, "%s: file too short", caminho);
    else
        snprintf(dl_msg, sizeof dl_msg, "%s: invalid ELF header", caminho);
    dl_tem = 1;
    return NULL;
}
char *dlerror(void) {
    if (!dl_tem) return NULL;
    dl_tem = 0;
    return dl_msg;
}
void *dlsym(void *restrict h, const char *restrict nome) {
    (void)h;
    snprintf(dl_msg, sizeof dl_msg, "undefined symbol: %s", nome);
    dl_tem = 1;
    return NULL;
}
int dlclose(void *h) { (void)h; return 0; }

/* ---- 9. os.setlocale: os locales do lab (C, POSIX, C.UTF-8, en_US, pt_BR e pt_PT .UTF-8) ----
   A wasi-libc só tem o locale "C". O editor imita o glibc do lab no que o Lua usa:
   - o nome devolvido, o "" (= $LANG, pt_BR.UTF-8), o nome composto "LC_CTYPE=…;LC_NUMERIC=…";
   - LC_NUMERIC pt_BR/pt_PT: vírgula decimal ao escrever (snprintf) e ao ler (strtod) números: 3,5;
   - LC_TIME: nomes de dias e meses, %c, %x, %X, %p, %r (pt: "qui 05 mar 2026 14:07:09");
   - LC_COLLATE pt_BR/pt_PT/en_US: comparar textos (<, table.sort) com a ordem do idioma (Intl.Collator,
     ignorando pontuação e espaço, como o glibc; empate = ordem dos bytes). */
#include <locale.h>
#include <stdarg.h>
#include <ctype.h>
GUIA("comparar") int guia_comparar(const char *a, int la, const char *b, int lb, int idioma);

#define NCATS 12
static const char *const NOMES_CATS[NCATS] = { "LC_CTYPE", "LC_NUMERIC", "LC_TIME", "LC_COLLATE", "LC_MONETARY", "LC_MESSAGES",
    "LC_PAPER", "LC_NAME", "LC_ADDRESS", "LC_TELEPHONE", "LC_MEASUREMENT", "LC_IDENTIFICATION" };
static char cats[NCATS][64] = { "C", "C", "C", "C", "C", "C", "C", "C", "C", "C", "C", "C" };
static char composto[NCATS * 80];

enum { ID_C = 0, ID_EN = 1, ID_PT = 2 };
/* qual idioma o nome indica; -1 = não existe no lab */
static int idioma_de(const char *n) {
    char lingua[16], cod[16];
    const char *p = strchr(n, '.');
    size_t ll = p ? (size_t)(p - n) : strlen(n);
    if (ll >= sizeof lingua || strchr(n, '@')) return -1;
    memcpy(lingua, n, ll); lingua[ll] = '\0';
    size_t k = 0;
    if (p) for (p++; *p && k < sizeof cod - 1; p++) if (isalnum((unsigned char)*p)) cod[k++] = (char)tolower((unsigned char)*p);
    cod[k] = '\0';
    if (!strcmp(lingua, "C") || !strcmp(lingua, "POSIX")) return (!p || !strcmp(cod, "utf8")) ? ID_C : -1;
    if (!p || strcmp(cod, "utf8")) return -1;
    if (!strcmp(lingua, "en_US")) return ID_EN;
    if (!strcmp(lingua, "pt_BR") || !strcmp(lingua, "pt_PT")) return ID_PT;
    return -1;
}
static int idioma_cat(int c) { int i = idioma_de(cats[c]); return i < 0 ? ID_C : i; }
static int virgula(void) { return idioma_cat(LC_NUMERIC) == ID_PT; }

static const char *do_ambiente(int cat) {
    const char *v = getenv("LC_ALL");
    if (v && *v) return v;
    if (cat >= 0 && cat < 6) { char nome[32]; snprintf(nome, sizeof nome, "%s", NOMES_CATS[cat]); v = getenv(nome); if (v && *v) return v; }
    v = getenv("LANG");
    return (v && *v) ? v : "C";
}

char *__real_setlocale(int cat, const char *nome);
char *__wrap_setlocale(int cat, const char *nome) {
    if (cat < 0 || cat > LC_ALL) { errno = EINVAL; return NULL; }
    if (!nome) {
        if (cat != LC_ALL) return cats[cat];
        int iguais = 1;
        for (int i = 1; i < NCATS; i++) if (strcmp(cats[i], cats[0])) iguais = 0;
        if (iguais) return cats[0];
        size_t o = 0;
        for (int i = 0; i < NCATS; i++) o += (size_t)snprintf(composto + o, sizeof composto - o, "%s%s=%s", i ? ";" : "", NOMES_CATS[i], cats[i]);
        return composto;
    }
    if (cat == LC_ALL && strchr(nome, '=')) {          /* o nome composto que o próprio setlocale devolveu */
        char novos[NCATS][64];
        memcpy(novos, cats, sizeof novos);
        const char *p = nome;
        while (*p) {
            const char *ig = strchr(p, '='), *fim = strchr(p, ';');
            if (!ig) return NULL;
            if (!fim) fim = p + strlen(p);
            int achou = -1;
            for (int i = 0; i < NCATS; i++) if ((size_t)(ig - p) == strlen(NOMES_CATS[i]) && !strncmp(p, NOMES_CATS[i], (size_t)(ig - p))) achou = i;
            size_t lv = (size_t)(fim - ig - 1);
            if (achou < 0 || lv >= 64) return NULL;
            memcpy(novos[achou], ig + 1, lv); novos[achou][lv] = '\0';
            if (idioma_de(novos[achou]) < 0) return NULL;
            p = *fim ? fim + 1 : fim;
        }
        memcpy(cats, novos, sizeof novos);
        return __wrap_setlocale(LC_ALL, NULL);
    }
    const char *n = *nome ? nome : do_ambiente(cat);
    if (strlen(n) >= 64 || idioma_de(n) < 0) return NULL;
    if (!strcmp(n, "POSIX")) n = "C";
    if (cat == LC_ALL) { for (int i = 0; i < NCATS; i++) strcpy(cats[i], n); return cats[0]; }
    strcpy(cats[cat], n);
    return cats[cat];
}

struct lconv *__real_localeconv(void);
struct lconv *__wrap_localeconv(void) {
    static struct lconv l;
    l = *__real_localeconv();
    if (virgula()) { l.decimal_point = ","; l.thousands_sep = "."; }
    return &l;
}

/* a conversão (a última de "%…X") é de número com vírgula? */
static int conv_real(const char *f) {
    const char *p = strrchr(f, '%');
    if (!p) return 0;
    while (*++p && strchr("0123456789.-+ #*'lLhqjzt", *p)) ;
    return *p && strchr("aAeEfFgG", *p);
}
int __wrap_snprintf(char *restrict s, size_t n, const char *restrict f, ...) {
    va_list ap;
    va_start(ap, f);
    int r = vsnprintf(s, n, f, ap);
    va_end(ap);
    if (r > 0 && n > 0 && virgula() && conv_real(f)) {
        size_t lim = (size_t)r < n - 1 ? (size_t)r : n - 1;
        for (size_t i = 0; i < lim; i++) if (s[i] == '.') s[i] = ',';
    }
    return r;
}
double __real_strtod(const char *restrict s, char **restrict fim);
double __wrap_strtod(const char *restrict s, char **restrict fim) {
    char b[256];
    size_t n = strlen(s);
    if (!virgula() || n >= sizeof b) return __real_strtod(s, fim);
    for (size_t i = 0; i <= n; i++) b[i] = s[i] == ',' ? '.' : s[i] == '.' ? ';' : s[i];
    char *e;
    double r = __real_strtod(b, &e);
    if (fim) *fim = (char *)s + (e - b);
    return r;
}

int __real_strcoll(const char *a, const char *b);
int __wrap_strcoll(const char *a, const char *b) {
    int id = idioma_cat(LC_COLLATE);
    if (id == ID_C) return __real_strcoll(a, b);
    int c = guia_comparar(a, (int)strlen(a), b, (int)strlen(b), id);
    return c ? c : strcmp(a, b);
}

/* LC_TIME: troca %a %A %b %h %B %c %x %X %p %r (e %Ec %Ex %EX) pelo texto do idioma */
static const char *const DIAS_PT[7] = { "domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado" };
static const char *const DIAS_PT_AB[7] = { "dom", "seg", "ter", "qua", "qui", "sex", "sáb" };
static const char *const MESES_PT[12] = { "janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro" };
static const char *const MESES_PT_AB[12] = { "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez" };
static int poe(char *g, size_t o, size_t cap, const char *t, int escapar) {
    for (; *t && o < cap - 1; t++) { if (escapar && *t == '%') { if (o < cap - 2) g[o++] = '%'; } g[o++] = *t; }
    g[o] = '\0';
    return (int)o;
}
static void expandir_tempo(const char *f, const struct tm *tm, char *g, size_t cap) {
    int id = idioma_cat(LC_TIME);
    size_t o = 0;
    g[0] = '\0';
    for (const char *p = f; *p && o < cap - 64; p++) {
        if (p[0] != '%' || !p[1]) { g[o++] = *p; g[o] = '\0'; continue; }
        const char *q = p + 1;
        if ((*q == 'E' || *q == 'O') && q[1]) q++;
        char c = *q;
        const char *sub = NULL; int esc = 0;
        int wd = tm->tm_wday >= 0 && tm->tm_wday < 7 ? tm->tm_wday : 0, mo = tm->tm_mon >= 0 && tm->tm_mon < 12 ? tm->tm_mon : 0;
        if (id == ID_PT) {
            switch (c) {
            case 'a': sub = DIAS_PT_AB[wd]; esc = 1; break;
            case 'A': sub = DIAS_PT[wd]; esc = 1; break;
            case 'b': case 'h': sub = MESES_PT_AB[mo]; esc = 1; break;
            case 'B': sub = MESES_PT[mo]; esc = 1; break;
            case 'c': sub = "%a %d %b %Y %T"; break;
            case 'x': sub = "%d/%m/%Y"; break;
            case 'X': sub = "%T"; break;
            case 'p': sub = ""; break;
            case 'r': sub = "%I:%M:%S %p"; break;
            }
        } else if (id == ID_EN) {
            switch (c) {
            case 'c': sub = "%a %d %b %Y %r %Z"; break;
            case 'x': sub = "%m/%d/%Y"; break;
            case 'X': sub = "%r"; break;
            }
        }
        if (!sub) {                                   /* fica como está (inclusive o %E/%O) */
            while (p <= q && o < cap - 1) g[o++] = *p++;
            p--; g[o] = '\0';
            continue;
        }
        if (esc) o = (size_t)poe(g, o, cap, sub, 1);
        else {                                        /* um formato: expande de novo (%a, %b, %p dentro do %c) */
            char sub2[256];
            expandir_tempo(sub, tm, sub2, sizeof sub2);
            o = (size_t)poe(g, o, cap, sub2, 0);
        }
        p = q;
    }
}
