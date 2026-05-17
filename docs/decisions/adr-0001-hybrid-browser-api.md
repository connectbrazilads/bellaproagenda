# ADR-0001: Modelo Híbrido de Aplicação Browser + API

- Status: Aceito
- Data: 2026-05-15

## Contexto

O repositório precisava de um modelo de aplicação capaz de sustentar:

- uma experiência pública de autoatendimento para agendamento
- um painel autenticado de operação do salão
- fluxos de domínio multi-tenant
- integrações externas como WhatsApp e IA

O prompt usado para solicitar esta documentação faz referência a uma “hybrid browser + API architecture”. No contexto real do repositório, isso significa uma SPA no navegador acoplada a uma API HTTP central, e não automação de browser ou agentes remotos de browser.

## Decisão

Adotar um modelo híbrido com:

- clientes React/Vite para experiências pública e administrativa
- uma API central em Node.js/Express para regras de negócio e integrações
- PostgreSQL/Prisma como system of record
- APIs externas para mensageria, IA e e-mail

## Justificativa

Essa arquitetura combina com a forma real do produto:

- interface operacional altamente interativa
- forte necessidade de validação e autorização no servidor
- integrações externas relevantes, porém limitadas
- necessidade de velocidade de evolução

O navegador fica responsável por apresentação, navegação e continuidade local de sessão. A API permanece como camada autoritativa para:

- agenda
- caixa
- estoque
- financeiro
- permissões
- auditoria
- orquestração de integrações

## Consequências

### Positivas

- velocidade alta de desenvolvimento full-stack
- controle forte do backend sobre autorização e integridade
- roteamento multi-tenant simples
- integração direta com APIs externas
- complexidade operacional baixa para o estágio atual

### Negativas

- sessão persistida no navegador aumenta sensibilidade a XSS
- jobs em background ainda não estão desacoplados da API
- uploads locais são um fit ruim para escala horizontal
- integrações síncronas podem ampliar latência em requests

## Alternativas Consideradas

### 1. Cliente Rico com Backend Mínimo

Rejeitada porque:

- regras de negócio e autorização são sensíveis demais para migrar ao cliente
- isolamento de tenant precisa de enforcement backend
- credenciais de integração não podem viver no browser

### 2. Runtime de Conectores com Automação de Browser

Rejeitada porque:

- o produto atual é bem atendido por APIs diretas e aplicação web convencional
- não há evidência no repositório de necessidade estrutural de browser remoto
- isso adicionaria complexidade infra cedo demais

### 3. Microserviços Completamente Separados Desde o Início

Rejeitada porque:

- o overhead operacional seria maior do que o benefício no estágio atual
- o domínio ainda está evoluindo rapidamente
- um monólito modular entrega melhor relação custo/velocidade neste momento

## Próximos Passos

Manter o modelo browser + API, evoluindo gradualmente:

- isolamento de background jobs
- arquitetura de storage
- resiliência das integrações externas
- formalização de capacidades e conectores
