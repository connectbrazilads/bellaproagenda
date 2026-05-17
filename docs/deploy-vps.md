# Deploy em VPS

## Topologia recomendada

- frontend estático atrás de Nginx
- backend Node.js na porta `3001`
- PostgreSQL
- uma única instância da API por padrão

## Atenção

Hoje estes jobs sobem junto com a API:

- lembretes
- billing automático

Não suba múltiplas instâncias sem coordenar cron, ou você pode duplicar execuções.

## Backend

```bash
cd /var/www/bellapro/backend
npm ci
cp .env.example .env
npx prisma db push
```

Variáveis obrigatórias:

- `DATABASE_URL`
- `NODE_ENV=production`
- `TRUST_PROXY=1`
- `JWT_SECRET`
- `WEBHOOK_SECRET`
- `SUPERADMIN_EMAIL`
- `SUPERADMIN_SENHA`
- `APP_URL`
- `CORS_ORIGINS`

Variáveis recomendadas:

- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`

## Frontend

```bash
cd /var/www/bellapro/frontend
npm ci
cp .env.example .env
npm run build
```

## Ponto importante depois das mudanças de billing

Se estiver atualizando um ambiente já existente:

```bash
cd /var/www/bellapro/backend
npx prisma db push
```

Isso é obrigatório para criar os novos campos de `BillingSettings`.

## systemd

Use o arquivo:

- `deploy/vps/bellapro-backend.service`

## Nginx

Use o arquivo:

- `deploy/vps/bellapro-nginx.conf`

## Checklist pós-deploy

- `/health` responde `200`
- login admin funciona
- login superadmin funciona
- webhook responde com token
- upload autenticado funciona
- billing do superadmin abre
- dashboard do salão mostra alerta se houver fatura pendente

## Easypanel

Se o deploy for no Easypanel:

- backend com build path `/backend`
- frontend com build path `/frontend`
- `Dockerfile` em ambos
- backend publicado para a porta `3001`
- após deploy, rodar `npx prisma db push` no serviço backend
