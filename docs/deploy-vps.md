# Deploy em VPS

## Topologia recomendada

- `Nginx` servindo o frontend estatico
- `Node.js` rodando o backend na porta `3001`
- `PostgreSQL` local ou gerenciado
- uma unica instancia do backend

Importante:

- hoje os lembretes rodam dentro do proprio processo da API
- nao suba duas instancias do backend sem isolar esse cron, ou voce pode duplicar lembretes

## Estrutura sugerida

```text
/var/www/bellapro/
  backend/
  frontend/
```

## Pacotes base

Exemplo Ubuntu 24.04:

```bash
sudo apt update
sudo apt install -y nginx postgresql postgresql-contrib curl git
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## Backend

```bash
cd /var/www/bellapro/backend
npm ci
cp .env.example .env
```

Preencha obrigatoriamente:

- `DATABASE_URL`
- `NODE_ENV=production`
- `TRUST_PROXY=1`
- `JWT_SECRET`
- `WEBHOOK_SECRET`
- `SUPERADMIN_EMAIL`
- `SUPERADMIN_SENHA`
- `APP_URL=https://app.seudominio.com`
- `CORS_ORIGINS=app.seudominio.com,https://app.seudominio.com`

Opcional, mas recomendado:

- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`

Depois:

```bash
npx prisma db push
```

Use o seed apenas se voce realmente quiser popular uma base nova com dados iniciais:

```bash
node prisma/seed.js
```

## Frontend

```bash
cd /var/www/bellapro/frontend
npm ci
cp .env.example .env
npm run build
```

Em producao, a API deve ser consumida pelo mesmo dominio em `/api`, entao `VITE_API_URL` pode ficar vazio.

## systemd

Copie o arquivo de servico:

```bash
sudo cp deploy/vps/bellapro-backend.service /etc/systemd/system/bellapro-backend.service
sudo systemctl daemon-reload
sudo systemctl enable bellapro-backend
sudo systemctl start bellapro-backend
sudo systemctl status bellapro-backend
```

## Nginx

Copie e ajuste o dominio em `deploy/vps/bellapro-nginx.conf`:

```bash
sudo cp deploy/vps/bellapro-nginx.conf /etc/nginx/sites-available/bellapro
sudo ln -s /etc/nginx/sites-available/bellapro /etc/nginx/sites-enabled/bellapro
sudo nginx -t
sudo systemctl reload nginx
```

Depois disso, gere o SSL:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.seudominio.com
```

## Deploy recorrente

O script base esta em `deploy/vps/release.sh`.

Exemplo:

```bash
sudo bash deploy/vps/release.sh
```

Ele faz:

1. `npm ci` no backend
2. `prisma db push`
3. `npm ci` e `build` no frontend
4. restart do backend
5. reload do nginx
6. healthcheck local

## Checklist final

- `/health` responde `200`
- login admin funciona no dominio final
- login super admin funciona
- upload autenticado funciona
- webhook responde com `?token=SEU_WEBHOOK_SECRET`
- recuperacao de senha envia email real
- DNS e SSL estao ativos

## Observacoes de producao

- como o frontend usa cookies `httpOnly`, o SSL precisa estar configurado para fluxo completo de login em producao
- se voce usar host externo para banco, libere firewall apenas para o necessario
- o diretório de uploads continua local ao servidor; faca backup dele junto com o banco
