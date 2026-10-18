#!/usr/bin/env bash
# construir-lua.sh — gera assets/lua/lua.wasm (o "lua" do editor do Guia Lua).
#
# O interpretador oficial (lua.c + biblioteca, de lua.org) compilado para WebAssembly
# (WASI preview1) com o wasi-sdk, com o mesmo luaconf.h do pacote lua5.5 do Ubuntu
# (o patch 0002-lua-modules-paths.patch do Debian: package.path/package.cpath iguais
# aos do lab). As adaptações ao navegador ficam em tools/lua-src/ (guia.h, guia-rt.c…).
#
# Uso (na VPS):  bash tools/construir-lua.sh
#   WASI_SDK=…   pasta do wasi-sdk (padrão: ~/opt/wasi-sdk-34.0-x86_64-linux)
# Depois: node tools/testar-missoes.js simulador-teste-interno.html (e as outras páginas).
set -euo pipefail
VERSAO=5.5.0
SHA256=57ccc32bbbd005cab75bcc52444052535af691789dba2b9016d5c50640d68b3d
DEBIAN=5.5.0-3ubuntu0.1
AQUI="$(cd "$(dirname "$0")" && pwd)"
RAIZ="$(dirname "$AQUI")"
SRC="$AQUI/lua-src"
WASI_SDK="${WASI_SDK:-$HOME/opt/wasi-sdk-34.0-x86_64-linux}"
CC="$WASI_SDK/bin/clang"
SAIDA="$RAIZ/assets/lua"
CACHE="${XDG_CACHE_HOME:-$HOME/.cache}/guia-lua"
OBRA="$(mktemp -d)"
trap 'rm -rf "$OBRA"' EXIT
mkdir -p "$CACHE" "$SAIDA"

[ -x "$CC" ] || { echo "não achei o wasi-sdk em $WASI_SDK (baixe de github.com/WebAssembly/wasi-sdk/releases)"; exit 2; }
TGZ="$CACHE/lua-$VERSAO.tar.gz"
[ -f "$TGZ" ] || curl -sSfL -o "$TGZ" "https://www.lua.org/ftp/lua-$VERSAO.tar.gz"
echo "$SHA256  $TGZ" | sha256sum -c --quiet
tar xzf "$TGZ" -C "$OBRA"
cd "$OBRA/lua-$VERSAO"
patch -s -p1 < "$SRC/0002-lua-modules-paths.patch"
echo '#define DEB_HOST_MULTIARCH "x86_64-linux-gnu"' > src/lua5.5-deb-multiarch.h
# o número do erro com a numeração do Linux (ver guia_errno em guia-rt.c)
grep -q 'lua_pushinteger(L, en);' src/lauxlib.c
sed -i 's/lua_pushinteger(L, en);/lua_pushinteger(L, guia_errno(en));/' src/lauxlib.c

# -DLUA_USE_LINUX: como o pacote do Ubuntu (LUA_USE_POSIX: mkstemp, localtime_r, popen,
#   _setjmp…; LUA_USE_DLOPEN: o dlopen do guia-rt.c sempre falha, com a mensagem do glibc).
# -mllvm -wasm-enable-sjlj: os erros do Lua (setjmp/longjmp) com as exceções do WebAssembly.
FLAGS=(--target=wasm32-wasip1 -O2 -Wall -Wextra -DLUA_COMPAT_5_4 -DLUA_USE_LINUX
       -D_WASI_EMULATED_SIGNAL -D_WASI_EMULATED_PROCESS_CLOCKS -D_GNU_SOURCE
       -Wno-deprecated-declarations -mllvm -wasm-enable-sjlj -I "$SRC/inc" -include "$SRC/guia.h")
cd src
OBJS=()
for f in *.c; do
  [ "$f" = luac.c ] && continue
  extra=()
  [ "$f" = lua.c ] && extra=(-include "$SRC/guia-lua-c.h")
  "$CC" "${FLAGS[@]}" "${extra[@]}" -c "$f" -o "${f%.c}.o" 2> >(grep -v "^$" | grep -v "warning: unused" >&2 || true)
  OBJS+=("${f%.c}.o")
done
"$CC" "${FLAGS[@]}" -c "$SRC/guia-rt.c" -o guia-rt.o
"$CC" --target=wasm32-wasip1 -O2 "${OBJS[@]}" guia-rt.o -o lua.wasm \
  -lsetjmp -lwasi-emulated-signal -lwasi-emulated-process-clocks -lm \
  -Wl,--wrap=__stdio_read,--wrap=localtime_r,--wrap=localtime,--wrap=mktime,--wrap=strftime,--wrap=strerror \
  -Wl,-z,stack-size=8388608 -Wl,--stack-first -Wl,--max-memory=268435456 -Wl,--strip-all
cp lua.wasm "$SAIDA/lua.wasm"
# a licença do Lua (MIT) está no fim do readme.html e no lua.h
sed -n '/^\* Copyright (C) 1994/,/SOFTWARE\./p' lua.h | sed 's/^\* \{0,1\}//' > "$SAIDA/LICENSE-lua.txt"
TAM=$(stat -c %s "$SAIDA/lua.wasm")
GZ=$(gzip -9c "$SAIDA/lua.wasm" | wc -c)
cat > "$SAIDA/VERSAO.txt" <<EOF
Lua $VERSAO (https://www.lua.org/ftp/lua-$VERSAO.tar.gz, sha256 $SHA256)
luaconf.h com o patch 0002-lua-modules-paths.patch do pacote lua5.5 $DEBIAN do Ubuntu
compilado com $("$CC" --version | head -1)
gerado por tools/construir-lua.sh em $(date -u +%Y-%m-%d)
lua.wasm: $TAM bytes ($GZ com gzip)
EOF
cat "$SAIDA/VERSAO.txt"
# o tamanho do download que o editor mostra
sed -i -E "s/var LUA_BYTES = [0-9]+;/var LUA_BYTES = $TAM;/" "$RAIZ/assets/luasim.js" 2>/dev/null || true
