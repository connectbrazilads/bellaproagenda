# Investor Technical FAQ

## 1. O produto já é mais que um MVP?

Sim. A base atual já cobre fluxos operacionais reais: agendamento, atendimento, checkout, caixa por turno, permissões, auditoria, estoque, comunicação, billing e automação assistida. Isso coloca o sistema acima de um MVP de agenda simples.

## 2. A arquitetura atual suporta crescimento inicial?

Sim. A combinação de React, Node/Express, Prisma e PostgreSQL é suficiente para crescimento inicial com boa velocidade de entrega. O principal trabalho futuro está em hardening e background processing, não em troca de stack.

## 3. O sistema é multi-tenant de verdade?

Sim. O modelo de dados é estruturado em torno de `Salao`, com isolamento por tenant nas principais entidades de domínio. Isso dá base clara para expansão da plataforma.

## 4. Existe controle de acesso real ou só ocultação de tela?

Existe controle real. O sistema aplica permissões de módulo, permissões de ação e escopo por profissional no backend. A interface também respeita isso, mas o enforcement principal está na API.

## 5. O uso de IA é cosmético ou operacional?

Hoje ele já é operacional, mas ainda inicial. A integração com Gemini usa tools e contexto real do salão para apoiar conversas e ações ligadas a agendamento. Ainda não é uma camada avançada de automação, mas também não é marketing vazio.

## 6. Quais são os principais riscos técnicos hoje?

Os principais riscos são típicos de maturidade:

- jobs rodando em processo
- uploads em disco local
- billing e lembretes ainda no runtime principal da API
- integrações sem fila e retry robustos
- crescimento de controllers grandes

## 7. Esses riscos exigem reescrita?

Não. Eles pedem evolução incremental. A arquitetura atual suporta um plano claro de endurecimento sem necessidade de rebuild completo.

## 8. O produto já tem sinais de defensibilidade?

Sim. A defensibilidade vem mais da densidade operacional do que de novidade tecnológica isolada. O sistema já combina agenda, caixa, permissão, auditoria, mensageria, billing e IA dentro do mesmo fluxo.

## 9. Onde a plataforma ainda precisa amadurecer mais?

Principalmente em:

- observabilidade
- worker e filas
- resilência do billing automático
- resiliência das integrações
- organização de serviços internos conforme o volume crescer

## 10. Qual é a leitura mais honesta do estágio atual?

É um produto funcional e tecnicamente crível para operação real, com base suficiente para crescer. O próximo desafio é maturidade operacional, não prova de conceito.
