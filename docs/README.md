# Documentação Técnica

Este diretório reúne a documentação arquitetural e operacional do sistema.

## Leitura Recomendada

0. [Sumario Executivo](./executive-summary.md)
Visao de 1 pagina para fundador, investidor tecnico ou due diligence inicial.

1. [Arquitetura](./architecture.md)
Resumo executivo, componentes centrais, fluxos principais e visão de evolução.

2. [Runtime](./runtime.md)
Explica como a aplicação executa no navegador, na API, em jobs agendados e no fluxo conversacional com IA.

3. [Connectors](./connectors.md)
Documenta integrações externas e superfícies de conexão da plataforma.

4. [Capabilities](./capabilities.md)
Descreve permissões, ações, escopo profissional e tools da IA como modelo prático de capacidades.

5. [Segurança](./security.md)
Resume postura atual de segurança, isolamento, riscos e próximos hardenings.

6. [Escalabilidade](./scalability.md)
Mostra limites atuais, caminhos de crescimento e possíveis evoluções com filas, workers e storage externo.

7. [Mapa de Modulos](./modules.md)
Organiza o produto por areas funcionais e mostra como os modulos se relacionam.

8. [Roadmap Tecnico](./roadmap.md)
Sugere prioridades tecnicas para os proximos 6 a 12 meses.

9. [Investor Technical Brief](./investor-brief.md)
Versao curta para leitura executiva, board, parceiro tecnico ou diligencia inicial.

10. [Matriz de Riscos](./risk-matrix.md)
Tabela objetiva de risco, impacto, probabilidade e mitigacao.

11. [Matriz de Maturidade](./maturity-matrix.md)
Posiciona o produto e a arquitetura em termos de maturidade atual.

12. [One-Pager](./one-pager.md)
Resumo curto e direto da proposta, da base tecnica e da tese de evolucao.

13. [Investor FAQ](./investor-faq.md)
Perguntas e respostas objetivas para diligencia tecnica e conversa com investidores.

14. [Why Athena Wins](./why-athena-wins.md)
Posicionamento tecnico-comercial de por que a plataforma se diferencia.

15. ADRs
- [ADR-0001: Modelo Híbrido Browser + API](./decisions/adr-0001-hybrid-browser-api.md)
- [ADR-0002: Sessões Persistentes Locais](./decisions/adr-0002-persistent-sessions.md)

## Como Usar Esta Documentação

Esta documentação foi escrita para servir a quatro objetivos principais:

- onboarding de engenharia
- revisão técnica de arquitetura
- due diligence de produto/SaaS
- base de referência para futuras decisões estruturais

## Manutenção

Esta documentação nao se atualiza automaticamente a partir do codigo.

Quando houver mudancas relevantes no sistema, a equipe deve revisar a documentacao manualmente. Para isso, use:

- [Guia de Manutencao](./CONTRIBUTING.md)
- [Checklist de Atualizacao](./checklist.md)

## Observação Importante

O pedido original usava linguagem de “runtime de agentes”, “connectors” e “capabilities” em um sentido mais amplo. Aqui esses conceitos foram adaptados com rigor ao que o repositório realmente implementa hoje:

- uma plataforma SaaS web para operação de salão
- integrações com WhatsApp, e-mail e Gemini
- autorização por permissões e ações
- fluxo conversacional assistido por IA
