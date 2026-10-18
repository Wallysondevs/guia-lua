/* sys/wait.h mínimo (a wasi-libc não tem): as macros que o lauxlib.c usa para
   ler o status do system()/pclose(), com o mesmo formato do Linux. */
#ifndef GUIA_SYS_WAIT_H
#define GUIA_SYS_WAIT_H
#define WEXITSTATUS(s) (((s) & 0xff00) >> 8)
#define WTERMSIG(s)    ((s) & 0x7f)
#define WIFEXITED(s)   (!WTERMSIG(s))
#define WIFSIGNALED(s) (((s) & 0xffff) - 1U < 0xffu)
#endif
