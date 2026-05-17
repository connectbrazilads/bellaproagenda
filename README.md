# Sistema de Agendamento - Salao de Beleza

## Documentacao Tecnica

A documentacao arquitetural e operacional do projeto esta em [docs/README.md](./docs/README.md).

Importante: a documentacao nao e atualizada automaticamente pelo sistema. Sempre que houver mudancas relevantes de arquitetura, fluxo, integracoes, seguranca ou posicionamento tecnico, revise a pasta `docs/`.

Materiais de manutencao:

- [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)
- [docs/checklist.md](./docs/checklist.md)

Arquivos principais:

- [docs/architecture.md](./docs/architecture.md)
- [docs/runtime.md](./docs/runtime.md)
- [docs/deploy-vps.md](./docs/deploy-vps.md)
- [docs/connectors.md](./docs/connectors.md)
- [docs/capabilities.md](./docs/capabilities.md)
- [docs/security.md](./docs/security.md)
- [docs/scalability.md](./docs/scalability.md)
- [docs/decisions/](./docs/decisions/)

## Como rodar localmente

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edite o .env com:
# DATABASE_URL
# JWT_SECRET
# WEBHOOK_SECRET
# SUPERADMIN_EMAIL
# SUPERADMIN_SENHA
# APP_URL
# CORS_ORIGINS
# EMAIL_HOST / EMAIL_USER / EMAIL_PASS (se usar email)
npx prisma db push
node prisma/seed.js
npm run dev
```

Backend rodando em: http://localhost:3001

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Opcional, mas recomendado:
# defina VITE_WEBHOOK_SECRET com o mesmo valor do WEBHOOK_SECRET do backend
npm run dev
```

Frontend rodando em: http://localhost:5173

---

## Acessos apos setup/seed

- **Agendamento publico**: http://localhost:5173/
- **Painel admin**: http://localhost:5173/admin
  - Email: `admin@salao.com`
  - Senha: `admin123`
- **Super admin**: definido por `SUPERADMIN_EMAIL` e `SUPERADMIN_SENHA` no `backend/.env`

Observacoes:

- o backend nao inicia sem `WEBHOOK_SECRET`, `SUPERADMIN_EMAIL` e `SUPERADMIN_SENHA`
- o webhook do WhatsApp agora deve usar a URL com token
  `https://seu-dominio/api/webhook/whatsapp?token=SEU_WEBHOOK_SECRET`

---

## Estrutura

```text
backend/
  src/
    controllers/   # authController, publicController, adminController
    routes/        # auth.js, public.js, admin.js
    services/      # slotsService, whatsappService, lembreteService
    lib/           # prisma singleton e seguranca
    app.js
  prisma/
    schema.prisma
    seed.js

frontend/
  src/
    pages/
      Booking/     # Fluxo publico multi-step
      admin/       # Dashboard, Agenda, Agendamentos, Profissionais, Servicos, Configuracoes
    services/
      api.js       # Todos os endpoints
    App.jsx

docs/
  README.md
  architecture.md
  runtime.md
  connectors.md
  capabilities.md
  security.md
  scalability.md
  decisions/
```
