/* guia-lua-c.h — incluído (-include) só no lua.c. A mensagem de erro do
   interpretador ("lua: main.lua:3: ..." e o "stack traceback:") passa por
   lua_writestringerror; antes de escrevê-la, o editor é avisado (guia.erro):
   é assim que ele distingue "terminou com erro" de "os.exit(1)". O texto
   escrito é exatamente o mesmo do lua do Ubuntu. */
#ifndef GUIA_LUA_C_H
#define GUIA_LUA_C_H
#include <stdio.h>
__attribute__((import_module("guia"), import_name("erro"))) void guia_erro(void);
#define lua_writestringerror(s,p) \
        (guia_erro(), fprintf(stderr, (s), (p)), fflush(stderr))
#endif
