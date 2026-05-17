# Segurança

## Visão geral

A plataforma já passou por uma rodada importante de hardening para go-live.

## Controles atuais

### Sessão

- cookies `httpOnly` para admin e superadmin
- expiração de sessão no backend
- logout explícito no frontend

### Isolamento multi-tenant

- escopo por `salaoId` nas entidades do salão
- correções aplicadas em rotas críticas de inbox e usuários

### Autenticação e credenciais

- senha com `bcrypt`
- validação de senha forte
- criação obrigatória de superadmin por variável de ambiente
- bloqueio de credenciais padrão

### Recuperação de senha

- token persistido com hash
- não é mais armazenado em texto puro

### Webhook

- protegido por `WEBHOOK_SECRET`
- exige `?token=...`

### Upload

- rota autenticada
- fluxo endurecido

### Rate limit e headers

- rate limit em auth e rotas mais sensíveis
- headers básicos de segurança no Express

## Riscos residuais

Os principais riscos atuais ainda são:

- cron duplicado em deploy multi-instância
- uploads locais no mesmo host da aplicação
- segredos por tenant ainda persistidos no banco
- ausência de uma esteira completa de observabilidade e alerting

## Billing e segurança

O módulo de billing introduz atenção especial para:

- criação idempotente de invoices por competência
- validação de comprovante
- separação entre emissão superadmin e visualização do salão

## Recomendação de produção

- usar HTTPS obrigatório
- restringir `CORS_ORIGINS`
- definir segredos fortes
- revisar `.env` real antes do deploy
- monitorar `/health`
- manter backup de banco e uploads

## Próximos hardenings recomendados

- mover uploads para storage externo
- criptografar segredos sensíveis por tenant
- separar cron de lembretes e billing em worker dedicado
- ampliar auditoria em fluxos financeiros
- adicionar observabilidade de falhas de integração
