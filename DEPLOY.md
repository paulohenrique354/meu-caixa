# Subir o Meu Caixa numa VPS

O Meu Caixa é um site estático: o servidor só entrega os arquivos. **Não há banco, volume nem segredo no servidor.** Os dados de cada pessoa ficam no celular dela.

São dois caminhos. Escolha pela VPS que vai usar:

| VPS | Caminho | O que usa |
|---|---|---|
| Já tem **Docker Swarm + Traefik** (como a VPS onde rodam o Painel e a Central) | **A** | `docker-stack.yml` + `deploy/instalar-vps.sh` |
| **Nova**, só com Docker | **B** | `deploy/compose-vps-nova.yml` (o Caddy cuida do HTTPS) |

## Antes de começar (nos dois caminhos)

1. **Escolha o endereço**, por exemplo `caixa.seudominio.com.br`.
2. **No DNS**, crie um registro tipo **A** apontando esse endereço para o IP da VPS. Sem isso o certificado HTTPS não sai. A propagação pode levar de alguns minutos a algumas horas.
3. **Faça cópia dos dados antes.** Cada endereço guarda os seus próprios dados. Quem já usa o app em outro endereço (por exemplo `paulohenrique354.github.io/meu-caixa`) deve, no endereço antigo, ir em Ajustes > **Fazer cópia de segurança** e, no endereço novo, em Ajustes > **Restaurar cópia de segurança**.

## Caminho A: VPS com Swarm + Traefik

Dentro da VPS, como root:

```bash
curl -fsSL https://raw.githubusercontent.com/paulohenrique354/meu-caixa/main/deploy/instalar-vps.sh -o instalar-vps.sh
```

```bash
DOMINIO=caixa.seudominio.com.br sh instalar-vps.sh
```

O script:

- confere se existem o Docker, o Swarm e a rede `traefik-public`, e avisa se o DNS não aponta para esta VPS;
- baixa o código em `/var/www/meu-caixa`;
- monta a imagem `meu-caixa:latest`;
- publica a stack `meu-caixa`;
- confere `https://ENDERECO/healthz` até responder.

Rodar de novo atualiza para a versão mais recente.

### Deploy automático (opcional)

Como no Painel e na Central, um push na `main` pode publicar sozinho na VPS. Fica **desligado** até ser configurado. Sem configuração, a execução só mostra um aviso e termina verde.

No repositório no GitHub, em **Settings > Secrets and variables > Actions**, cadastre:

| Tipo | Nome | O que colocar |
|---|---|---|
| Segredo | `SSH_HOST` | IP da VPS |
| Segredo | `SSH_USER` | o usuário do SSH (o mesmo do Painel e da Central) |
| Segredo | `SSH_PRIVATE_KEY` | a chave SSH privada com que esse usuário entra |
| Variável | `DOMINIO` | o endereço escolhido, ex.: `caixa.seudominio.com.br` |

A primeira subida é sempre pelo script do caminho A, porque é ele que cria `/var/www/meu-caixa`. Depois disso, cada push na `main` publica e confere o `/healthz`.

## Caminho B: VPS nova (só Docker)

As portas 80 e 443 precisam estar livres.

```bash
git clone https://github.com/paulohenrique354/meu-caixa.git /var/www/meu-caixa
```

```bash
cd /var/www/meu-caixa && DOMINIO=caixa.seudominio.com.br docker compose -f deploy/compose-vps-nova.yml up -d --build
```

O Caddy pede e renova o certificado HTTPS sozinho. Para atualizar depois:

```bash
cd /var/www/meu-caixa && git pull && DOMINIO=caixa.seudominio.com.br docker compose -f deploy/compose-vps-nova.yml up -d --build
```

## Conferir se deu certo

```bash
curl -fsS https://caixa.seudominio.com.br/healthz
```

```bash
docker service logs --tail 50 meu-caixa_meu-caixa
```

Depois abra o endereço no celular e instale ("Adicionar à Tela de Início" no iPhone, "Instalar app" no Android).

## O que o servidor entrega (`deploy/nginx.conf`)

- **Cabeçalhos de segurança:** uma política que só deixa o app carregar o leitor de QR (jsdelivr) e a letra (Google Fonts) e falar com a IA da nota (Anthropic). Também impede o site de ser embutido em página de outra pessoa.
- **Cache:** `index.html`, `sw.js` e o manifesto são sempre conferidos, para o celular pegar a versão nova depois do deploy. Os ícones ficam guardados por 7 dias.
- **Tipo certo para o `.webmanifest`:** sem ele o celular não oferece "instalar app".
- **Compressão e `/healthz`:** gzip na página (passa de 177 KB para 65 KB) e `/healthz` para a conferência de saúde.

## Publicar uma versão nova

1. Edite as partes em `src/` e rode `src/build.sh`.
2. Se mudou o app, suba `VERSAO` no `sw.js` para os celulares atualizarem.
3. Faça commit e push na `main`. O site do GitHub Pages atualiza sozinho; a VPS também, se o deploy automático estiver ligado, ou rodando o script de novo.

## Tirar do ar

```bash
docker stack rm meu-caixa
```

No caminho B:

```bash
cd /var/www/meu-caixa && docker compose -f deploy/compose-vps-nova.yml down
```
