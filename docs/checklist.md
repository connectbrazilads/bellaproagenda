# Checklist de Atualização de Documentação

Use este checklist sempre que uma entrega relevante for concluída.

## Checklist

- houve mudança de arquitetura ou responsabilidade entre frontend, backend, banco ou integrações?
- houve mudança de runtime, jobs, filas, workers ou automações?
- houve mudança em autenticação, autorização, auditoria, sessão ou segurança?
- houve mudança em módulos do produto ou fluxos principais?
- houve nova integração externa ou mudança importante em uma integração existente?
- houve mudança importante em riscos técnicos?
- houve mudança importante no estágio de maturidade da plataforma?
- houve mudança importante no posicionamento executivo/comercial da tecnologia?

## Ações Recomendadas

Se a resposta for `sim` em qualquer item:

- revisar `docs/README.md`
- atualizar os documentos impactados
- avaliar se precisa novo ADR em `docs/decisions/`

## Documentos Mais Comuns por Tipo de Mudança

### Nova feature operacional

- `modules.md`
- `architecture.md`
- `executive-summary.md`

### Nova integração

- `connectors.md`
- `architecture.md`
- `security.md`
- `scalability.md`

### Mudança de permissão ou segurança

- `capabilities.md`
- `security.md`
- `risk-matrix.md`

### Mudança estrutural de backend/runtime

- `runtime.md`
- `architecture.md`
- `scalability.md`
- possivelmente um ADR novo

### Mudança de direção técnica

- `roadmap.md`
- `executive-summary.md`
- `investor-brief.md`
