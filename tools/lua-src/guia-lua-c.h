/* guia-lua-c.h — incluído (-include) só no lua.c. A mensagem de erro do
   interpretador ("lua: main.lua:3: ..." e o "stack traceback:") passa por
   lua_writestringerror; antes de escrevê-la, o editor é avisado (guia.erro):
   é assim que ele distingue "terminou com erro" de "os.exit(1)". O aviso do
   modo interativo ("warning: locals do not survive…") não conta como erro.
   O texto escrito é exatamente o mesmo do lua do Ubuntu. */
#ifndef GUIA_LUA_C_H
#define GUIA_LUA_C_H
#include <stdio.h>
#include <string.h>
__attribute__((import_module("guia"), import_name("erro"))) void guia_erro(void);
static inline void guia_avisa_erro(const char *s, const char *p) {
    if (!(p && strncmp(p, "warning: ", 9) == 0)) guia_erro();
    (void)s;
}
#define lua_writestringerror(s,p) \
        (guia_avisa_erro((s), (p)), fprintf(stderr, (s), (p)), fflush(stderr))
#endif
