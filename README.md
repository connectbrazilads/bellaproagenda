# 💅 BellaPro Agenda

**A plataforma SaaS definitiva para salões de beleza, barbearias e clínicas de estética.**

O BellaPro Agenda não é apenas um sistema de agendamentos. É uma solução completa e inteligente (multi-tenant) desenhada para automatizar e escalar a operação de negócios de beleza. Com integração nativa de Inteligência Artificial e WhatsApp, o BellaPro coloca o seu salão no piloto automático.

---

## 🌟 Visão Geral

Seja você um salão de bairro ou uma rede de clínicas, o BellaPro Agenda oferece todas as ferramentas para atrair clientes, gerenciar profissionais, controlar o caixa e reduzir faltas, tudo em uma interface moderna e intuitiva. 

### O que o BellaPro faz pelo seu negócio?
- **Página de Agendamento Pública:** Uma landing page personalizada (seusalao.bellapro.com) onde seus clientes podem agendar horários 24 horas por dia.
- **Atendimento Mágico com IA + WhatsApp:** Responda clientes, tire dúvidas e confirme agendamentos automaticamente usando Inteligência Artificial integrada ao WhatsApp do salão.
- **Gestão de Equipe e Comissões:** Controle a escala, serviços e a remuneração de cada profissional com transparência e segurança.
- **Painel Financeiro e PDV:** Fluxo de caixa, controle de vales/descontos e visão clara da saúde financeira do negócio.
- **Gestão SaaS (Superadmin):** Para quem administra a plataforma, controle total de assinantes, planos e cobranças recorrentes (Billing SaaS com faturas via PIX).

---

## 🚀 Principais Funcionalidades

### Para o Salão (Painel Admin)
- **Agenda Inteligente:** Visão diária, semanal e mensal. Filtro por profissional e status do atendimento.
- **Gestão de Profissionais:** Cadastro de carreiras, serviços, comissões, horários de trabalho e relatórios de produtividade.
- **Financeiro Simplificado:** Controle de contas a pagar/receber, fechamento de caixa diário e gestão de repasses.
- **Inbox Centralizado:** Converse com seus clientes pelo WhatsApp diretamente pelo painel do salão.
- **Notificações:** Alertas automáticos de cobrança, confirmação e lembretes para reduzir os *no-shows* (faltas).

### Para o Cliente Final
- **Agendamento Online 24/7:** Escolha do serviço, profissional e horário sem precisar ligar ou mandar mensagem.
- **Lembretes via WhatsApp:** O cliente recebe a confirmação e lembretes amigáveis para não esquecer do horário.

### Para o Dono da Plataforma (Painel Superadmin)
- **Billing Automatizado:** Cobrança recorrente dos salões via PIX, com suspensão automática de inadimplentes.
- **Gestão de Planos:** Criação de pacotes (ex: Básico, Pro, Elite) com limites de profissionais e funcionalidades.

---

## 💡 Diferenciais Tecnológicos

- **Inteligência Artificial (Gemini):** O bot não apenas responde, mas *entende* o contexto do cliente, os horários disponíveis e os serviços oferecidos.
- **Arquitetura Multi-tenant Robusta:** Dados de cada salão são isolados com segurança total.
- **Design Premium:** Interfaces limpas, responsivas (mobile-first) e focadas na melhor experiência de uso (UX/UI).

---

## 💻 Documentação Técnica

Para desenvolvedores e administradores de sistema, o BellaPro é construído com tecnologias modernas: **React, Vite, Node.js, Express, PostgreSQL e Prisma**.

Toda a documentação técnica, arquitetura e guias de instalação/deploy foram movidos para a pasta /docs. 

Acesse os guias técnicos abaixo:
- 🏗️ [Arquitetura e Stack](./docs/architecture.md)
- ⚙️ [Configuração e Runtime](./docs/runtime.md)
- 🔒 [Hardening e Segurança](./docs/security.md)
- 🚀 [Guia de Deploy (VPS e Easypanel)](./docs/deploy-vps.md)
- ✅ [Checklist de Lançamento](./docs/checklist.md)

### Como rodar localmente (Resumo)

**1. Backend:**
\\\ash
cd backend
npm install
cp .env.example .env
npx prisma db push
node prisma/seed.js
npm run dev
\\\
*(O backend rodará em http://localhost:3001)*

**2. Frontend:**
\\\ash
cd frontend
npm install
cp .env.example .env
npm run dev
\\\
*(O frontend rodará em http://localhost:5173)*

> **Acessos Padrão (após o seed):**
> - Painel admin: \dmin@salao.com\ / \dmin123\
> - Superadmin: Conforme definido nas variáveis \SUPERADMIN_EMAIL\ e \SUPERADMIN_SENHA\.

---
*BellaPro Agenda - Desenvolvido para escalar a beleza.*
