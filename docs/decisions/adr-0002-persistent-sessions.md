# ADR-0002: Sessões Persistentes Locais

- Status: Aceito
- Data: 2026-05-15

## Contexto

A plataforma atende equipes de salão em fluxos operacionais que exigem retorno rápido e baixa fricção, tanto em desktop quanto em mobile.

Além disso, o sistema precisa preservar continuidade em:

- sessões administrativas
- histórico conversacional com IA
- recuperação de senha

## Decisão

Usar sessões persistentes locais para operadores web e persistência em banco para continuidade de domínio:

- JWTs armazenados em `localStorage`
- expiração controlada também no cliente
- snapshots de permissão salvos localmente para gating imediato da UI
- histórico de conversa armazenado no PostgreSQL
- tokens de recuperação de senha armazenados no PostgreSQL

## Justificativa

Essa decisão favorece simplicidade operacional e boa ergonomia de uso:

- não exige session store no servidor
- a API continua stateless do ponto de vista de sessão web
- o usuário pode recarregar ou reabrir a aplicação sem autenticar novamente a cada acesso
- a continuidade de IA e mensageria sobrevive a reinícios do processo

## Consequências

### Positivas

- topologia de deploy simples
- escalonamento horizontal facilitado na API
- boa continuidade para operação diária
- ótima aderência ao uso cotidiano de um SaaS browser-first

### Negativas

- `localStorage` é mais exposto a XSS do que `httpOnly` cookies
- snapshots de permissão podem ficar desatualizados até novo login se o acesso for alterado
- continuidade de jobs ainda depende do processo, e não de um runner durável

## Alternativas Consideradas

### 1. Sessão no Servidor

Rejeitada porque:

- adiciona estado infra sem resolver a necessidade principal de continuidade operacional
- JWT atende o modelo atual de autenticação

### 2. Tokens Curtos com Silent Refresh e `httpOnly` Cookies

Adiada, não rejeitada.

Essa abordagem melhora a postura de segurança, mas aumenta:

- complexidade de autenticação
- gestão de refresh token
- necessidade de tratamento de cookies e CSRF

Pode se tornar a melhor opção em estágio de maturidade maior.

### 3. Sessão Não Persistente

Rejeitada porque:

- criaria fricção excessiva para a operação do salão
- pioraria a experiência mobile

## Próximos Passos

Melhorias recomendadas:

- migrar para `httpOnly` cookies se a exigência de segurança crescer
- adicionar refresh/rotação de token
- atualizar snapshots de permissão após mudanças administrativas
- centralizar invalidação de sessão para eventos de risco alto
