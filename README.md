# BellaPro Agenda

Plataforma SaaS multi-tenant para operação de salões de beleza, com:

- landing e agendamento público por `slug`
- painel administrativo do salão
- painel superadmin da plataforma
- WhatsApp + IA
- billing SaaS com faturas via PIX

## Documentação

A documentação técnica e operacional está em [docs/README.md](./docs/README.md).

Leituras principais:

- [Arquitetura](./docs/architecture.md)
- [Runtime](./docs/runtime.md)
- [Segurança](./docs/security.md)
- [Deploy em VPS](./docs/deploy-vps.md)
- [Checklist](./docs/checklist.md)

## Stack

- Frontend: React + Vite + Tailwind
- Backend: Node.js + Express
- Banco: PostgreSQL + Prisma
- Integrações: Evolution API, Gemini, Nodemailer

## Como rodar localmente

### Backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma db push
node prisma/seed.js
npm run dev
```

Backend padrão: `http://localhost:3001`

Variáveis obrigatórias no `backend/.env`:

- `DATABASE_URL`
- `JWT_SECRET`
- `WEBHOOK_SECRET`
- `SUPERADMIN_EMAIL`
- `SUPERADMIN_SENHA`
- `APP_URL`
- `CORS_ORIGINS`

Variáveis recomendadas:

- `NODE_ENV=production` em deploy
- `TRUST_PROXY=1` atrás de proxy reverso
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend padrão: `http://localhost:5173`

Variáveis do `frontend/.env`:

- `VITE_API_URL`
- `VITE_WEBHOOK_SECRET`

## Acessos após seed

- Painel admin: `http://localhost:5173/admin/login`
  - `admin@salao.com`
  - `admin123`
- Superadmin:
  - definido por `SUPERADMIN_EMAIL`
  - definido por `SUPERADMIN_SENHA`

## Billing SaaS

O sistema agora possui billing centralizado no superadmin:

- configuração global de PIX
- preços dos planos no superadmin
- geração automática de faturas mensais por plano
- painel de faturas para o salão
- alerta no dashboard do salão quando houver cobrança pendente

Observação importante:

- a geração automática depende do schema mais recente
- após atualizar o backend em produção, rode `npx prisma db push`

## Segurança

Estado atual de hardening relevante:

- cookies `httpOnly` para sessão admin e superadmin
- webhook protegido por `?token=WEBHOOK_SECRET`
- superadmin obrigatório no boot, sem fallback inseguro
- upload autenticado
- rate limit nas rotas sensíveis
- hash de token de reset de senha
- isolamento por tenant em rotas críticas

## Importação de clientes

Hoje o sistema importa clientes por CSV na área de migração.

Formato aceito:

- `nome`
- `apelido`
- `telefone`
- `email`
- `instagram`
- `cpf`
- `rg`
- `sexo`
- `dataNascimento`
- `endereco`
- `numero`
- `complemento`
- `bairro`
- `cep`
- `cidade`
- `estado`

## Deploy

### VPS tradicional

Use:

- [docs/deploy-vps.md](./docs/deploy-vps.md)

### Easypanel

Resumo prático:

- backend com build path `/backend`
- frontend com build path `/frontend`
- `Dockerfile` em ambos
- backend exposto na porta `3001`
- frontend apontando para `VITE_API_URL`
- depois do deploy, rodar `npx prisma db push` no backend

## Estrutura

```text
backend/
  prisma/
  src/
    controllers/
    routes/
    services/
    lib/

frontend/
  src/
    assets/
    components/
    pages/
    services/

docs/
  architecture.md
  runtime.md
  security.md
  deploy-vps.md
```
