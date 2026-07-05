#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="/var/www/bellapro"
BACKEND_DIR="$APP_ROOT/backend"
FRONTEND_DIR="$APP_ROOT/frontend"

echo "==> Atualizando dependencias do backend"
cd "$BACKEND_DIR"
npm ci
npx prisma db push
node fix-payment-methods.js

echo "==> Atualizando dependencias e build do frontend"
cd "$FRONTEND_DIR"
npm ci
npm run build

echo "==> Reiniciando backend"
systemctl restart bellapro-backend
systemctl status bellapro-backend --no-pager --lines=20

echo "==> Validando Nginx"
nginx -t
systemctl reload nginx

echo "==> Healthcheck"
curl -fsS http://127.0.0.1:3001/health

echo "Deploy concluido."
