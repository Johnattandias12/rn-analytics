# Painel Político RN — Dados Eleitorais e Socioeconômicos do Rio Grande do Norte

> Plataforma interativa de análise de dados políticos, eleitorais e socioeconômicos do
> estado do Rio Grande do Norte (2012 → 2024), com mapa SVG clicável dos 167 municípios,
> dashboards filtráveis e recorte aprofundado na **Região do Seridó** e em **Currais Novos**.

**Status:** 🟡 Em construção (fundação)
**Stack:** Next.js 15 · React · Tailwind · Recharts/visx · GeoJSON/SVG · Supabase (camada granular)
**Identidade:** institucional FEMURN (azul + verde)
**Visibilidade:** repositório público · deploy Vercel

---

## Objetivo

Painel que atende três públicos ao mesmo tempo:

1. **Institucional (FEMURN)** — apresentação caprichada, dados confiáveis e citáveis, storytelling socioeconômico regional.
2. **Inteligência eleitoral** — análise de votação, redutos e desempenho por município / zona / seção, com **vereadores** como camada de maior profundidade.
3. **Produto público** — portal de transparência consultável e exportável por qualquer cidadão ou jornalista.

## Blocos de indicadores

- **Resultados eleitorais** — votação por município/zona/seção, candidatos, partidos, coligações, 2º turno (TSE).
- **Perfil do eleitorado** — sexo, faixa etária, escolaridade, deficiência, biometria (TSE).
- **Socioeconômico** — população, PIB, renda, IDHM, educação, saneamento, Censo 2022 (IBGE).
- **Território rural** — rural vs urbano, agropecuária, assentamentos, eleitorado rural (IBGE/INCRA), com foco no Seridó.

## Escopo

| Dimensão | Cobertura |
|---|---|
| Geográfica | 167 municípios do RN · recorte aprofundado: **Território do Seridó (~23-25 mun.)** · núcleo: **Currais Novos** |
| Temporal | Eleições **2012, 2014, 2016, 2018, 2020, 2022, 2024** |
| Cargos | Federal + Estadual + Municipal · **ênfase em vereadores** |
| Dados | Híbrido: JSON estático (painel) + Supabase (consultas granulares por seção) |

## Estrutura do repositório

```
painel-politico-rn/
├── README.md                  ← este arquivo
├── docs/
│   ├── 00-PLANO.md            ← plano geral, fases e decisões travadas
│   ├── 01-FONTES-DADOS.md     ← catálogo de fontes (TSE, IBGE, INCRA) com URLs
│   └── 02-ESCOPO-GEOGRAFICO.md← municípios, microrregiões, códigos IBGE/TSE
├── data/
│   ├── raw/                   ← downloads brutos (gitignored, exceto amostras)
│   └── processed/            ← JSONs otimizados servidos ao app
├── scripts/                  ← pipeline de coleta e processamento
└── app/                      ← webapp Next.js (criado na fase 4)
```

## Roadmap

- [x] Fase 0 — Requisitos e decisões
- [ ] Fase 1 — Fundação (pasta, docs, base de conhecimento) ← **atual**
- [ ] Fase 2 — Catálogo e coleta de fontes (TSE/IBGE/INCRA)
- [ ] Fase 3 — Pipeline de processamento → JSONs + GeoJSON
- [ ] Fase 4 — Webapp Next.js (mapa SVG + dashboards + filtros)
- [ ] Fase 5 — Deploy GitHub + Vercel + Supabase

---
🤖 Projeto estruturado com [Claude Code](https://claude.com/claude-code)
