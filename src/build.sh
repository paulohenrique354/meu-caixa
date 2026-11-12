#!/bin/sh
# Junta as partes em um único arquivo (../index.html) e atualiza a cópia de uso em ~/app finaceiro.
# Para publicar como app instalável, suba a pasta meu-caixa/ inteira (index.html, sw.js, manifest.webmanifest e ícones) num endereço https.
cd "$(dirname "$0")" && cat p1.html p2.js p3.js > ../index.html && echo "ok: $(wc -c < ../index.html) bytes"
USO="$HOME/app finaceiro"
[ -d "$USO" ] && cp ../index.html "$USO/Meu Caixa.html" && echo "cópia de uso atualizada: $USO/Meu Caixa.html"
