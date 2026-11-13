#!/bin/sh
# Primeira subida do Meu Caixa na VPS que já tem Docker Swarm + Traefik (a VPS M4).
# Rodar DENTRO da VPS, como root:
#   curl -fsSL https://raw.githubusercontent.com/paulohenrique354/meu-caixa/main/deploy/instalar-vps.sh -o instalar-vps.sh
#   DOMINIO=caixa.seudominio.com.br sh instalar-vps.sh
# Pode rodar de novo quando quiser: atualiza o código e publica a versão nova.
set -eu

: "${DOMINIO:?Informe o endereço. Exemplo: DOMINIO=caixa.seudominio.com.br sh instalar-vps.sh}"
PASTA=/var/www/meu-caixa
REPO=https://github.com/paulohenrique354/meu-caixa.git

echo "== Conferindo a VPS"
command -v docker >/dev/null 2>&1 || { echo "ERRO: o Docker não está instalado nesta máquina."; exit 1; }
[ "$(docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null)" = "active" ] || {
  echo "ERRO: o Docker Swarm não está ativo. Numa VPS sem Swarm/Traefik, use deploy/compose-vps-nova.yml (ver DEPLOY.md)."; exit 1; }
docker network inspect traefik-public >/dev/null 2>&1 || {
  echo "ERRO: não achei a rede traefik-public. Este roteiro supõe o Traefik da VPS M4; sem ele, use deploy/compose-vps-nova.yml."; exit 1; }

IP_DOMINIO=$(getent hosts "$DOMINIO" | awk '{print $1; exit}' || true)
IP_VPS=$(curl -fsS https://api.ipify.org 2>/dev/null || true)
if [ -z "$IP_DOMINIO" ]; then
  echo "AVISO: $DOMINIO ainda não aponta para lugar nenhum. Crie o registro A no DNS antes; sem isso o HTTPS não sai."
elif [ -n "$IP_VPS" ] && [ "$IP_DOMINIO" != "$IP_VPS" ]; then
  echo "AVISO: $DOMINIO aponta para $IP_DOMINIO, mas esta VPS é $IP_VPS. Confira o DNS."
fi

echo "== Baixando o código em $PASTA"
if [ -d "$PASTA/.git" ]; then git -C "$PASTA" pull --ff-only origin main; else git clone "$REPO" "$PASTA"; fi
cd "$PASTA"

echo "== Montando a imagem"
docker build -t meu-caixa:latest .

echo "== Publicando a stack meu-caixa"
DOMINIO="$DOMINIO" docker stack deploy -c docker-stack.yml meu-caixa
# A tag :latest não muda de nome; sem forçar, o Swarm pode manter o container antigo.
docker service update --force --detach=false meu-caixa_meu-caixa >/dev/null

echo "== Conferindo https://$DOMINIO/healthz (o certificado pode levar 1 ou 2 minutos na primeira vez)"
i=0
while [ $i -lt 12 ]; do
  if curl -fsS "https://$DOMINIO/healthz" >/dev/null 2>&1; then echo "PRONTO: https://$DOMINIO está no ar."; exit 0; fi
  i=$((i + 1)); sleep 10
done
echo "O serviço subiu, mas https://$DOMINIO ainda não respondeu. Veja: docker service logs --tail 50 meu-caixa_meu-caixa"
exit 1
