# Meu Caixa

App de finanças pessoais para uma pessoa, feito para o celular: entradas, saídas, contas, cartão de crédito com fatura e parcelas, cofrinhos, orçamento, relatórios e leitura da nota fiscal (NFC-e).

**Usar:** https://paulohenrique354.github.io/meu-caixa/

No iPhone (Safari), toque em Compartilhar e depois em "Adicionar à Tela de Início". No Android (Chrome), toque no menu e depois em "Instalar app".

## Onde ficam os dados

Todos os dados ficam **no aparelho**, no próprio navegador (IndexedDB). Nada vai para servidor. Cada celular ou navegador tem os seus dados, então faça uma cópia de segurança em Ajustes de vez em quando.

A senha é uma trava de tela (fica guardada só como hash SHA-256). A chave da IA para ler notas, se usada, também fica só no aparelho.

## Hospedar numa VPS

Tem Dockerfile, configuração do nginx e dois caminhos prontos: VPS com Docker Swarm + Traefik, ou VPS nova com Caddy. Passo a passo em [DEPLOY.md](DEPLOY.md).

## Código

- `index.html`: o app completo, montado a partir das partes em `src/`.
- `src/p1.html` (tela e estilo), `src/p2.js` (dados e regras financeiras), `src/p3.js` (telas e ações). Edite as partes e rode `src/build.sh`.
- `sw.js` e `manifest.webmanifest`: deixam instalar como app e usar sem internet. Ao mudar o app, suba `VERSAO` no `sw.js`.
- `Dockerfile`, `deploy/` e `docker-stack.yml`: hospedagem numa VPS (ver [DEPLOY.md](DEPLOY.md)).
