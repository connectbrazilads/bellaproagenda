# Guia de Manutenção da Documentação

## Objetivo

Esta pasta `docs/` deve funcionar como documentação viva do sistema. Isso significa que mudanças relevantes no produto, na arquitetura ou na operação precisam ser refletidas aqui na mesma janela de entrega sempre que possível.

## Regra Simples

Sempre que uma mudança alterar comportamento, arquitetura, integração, segurança, operação ou posicionamento técnico, a documentação deve ser revisada.

## Quando Atualizar a Documentação

Atualize a documentação quando houver:

- novo módulo ou tela relevante
- mudança de fluxo operacional
- nova integração externa
- alteração de permissões ou segurança
- mudança de arquitetura
- criação de worker, fila, storage externo ou nova estratégia de deploy
- evolução significativa do uso de IA
- mudança relevante em roadmap técnico
- novo risco técnico importante
- mudança na proposta de valor ou na leitura executiva do produto

## Quando Normalmente Não Precisa

Geralmente não é necessário atualizar documentação para:

- correção visual pequena
- ajuste de texto em interface
- refactor interno sem impacto estrutural
- bugfix localizado sem mudar fluxo ou responsabilidade

## Arquivos e Responsabilidades

### Núcleo Técnico

- `architecture.md`
Atualizar quando mudar componentes, fronteiras, fluxos ou responsabilidades.

- `runtime.md`
Atualizar quando mudar execução, jobs, sessão, integração síncrona/assíncrona ou comportamento operacional de runtime.

- `connectors.md`
Atualizar quando entrar, sair ou mudar integração externa.

- `capabilities.md`
Atualizar quando mudar permissões, ações, escopos ou tools da IA.

- `security.md`
Atualizar quando mudar autenticação, credenciais, auditoria, secrets, sessão ou postura de segurança.

- `scalability.md`
Atualizar quando mudar arquitetura de escala, filas, workers, storage ou padrões de carga.

### Camada Executiva

- `executive-summary.md`
Atualizar quando a leitura estratégica do produto mudar.

- `modules.md`
Atualizar quando entrar ou sair módulo relevante.

- `roadmap.md`
Atualizar quando a prioridade técnica dos próximos ciclos mudar.

- `investor-brief.md`
Atualizar quando a tese técnica ou estágio do produto mudar de forma relevante.

- `risk-matrix.md`
Atualizar quando surgir ou desaparecer risco importante.

- `maturity-matrix.md`
Atualizar quando a plataforma subir claramente de patamar em alguma área.

- `one-pager.md`, `investor-faq.md`, `why-athena-wins.md`
Atualizar quando posicionamento, diferenciação ou narrativa executiva mudarem.

## Checklist Rápido por Entrega

Antes de concluir uma entrega, validar:

- a mudança alterou fluxo do usuário?
- a mudança alterou responsabilidade de backend ou frontend?
- a mudança alterou autenticação, permissão ou segurança?
- a mudança adicionou ou modificou integração?
- a mudança alterou o roadmap recomendado?
- a mudança alterou a leitura de risco ou maturidade?

Se qualquer resposta for `sim`, a documentação deve ser revisada.

## Processo Recomendado

1. implementar a mudança no sistema
2. identificar impacto documental
3. atualizar os arquivos mínimos necessários
4. revisar se `docs/README.md` continua apontando para a trilha correta
5. registrar nova decisão em `docs/decisions/` se houver trade-off arquitetural relevante

## Nível de Detalhe Esperado

A documentação deve ser:

- fiel ao código real
- curta o suficiente para ser útil
- profunda o suficiente para onboarding e diligência
- honesta sobre limitações e próximos passos

## Regra de Ouro

Não documentar o que se gostaria que existisse. Documentar o que realmente existe hoje, deixando hipóteses e evoluções futuras explicitamente marcadas como próximas etapas.
