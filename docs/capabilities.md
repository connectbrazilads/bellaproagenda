# Capabilities

## Visão Geral

Este código usa a ideia de capacidade em duas camadas complementares:

- capacidades operacionais de usuário, expressas por permissões de módulo e de ação
- capacidades de execução da IA, expressas por tools declaradas ao assistente Gemini

Essas duas camadas formam, na prática, o modelo de capacidades do produto.

## Filosofia de Abstração

O sistema privilegia capacidades explícitas e centralizadas, em vez de restrições implícitas apenas na interface.

Princípios observáveis no repositório:

- capacidades são sensíveis ao tenant
- capacidades são sensíveis ao papel do usuário
- capacidades são impostas tanto no frontend quanto no backend
- capacidades de mutação são mais granulares do que visibilidade de módulo
- capacidades da IA são limitadas a um conjunto conhecido de tools

## Camadas de Capacidade

### 1. Capacidades de Superfície

Determinadas quais grandes áreas da aplicação um usuário pode acessar.

Exemplos:

- `dashboard`
- `agenda`
- `clientes`
- `financeiro`
- `configuracoes`

### 2. Capacidades de Ação

Refinam o que o usuário pode fazer dentro de uma área permitida.

Exemplos:

- `agenda.criar`
- `agenda.editar`
- `agenda.excluir`
- `financeiro.caixa.fechar`
- `configuracoes.usuarios.criar`

### 3. Capacidades Contextuais

Algumas permissões ainda sofrem restrição adicional por escopo profissional. Um login de `profissional` pode entrar em um módulo, mas só operar sobre dados vinculados ao próprio `profissionalId`.

Esse é um padrão estrutural importante do sistema e deve ser tratado como parte da capacidade efetiva.

### 4. Capacidades de Tool da IA

O assistente Gemini recebe um conjunto explícito de funções. Esse conjunto se comporta como um registry limitado de capacidades automatizadas.

## Schema de Capacidade

### Schema de Acesso de Usuário

```json
{
  "subject": "usuario",
  "role": "recepcao",
  "permissions": [
    "dashboard",
    "agenda",
    "clientes",
    "profissionais"
  ],
  "actionPermissions": [
    "agenda.criar",
    "agenda.editar",
    "agenda.pagamento"
  ],
  "scope": {
    "tenant": "salaoId",
    "professionalRestricted": false
  }
}
```

### Schema de Acesso Restrito a Profissional

```json
{
  "subject": "usuario",
  "role": "profissional",
  "permissions": [
    "dashboard",
    "agenda",
    "remuneracao"
  ],
  "actionPermissions": [
    "agenda.editar",
    "agenda.pagamento"
  ],
  "scope": {
    "tenant": "salaoId",
    "professionalRestricted": true,
    "profissionalId": "uuid"
  }
}
```

### Schema de Capacidade de Conector

```json
{
  "provider": "google_business",
  "mode": "browser",
  "capabilities": [
    "auth_browser",
    "profile_read",
    "locations_discovery"
  ]
}
```

O exemplo acima mantém o formato solicitado no pedido original. O repositório atual não implementa esse provider específico, mas o formato é compatível com uma futura formalização dos conectores.

### Schema de Capacidade da IA

```json
{
  "provider": "gemini_booking_assistant",
  "mode": "api",
  "capabilities": [
    "listar_servicos",
    "listar_profissionais",
    "verificar_horarios",
    "criar_agendamento",
    "consultar_agendamentos",
    "cancelar_agendamento"
  ]
}
```

## Execução de Capacidades em Runtime

### Enforcement no Backend

A execução das capacidades operacionais acontece por middleware:

- `requirePermission(permission)`
- `requireAnyPermission(permissions)`
- `requireActionPermission(permission)`

Isso significa que a interface não é a fonte de verdade. O backend é.

### Enforcement no Frontend

O shell administrativo usa role e snapshots de permissão para:

- exibir ou ocultar itens de menu
- redirecionar usuários de rotas proibidas
- moldar a navegação desktop e mobile

### Execução de Capacidade pela IA

O fluxo Gemini executa tools em loop controlado:

1. envia prompt + histórico + tools
2. recebe zero ou mais function calls
3. executa handlers sobre o domínio
4. retorna resultados das tools ao modelo
5. emite a resposta final

## Modelo de Extensibilidade

O código atual pode evoluir para uma plataforma mais formal de capacidades com mudanças estruturais limitadas.

Direção recomendada:

- definir registries versionados de capacidade
- anexar capacidades a módulos de UI, rotas de API e tool handlers
- compor políticas por role, tenant e escopo do sujeito
- adicionar políticas de auditoria orientadas a capacidade

## Pontos Fortes Atuais

- declarações centralizadas de permissão
- enforcement backend-first
- suporte a escopo por tenant e por profissional
- tools da IA declaradas explicitamente

## Lacunas Atuais

- não existe um registry unificado cobrindo todos os módulos
- não há um specification formal de capability profile por conector
- ainda não existe policy language para composição de condições
- não há um schema global separado de "read vs write" para todo objeto de domínio
