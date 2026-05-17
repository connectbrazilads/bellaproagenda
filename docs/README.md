# Documentação Técnica

Este diretório reúne a documentação arquitetural, operacional e executiva da BellaPro Agenda.

## Leitura recomendada

1. [Arquitetura](./architecture.md)  
Resumo do sistema, módulos, fronteiras e integrações.

2. [Runtime](./runtime.md)  
Como a aplicação executa no navegador, API e jobs em background.

3. [Segurança](./security.md)  
Controles atuais, hardening aplicado e riscos residuais.

4. [Deploy em VPS](./deploy-vps.md)  
Passo a passo para deploy tradicional com Nginx + Node.

5. [Capabilities](./capabilities.md)  
Visão de permissões e capacidades por superfície.

6. [Connectors](./connectors.md)  
Integrações externas e responsabilidades por conector.

7. [Escalabilidade](./scalability.md)  
Limites atuais e próximos passos de crescimento.

8. [Mapa de módulos](./modules.md)  
Organização funcional do produto.

9. [Checklist](./checklist.md)  
Checklist de revisão documental após mudanças relevantes.

## Documentos executivos

1. [Sumário Executivo](./executive-summary.md)  
Leitura rápida sobre produto, arquitetura, riscos e direção técnica.

2. [Matriz de Riscos](./risk-matrix.md)  
Mapa dos principais riscos atuais e sua priorização.

3. [Investor FAQ](./investor-faq.md)  
Perguntas frequentes sobre maturidade técnica, multi-tenant, IA e escalabilidade.

4. [Investor Brief](./investor-brief.md)  
Resumo em inglês para leitura executiva e diligência.

5. [One Pager](./one-pager.md)  
Visão curta de posicionamento, tese e próximos passos.

## Mudanças importantes já refletidas

Esta documentação já considera:

- identidade visual BellaPro
- sessões admin e superadmin por cookie `httpOnly`
- webhook com token
- upload autenticado
- billing centralizado no superadmin
- geração automática mensal de faturas
- alerta de cobrança pendente no dashboard do salão

## Manutenção

A documentação não se atualiza sozinha a partir do código.

Sempre que houver mudança em:

- arquitetura
- segurança
- billing
- deploy
- branding
- integrações

revise os documentos impactados e, se necessário:

- atualize o `README.md`
- atualize os arquivos de `docs/`
- registre um ADR em `docs/decisions/`
