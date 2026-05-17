# ADR-0002: Sessões Persistentes Web

- Status: Substituído
- Data: 2026-05-15
- Atualizado em: 2026-05-17

## Contexto

A plataforma atende equipes de salão em fluxos operacionais que exigem retorno rápido e baixa fricção, tanto em desktop quanto em mobile.

Além disso, o sistema precisa preservar continuidade em:

- sessões administrativas
- histórico conversacional com IA
- recuperação de senha

## Decisão Atual

A decisão vigente para sessão web é:

- cookie `httpOnly` para admin
- cookie `httpOnly` para superadmin
- estado de UI sem dependência de JWT persistido no navegador
- histórico de conversa armazenado no PostgreSQL
- tokens de recuperação de senha armazenados com hash no PostgreSQL

## Histórico

A primeira versão deste ADR registrava uma estratégia com:

- JWT armazenado em `localStorage`
- expiração controlada também no cliente
- snapshots locais de permissão

Essa abordagem foi útil no estágio inicial, mas deixou de representar o estado atual do sistema após o hardening de autenticação.

## Motivo da Mudança

A migração para cookies `httpOnly` aconteceu para:

- reduzir superfície de exposição a XSS
- alinhar sessão com o endurecimento de segurança do produto
- evitar persistência de credenciais sensíveis no navegador
- simplificar o enforcement real da sessão no backend

## Consequências

### Positivas

- postura de segurança melhor para admin e superadmin
- menor exposição do token de sessão ao frontend
- documentação mais coerente com o runtime atual

### Trade-offs

- necessidade de cuidar melhor de CORS e política de cookies
- dependência maior da configuração correta de proxy e domínio
- maior atenção a comportamento cross-origin em deploys temporários

## Próximos Passos

Melhorias recomendadas:

- revisar CSP e demais headers de segurança da camada web
- adicionar observabilidade dedicada para eventos de autenticação
- formalizar política de renovação e invalidação de sessão
- avaliar camada separada para sessões de maior criticidade se a plataforma crescer
