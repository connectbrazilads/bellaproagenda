# BellaPro Agenda - Diretrizes do Projeto

Este arquivo funciona como memória persistente e padrão de qualidade do projeto BellaPro Agenda.

## Stack

- Frontend: React, Vite, Tailwind, Axios, Recharts, React Router
- Backend: Node.js, Express, Prisma, PostgreSQL
- Integrações: Evolution API, Gemini, Nodemailer, node-cron
- Modelo: SaaS multi-tenant com isolamento por `salaoId`

## Princípios obrigatórios

1. A experiência visual deve seguir a identidade BellaPro.
2. O sistema precisa parecer premium, claro e operacional.
3. Segurança multi-tenant é inegociável.
4. O backend deve privilegiar isolamento, previsibilidade e rastreabilidade.
5. O frontend deve privilegiar clareza, responsividade e baixa fricção.
6. Toda automação de IA deve ter valor operacional real.

## Padrão de UI

- identidade BellaPro, não Athena
- tipografia elegante
- paleta rose / blush / ink
- mobile-first no booking
- estados vazios, loaders e erros sempre tratados

## Padrão de backend

- nunca acessar dados sem escopo de tenant quando a entidade for multi-tenant
- validar permissões no backend, não só no frontend
- evitar credenciais padrão
- preferir fluxos auditáveis
- qualquer mudança em billing, auth, webhook ou upload deve considerar impacto de segurança

## Áreas sensíveis

- auth admin e superadmin
- webhook WhatsApp
- uploads
- billing SaaS
- geração automática de faturas
- inbox e qualquer leitura cross-tenant

## Documentação

Sempre que houver mudança relevante em:

- arquitetura
- segurança
- deploy
- billing
- branding
- integrações

também deve ser atualizada a documentação em `README.md` e `docs/`.
