# Matriz de Riscos e Mitigação

## Visão Geral

Esta matriz organiza os principais riscos técnicos e operacionais da plataforma, seu impacto provável e a direção de mitigação recomendada.

## Matriz

| Risco | Tipo | Impacto | Probabilidade | Situação Atual | Mitigação Recomendada |
|---|---|---:|---:|---|---|
| Jobs agendados em processo | Runtime | Alto | Média | Lembretes e parte do billing dependem do processo da API | Extrair worker dedicado e evitar cron duplicado em múltiplas instâncias |
| Uploads em disco local | Infraestrutura | Alto | Média | Arquivos servidos localmente | Migrar para object storage com URL estável e política de retenção |
| Billing automático em runtime único | Operação | Alto | Média | Geração de faturas e verificação de ciclo ainda vivem na API principal | Isolar billing em worker ou job runner dedicado com observabilidade |
| Retry fraco em integrações externas | Integração | Alto | Alta | Falhas ainda são tratadas principalmente em log | Introduzir fila, retry, idempotência e rastreamento de falha |
| Crescimento de controllers monolíticos | Arquitetura | Médio | Alta | Parte da lógica está concentrada em controllers extensos | Modularizar serviços por domínio e mover orquestrações complexas |
| Rate limiting insuficiente | Segurança | Médio | Média | Há proteção inicial nas rotas críticas, mas ainda sem cobertura total | Expandir rate limiting por IP, tenant e tipo de endpoint |
| Segredos por tenant no banco sem cofre dedicado | Segurança | Alto | Média | Chaves de integração ficam em `Salao` | Introduzir criptografia em repouso ou vault de segredos |
| Cobertura parcial de auditoria | Governança | Médio | Média | Só fluxos instrumentados geram log | Ampliar auditoria para mutações críticas e eventos de segurança |
| Consultas analíticas custosas com crescimento | Dados | Médio | Média | Relatórios e dashboards podem crescer em custo | Criar índices, agregações e caminhos de leitura otimizados |
| Duplicidade operacional por ausência de idempotência | Operação | Médio | Média | Notificações e mutações podem depender do fluxo síncrono | Adotar idempotency keys para ações sensíveis |

## Leitura Executiva

Os riscos atuais são, em sua maioria, riscos de maturidade e não de concepção. O sistema não mostra sinais de inviabilidade estrutural; ele mostra sinais de um produto que já pede a próxima camada de hardening.

## Priorização Recomendada

### Prioridade 1

- jobs agendados em processo
- uploads em disco local
- billing automático em runtime único
- retry fraco em integrações

### Prioridade 2

- segredos por tenant sem vault dedicado
- rate limiting insuficiente
- cobertura parcial de auditoria

### Prioridade 3

- crescimento de controllers
- custo de consultas analíticas
- idempotência parcial
