---
name: BellaPro Agenda
description: Sistema de design premium e estético para a plataforma SaaS de agendamento de beleza e estética.
colors:
  primary: "#E29BA8"
  primary-gradient-start: "#edb2bc"
  primary-gradient-mid: "#d88999"
  primary-gradient-end: "#c2737f"
  secondary: "#3B2A35"
  plum: "#3B2A35"
  rose: "#E29BA8"
  blush: "#F7C1B6"
  ivory: "#FAF7F6"
  ink: "#1A1A1F"
  line-light: "rgba(226, 155, 168, 0.18)"
  shadow-light: "rgba(59, 42, 53, 0.45)"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, serif"
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
rounded:
  sm: "4px"
  md: "8px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  brand-button-primary:
    backgroundColor: "linear-gradient(135deg, #edb2bc 0%, #d88999 52%, #c2737f 100%)"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
  brand-button-secondary:
    backgroundColor: "rgba(255, 250, 249, 0.65)"
    textColor: "{colors.plum}"
    rounded: "{rounded.full}"
  brand-input:
    backgroundColor: "rgba(255, 251, 250, 0.78)"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  brand-card-soft:
    backgroundColor: "rgba(255, 251, 250, 0.72)"
    rounded: "{rounded.lg}"
---

## Overview
O sistema de design do BellaPro Agenda foi desenvolvido para evocar uma sensação de acolhimento, sofisticação e profissionalismo. Focado no mercado de estética e beleza de alto padrão, ele adota tipografias refinadas, cores suaves porém contrastantes, sombras suaves e painéis translúcidos com efeito de vidro (*glassmorphism* controlado).

## Colors
A identidade cromática é baseada em tons pastéis e terrosos sutis, contrastando com tons escuros profundos e elegantes:
- **Primary (Rose):** `#E29BA8` (Utilizada em elementos de destaque, botões principais e gradientes de marca).
- **Secondary (Plum):** `#3B2A35` (Tons de roxo escuro cinzento, usados para textos secundários e layouts escuros).
- **Blush:** `#F7C1B6` (Rosa suave, usado para fundos leves e contrastes secundários).
- **Ivory (Fundo Padrão):** `#FAF7F6` (Um off-white ligeiramente quente, que evita o branco puro e traz aconchego).
- **Ink (Texto Padrão):** `#1A1A1F` (Cinza escuro quase preto, que garante um contraste ideal com o fundo Ivory).

O sistema suporta tanto modo claro quanto escuro, adaptando os componentes dinamicamente:
*   **Modo Claro (Padrão):** Fundo Ivory (`#FAF7F6`) e gradientes radiais suaves em tons de Blush.
*   **Modo Escuro:** Combinações de roxo escuro profundo (`#201c24` a `#111015`) com destaques em Rose.

## Typography
A tipografia estabelece um contraste elegante entre um cabeçalho display serifado clássico e um corpo de texto moderno e altamente legível:
- **Display Headings (H1 a H6):** `Playfair Display`, serif. Transmite sofisticação, delicadeza e luxo.
- **Body & Controls:** `Plus Jakarta Sans`, sans-serif. Garante máxima legibilidade em tabelas, agendas, inputs e listagens complexas.

## Elevation
O senso de profundidade e materialidade do sistema é obtido através de sombras suaves e desfoque de fundo:
- **Shadows:** Sombras muito dispersas e com baixa opacidade para simular profundidade real (`0 28px 80px -36px rgba(59, 42, 53, 0.45)`).
- **Backdrop Blurs:** Painéis e modais utilizam `backdrop-filter: blur(24px)` combinado com bordas semitransparentes para criar o efeito de vidro fosco, integrando o componente ao fundo.

## Components
Os principais componentes visuais estilizados no sistema incluem:
- **Primary Button (`.brand-button-primary`):** Botão pill-shaped com gradiente Rose e sombra proeminente, mas sutil.
- **Secondary Button (`.brand-button-secondary`):** Fundo semitransparente Ivory com borda Rose delicada.
- **Inputs (`.brand-input`):** Bordas finas e arredondadas com fundo semitransparente, com destaque de brilho suave e borda ao receber foco.
- **Cards (`.brand-card-soft`):** Bordas arredondadas de 16px e sombreamento difuso.
- **Panels/Modais (`.brand-panel`):** Fundo translúcido com borda suave, sombra ampla e desfoque de fundo.

## Do's and Don'ts

### Do's:
- **Manter contraste legível:** Sempre garanta que textos informativos sobre fundos de destaque (como Rose ou Blush) mantenham uma taxa de contraste alta (mínimo de 4.5:1).
- **Usar Playfair Display para Títulos:** Limite o uso de serifas apenas aos títulos principais para manter o ar elegante e editorial do site.
- **Aplicar suavidade em bordas:** Use cantos arredondados (`8px` para inputs, `16px` para cards, `9999px` para botões) para transmitir suavidade e modernidade.

### Don'ts:
- **Não usar bordas laterais destacadas:** Evite colocar faixas de cor na borda esquerda ou direita de cards ou caixas de alerta.
- **Não aninhar cards:** Nunca posicione um card com sombra dentro de outro card com sombra. Destaque elementos internos usando variações sutis de background.
- **Não usar gradientes de texto:** Evite gradientes no preenchimento de textos, exceto em logos ou títulos display extremamente específicos.
- **Não animar imagens no hover:** Animações de zoom ou rotação em imagens de cards de serviço ou profissionais ao passar o mouse são proibidas por poluição visual.
