/* guia.h — incluído (-include) em TODOS os .c do Lua quando o editor do Guia Lua
   compila o lua.wasm (tools/construir-lua.sh). Não muda o Lua: só declara o que
   a wasi-libc não tem e o Lua de "Linux" (LUA_USE_POSIX) usa. As funções ficam
   em guia-rt.c. */
#ifndef GUIA_H
#define GUIA_H
#include <stdio.h>
#include <signal.h>

/* liolib.c (io.popen) e loslib.c (os.tmpname): não estão na wasi-libc */
FILE *popen(const char *comando, const char *modo);
int pclose(FILE *f);
int mkstemp(char *modelo);
/* lauxlib.c (luaL_fileresult): o número do erro como no Linux */
int guia_errno(int e);

/* lua.c: o tratador do Ctrl+C usa sigaction (a wasi-libc só emula signal) */
#ifndef SA_RESTART
struct sigaction { void (*sa_handler)(int); int sa_flags; int sa_mask; };
#define sigemptyset(m) (*(m) = 0)
#define sigaction(sig, sa, velho) ((void)(velho), signal((sig), (sa)->sa_handler), 0)
#endif

#endif
