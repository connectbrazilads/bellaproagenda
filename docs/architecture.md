# Arquitetura

## Visao executiva

A BellaPro Agenda e um SaaS multi-tenant para operacao de saloes de beleza com tres superficies:

- experiencia publica de agendamento
- painel administrativo do salao
- painel superadmin da plataforma

## Arquitetura de alto nivel

- `frontend/`: SPA React + Vite
- `backend/`: Express + Prisma
- `database`: PostgreSQL
- `uploads`: armazenamento local autenticado

Integracoes principais:

- Evolution API para WhatsApp
- Gemini para IA
- SMTP para e-mail

## Dominio principal

A raiz multi-tenant e `Salao`.

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

## Atendimento multi-profissional e checkout unico

Problema de negocio:

- um mesmo cliente pode consumir varios servicos no mesmo dia
- cada servico pode ser executado por um profissional diferente
- a operacao precisa separar agenda, execucao e comissao por profissional
- a cobranca precisa acontecer em um unico checkout no final

Decisao arquitetural:

- separar `execucao` de `cobranca`
- cada servico continua existindo como um `Agendamento` proprio
- varios `Agendamento` do mesmo cliente e do mesmo dia podem ser agrupados em uma unica comanda logica
- o checkout final fecha a comanda inteira, mesmo que a execucao tenha sido distribuida entre profissionais diferentes

Regra de vinculacao recomendada:

- prioridade 1: `clienteId`
- prioridade 2: telefone normalizado
- prioridade 3: nome somente como fallback operacional

Observacoes:

- telefone pode ser usado para localizar e agrupar quando o cliente ainda nao estiver cadastrado
- nome sozinho nao deve ser a chave principal, porque gera colisao e erro operacional
- quando o cliente for identificado com seguranca, o sistema deve persistir o mesmo `clienteId` em todos os agendamentos ligados a aquele atendimento

Modelo operacional recomendado:

- `Agendamento` continua sendo a unidade de agenda, execucao, comissao e consumo de estoque
- `Comanda` passa a ser a unidade de cobranca e fechamento
- uma `Comanda` possui 1 cliente, 1 data operacional e N agendamentos
- pagamentos ficam registrados na `Comanda`, nao espalhados entre varios agendamentos
- ao concluir o checkout, todos os agendamentos da comanda mudam para `statusPagamento = pago`

Regras de negocio da comanda:

- so pode agrupar agendamentos do mesmo cliente e do mesmo dia
- agendamentos cancelados nao entram na comanda
- a comanda pode misturar servicos, pacotes, itens extras e produtos
- comissao continua calculada por agendamento, respeitando o profissional executor
- taxa de operadora pode ficar no fechamento da comanda e depois ser distribuida apenas para relatorio, se necessario

Estado atual do produto:

- o sistema ja possui agrupamento logico de agendamentos do mesmo cliente no mesmo dia
- esse agrupamento ja considera `clienteId`, telefone e nome
- o backend ja aceita fechar varios `agendamentoIds` em um unico pagamento

Evolucao recomendada:

- curto prazo: manter o agrupamento logico atual e fortalecer a vinculacao por `clienteId` + telefone
- medio prazo: criar a entidade explicita `Comanda` com `comandaId` em `Agendamento`
- longo prazo: mover pagamentos, descontos, taxa e auditoria de checkout para o nivel de `Comanda`

## Superficies funcionais

### Booking publico

Resolve o salao por `slug` e expoe:

- servicos
- pacotes
- profissionais
- horarios disponiveis
- criacao de agendamento

### Painel admin

Opera:

- agenda
- clientes
- profissionais
- servicos
- produtos
- pacotes
- inbox
- financeiro
- faturas
- suporte

### Painel superadmin

Opera:

- visao global da base
- gestao de saloes
- billing SaaS
- PIX global
- emissao e conferencia de faturas
- suporte operacional

## Billing SaaS

O billing agora esta centralizado em `BillingSettings`.

Campos relevantes:

- configuracao global de PIX
- preco `basic`
- preco `pro`
- preco `enterprise`
- dia de vencimento
- flag de cobranca automatica

O modulo de invoices faz:

- criacao manual de faturas
- geracao automatica mensal por plano
- exposicao de faturas ao salao
- envio de comprovante pelo cliente

## Sessao

Sessoes admin e superadmin usam cookies `httpOnly`.

Isso altera a arquitetura de navegacao:

- frontend fala com a API usando `withCredentials`
- backend passa a ser responsavel direto pela sessao de navegador

## Background jobs

Hoje rodam dentro do processo da API:

- lembretes
- geracao automatica de faturas

Isso simplifica a operacao inicial, mas nao e ideal para multiplas replicas.

## Seguranca arquitetural

Controles relevantes aplicados:

- isolamento por `salaoId`
- permissao por modulo e acao
- webhook com token
- upload autenticado
- headers basicos de seguranca
- rate limit em rotas sensiveis
- superadmin sem fallback inseguro

## Deploy

Modelos ja preparados:

- VPS tradicional com Nginx
- Easypanel com monorepo separado em `/backend` e `/frontend`

## Evolucao recomendada

- worker separado para billing e lembretes
- object storage para uploads
- observabilidade de cron, webhook e integracoes
- ciclo formal de cobranca, inadimplencia e suspensao
