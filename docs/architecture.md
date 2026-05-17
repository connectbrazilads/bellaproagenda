# Arquitetura

## Visão executiva

A BellaPro Agenda é um SaaS multi-tenant para operação de salões de beleza com três superfícies:

- experiência pública de agendamento
- painel administrativo do salão
- painel superadmin da plataforma

## Arquitetura de alto nível

- `frontend/`: SPA React + Vite
- `backend/`: Express + Prisma
- `database`: PostgreSQL
- `uploads`: armazenamento local autenticado

Integrações principais:

- Evolution API para WhatsApp
- Gemini para IA
- SMTP para e-mail

## Domínio principal

A raiz multi-tenant é `Salao`.

Entidades centrais:

- `Salao`
- `Usuario`
- `Profissional`
- `Cliente`
- `Servico`
- `Produto`
- `Pacote`
- `Agendamento`
- `Invoice`
- `BillingSettings`
- `Conversa` / `Mensagem`

## Superfícies funcionais

### Booking público

Resolve o salão por `slug` e expõe:

- serviços
- pacotes
- profissionais
- horários disponíveis
- criação de agendamento

### Painel admin

Opera:

- agenda
- clientes
- profissionais
- serviços
- produtos
- pacotes
- inbox
- financeiro
- faturas
- suporte

### Painel superadmin

Opera:

- visão global da base
- gestão de salões
- billing SaaS
- PIX global
- emissão e conferência de faturas
- suporte operacional

## Billing SaaS

O billing agora está centralizado em `BillingSettings`.

Campos relevantes:

- configuração global de PIX
- preço `basic`
- preço `pro`
- preço `enterprise`
- dia de vencimento
- flag de cobrança automática

O módulo de invoices faz:

- criação manual de faturas
- geração automática mensal por plano
- exposição de faturas ao salão
- envio de comprovante pelo cliente

## Sessão

Sessões admin e superadmin usam cookies `httpOnly`.

Isso altera a arquitetura de navegação:

- frontend fala com a API usando `withCredentials`
- backend passa a ser responsável direto pela sessão de navegador

## Background jobs

Hoje rodam dentro do processo da API:

- lembretes
- geração automática de faturas

Isso simplifica operação inicial, mas não é ideal para múltiplas réplicas.

## Segurança arquitetural

Controles relevantes aplicados:

- isolamento por `salaoId`
- permissão por módulo e ação
- webhook com token
- upload autenticado
- headers básicos de segurança
- rate limit em rotas sensíveis
- superadmin sem fallback inseguro

## Deploy

Modelos já preparados:

- VPS tradicional com Nginx
- Easypanel com monorepo separado em `/backend` e `/frontend`

## Evolução recomendada

- worker separado para billing e lembretes
- object storage para uploads
- observabilidade de cron, webhook e integrações
- ciclo formal de cobrança, inadimplência e suspensão
