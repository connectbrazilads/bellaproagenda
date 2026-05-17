# Runtime

## Visão geral

O runtime da BellaPro Agenda é composto por:

- SPA React no navegador
- API Express request/response
- jobs em background via `node-cron`
- fluxo conversacional WhatsApp + IA

## Superfícies de runtime

### 1. Navegador

O navegador executa:

- landing
- booking público por `slug`
- painel admin
- painel superadmin

Características atuais:

- rotas lazy com `React.lazy`
- sessão baseada em cookie `httpOnly`
- Axios com `withCredentials`
- proteção de rotas por sessão e permissão
- estado local React para operação da interface

### 2. API

O backend Express executa:

- autenticação admin e superadmin
- APIs públicas e privadas
- billing SaaS
- upload autenticado
- webhook protegido por token
- integrações externas

### 3. Jobs em background

Hoje existem jobs em processo:

- lembretes automáticos
- geração automática de faturas mensais

Isso significa que:

- os jobs sobem junto com a API
- duas instâncias da API podem duplicar cron se não houver coordenação externa

### 4. Runtime conversacional

O fluxo WhatsApp + Gemini faz:

1. recebe mensagem via webhook
2. resolve o salão
3. carrega histórico
4. chama o modelo com contexto e tools
5. executa leituras/escritas de domínio
6. persiste histórico
7. responde no canal

## Sessão e autenticação

Estado atual:

- admin usa cookie `athena_admin_session`
- superadmin usa cookie `athena_superadmin_session`
- cookies com `httpOnly`
- frontend não depende mais de JWT persistido em `localStorage`

Isso reduz exposição em caso de XSS e deixa o fluxo mais adequado para produção.

## Billing em runtime

O billing agora participa do runtime de duas formas:

- configuração central no superadmin
- geração automática de invoices por cron

Comportamento atual:

- os preços dos planos ficam em `BillingSettings`
- o MRR estimado usa esses preços configurados
- a API garante a criação do ciclo atual ao listar faturas, além do cron diário

## Persistência

O estado canônico vive no PostgreSQL:

- salões
- usuários
- profissionais
- clientes
- agendamentos
- caixa
- auditoria
- invoices
- suporte
- conversas

Persistência adicional:

- uploads em filesystem local

## Recuperação de falhas

Recupera bem hoje:

- reinício da API
- refresh de navegador
- retomada de sessão ainda válida
- continuidade de histórico conversacional

Mais sensível hoje:

- cron em multi-instância
- uploads locais em ambiente efêmero
- retries de integrações externas

## Próxima evolução recomendada

- separar cron de billing e lembretes em worker dedicado
- mover uploads para object storage
- adicionar observabilidade para jobs e integrações
- colocar idempotência explícita em webhooks e financeiro
