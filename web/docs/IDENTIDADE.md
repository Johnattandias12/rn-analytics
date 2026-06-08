# RN Analytics — Identidade visual e de produto

Documento-fonte da identidade. Sempre consultar antes de mexer em cor, tipografia, tom de voz ou layout, para o projeto não perder consistência.

## O que é

Plataforma de inteligência eleitoral e socioeconômica do Rio Grande do Norte, construída sobre dados públicos oficiais (TSE e IBGE). Público: políticos, assessorias, imprensa e cidadãos. Cobertura: 167 municípios do RN, recorte aprofundado no Seridó (23 municípios) e núcleo granular em Currais Novos (voto por colégio).

Desenvolvido pela Beyonder IA · Johnattan Dias.

## Marca

- Wordmark: "RN" em navy + "Analytics" em royal.
- Logo: quadrado navy arredondado com um "N" estilizado em branco, ponto dourado (acento) e barra verde na base. Ver `components/App.tsx` (`Logo`) e `app/icon.svg`.
- Domínio oficial: `rn-analytics.vercel.app` (o sem hífen está tomado por outra conta).

## Cores (tokens em `app/globals.css`)

| Token | Hex | Uso |
|---|---|---|
| `--navy` | `#182551` | texto forte, títulos, preenchimento escuro de mapa, marca |
| `--navy-2` | `#21306b` | gradientes |
| `--royal` | `#0c529a` | cor de ação/links, destaque ativo |
| `--royal-2` | `#2f7dc4` | gradientes, barras |
| `--green` | `#009b3a` | acento (bandeira do RN), barras de partido |
| `--gold` | `#f4c20d` | destaque/seridó, topo das escalas, "reduto" |
| `--ink` / `--ink-2` | `#0b1020` / `#3a4254` | texto corpo |
| `--muted` | `#767f93` | legendas, texto secundário |
| `--line` / `--line-2` | `#e9edf4` / `#eef1f7` | bordas |
| `--bg` | `#f4f7fc` | fundo |

Atenção: `--navy` é usado ao mesmo tempo como texto e como preenchimento. Por isso **dark mode exige refatorar para tokens semânticos** (ex.: `--text-strong` vs `--fill-strong`) antes de inverter — não basta trocar os valores.

Escala dos mapas (menos → mais voto): `#b4ceeb → #7fa9d6 → #4f86c2 → #1f5da3 → #0c3f7e`, com `#caa106` (dourado) no topo (> 82%).

## Tipografia e estilo

- Sistema Apple-like: pesos fortes (800) com `letter-spacing` negativo nos títulos (`.h-display`, `.wordmark`).
- Números sempre com `tnum` (tabular-nums) para alinhar colunas.
- Cartões: `--radius` 20px, sombras suaves em camadas, hover com leve `translateY`.
- Controles: segmented control estilo iOS (`.segment`), botões pill (`.btn`, `.btn-primary`, `.btn-ghost`).

## Tom de voz (copy)

- Português correto, com acentuação completa. Direto e sóbrio.
- **Sem travessão (—) no texto de interface e relatórios.** Usar vírgula, ponto ou parênteses.
- Sem "cara de IA": nada de "Em resumo", "vale ressaltar", listas pomposas. Frases naturais.
- Integridade acima de tudo: nunca inventar número, pesquisa, registro TSE ou nome. Valor ausente fica em branco ("—"), nunca estimado sem indicação. Toda informação é rastreável (fonte + ano + data de acesso).

## Affordance (o que é clicável precisa parecer clicável)

- Linhas/itens clicáveis: `cursor-pointer`, hover com fundo `#f1f6fd` e leve deslize, chevron persistente (opacity ~40%) que vai a 100% no hover.
- Botões de ação secundária (PDF por linha): ícone visível em opacity ~50%, 100% no hover.
- Faixa de instrução no topo de listas clicáveis ("Toque em um candidato para...").

## Mobile (iPhone)

- Inputs no mobile usam `font-size: 16px` para não disparar zoom no iOS (regra global em `globals.css`).
- Modais viram bottom-sheet com botões full-width.
- Tabelas largas em `overflow-x-auto`; grids de 2 colunas no celular, mais colunas no desktop (`lg:`).
- `-webkit-tap-highlight-color: transparent` e respeito a `prefers-reduced-motion`.
