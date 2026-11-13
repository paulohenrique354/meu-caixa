# Meu Caixa — app de finanças pessoais.
# É HTML/CSS/JS estático: basta um servidor de arquivos. Os dados ficam no aparelho de cada pessoa,
# então o servidor não guarda nada (sem banco, sem volume, sem segredo).
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="Meu Caixa" \
      org.opencontainers.image.description="App de finanças pessoais (PWA estático)" \
      org.opencontainers.image.source="https://github.com/paulohenrique354/meu-caixa"

# Configuração própria: segurança, cache certo para o modo offline, gzip e /healthz
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

# O app (o index.html já vem montado das partes em src/ pelo src/build.sh)
COPY index.html sw.js manifest.webmanifest icon.svg icon-180.png icon-192.png icon-512.png /usr/share/nginx/html/

EXPOSE 80

# 127.0.0.1 e não localhost: dentro do container o localhost resolve para ::1 primeiro
# e o nginx escuta só em IPv4.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
