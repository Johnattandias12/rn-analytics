# Plano Geral — Painel Político RN

## Decisões travadas (fase 0)

| Tema | Decisão |
|---|---|
| Objetivo | Os três combinados: institucional FEMURN + inteligência eleitoral + produto público |
| Indicadores | Resultados eleitorais · Perfil do eleitorado · Socioeconômico (IBGE) · Território rural |
| Cargos | Todos (federal + estadual + municipal), **ênfase em vereadores** |
| Período | 2012, 2014, 2016, 2018, 2020, 2022, 2024 |
| Armazenamento | **Híbrido** — JSON estático (painel) + Supabase (consultas granulares por seção) |
| Recorte Seridó | **Território do Seridó completo (~23-25 municípios)** |
| Identidade visual | Institucional FEMURN (azul + verde), caprichado |
| Repositório | **Público** desde o início (GitHub + Vercel) |

## Arquitetura híbrida

```
                    ┌─────────────────────────────┐
   JSON estático    │  Painel principal (rápido)  │   mapa SVG, agregados por
   (no repo) ──────▶│  Next.js 15 / Vercel        │   município, dashboards
                    └──────────────┬──────────────┘   socioeconômicos
                                   │ consultas pesadas
                                   ▼
                    ┌─────────────────────────────┐
   Supabase ───────▶│  Votação por zona/seção,     │   drill-down granular,
   (Postgres)       │  filtros cruzados pesados    │   Currais Novos a fundo
                    └─────────────────────────────┘
```

- **JSON estático:** agregados por município/eleição/cargo, perfil do eleitorado, socioeconômico, GeoJSON do mapa. Tudo versionado, site gratuito e rápido.
- **Supabase:** votação nominal por zona/seção (volume grande), prestação de contas, consultas cruzadas.

## Fases

### Fase 1 — Fundação ✅ (em andamento)
Pasta, docs, base de conhecimento, identidade. Sem código de app ainda.

### Fase 2 — Coleta e catálogo
- Tabela de-para TSE↔IBGE dos 167 municípios.
- Download TSE (RN, 2012–2024) — começar por **vereadores de Currais Novos e Seridó**.
- Coleta IBGE (população, PIB, renda, IDHM, rural/urbano) via SIDRA/API.
- GeoJSON dos municípios do RN (IBGE Malhas).

### Fase 3 — Processamento
- Scripts (Node/Python) → JSONs otimizados em `data/processed/`.
- Carga da camada granular no Supabase.
- Validação de integridade (sem números inventados; fontes registradas).

### Fase 4 — Webapp
- Next.js 15 + Tailwind, identidade FEMURN.
- Mapa SVG clicável do RN com cluster Seridó destacado → drill-down.
- Dashboards: eleitoral, eleitorado, socioeconômico, rural.
- Filtros estruturados: ano, cargo, partido, município, recorte Seridó/Currais Novos.

### Fase 5 — Deploy
- Repo público GitHub.
- Vercel (link público).
- Supabase conectado.
- Entrega do link + checklist de apresentação FEMURN.

## Princípios

- **Integridade de dados acima de tudo** — fonte oficial sempre, número ausente fica ausente.
- **Apresentável** — cada tela precisa ficar bonita o suficiente para abrir numa reunião da FEMURN.
- **Camadas** — começar pelo que impressiona (mapa + Currais Novos/Seridó) e expandir.

## Pendências / a confirmar com o usuário

1. Arquivo do **logo oficial da FEMURN** (para extrair cores/brasão exatos).
2. **Nome/branding** definitivo do produto (sugestões: "RN em Dados", "Panorama RN", "Seridó em Dados").
3. Conta **Supabase** a usar (existente do usuário ou nova).
4. Lista final do Seridó: incluir ou não Santana do Matos / Jucurutu.
