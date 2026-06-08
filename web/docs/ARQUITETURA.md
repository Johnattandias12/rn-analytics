# RN Analytics — Arquitetura e modelo de dados

Mapa do projeto para retomar o trabalho sem se perder.

## Stack

- Next.js 16.2.7 (Turbopack, App Router), React 19, TypeScript strict, Tailwind CSS v4.
- SPA client-side: `app/page.tsx` monta `<App />`; a navegação é por estado + hash (`#visao`, `#mapa`, ...), com botão voltar do navegador funcionando.
- Mapas: `d3-geo` (SVG do RN e esquema de CN) e Leaflet + tiles CARTO `light_all` (mapa de ruas de CN, carregado com `next/dynamic` e `ssr:false`).
- Relatórios client-side: `jspdf` + `jspdf-autotable` (PDF), `xlsx` (planilha), CSV manual.
- Dados: arquivos estáticos em `public/data` (não consome Supabase em runtime — decisão do projeto).

> `AGENTS.md` avisa: esta versão do Next pode ter breaking changes. Conferir `node_modules/next/dist/docs/` antes de escrever código de framework.

## Navegação (em `components/App.tsx`)

Grupos do menu lateral:
- **Panorama do RN**: Visão Geral, Dashboard, Mapa do RN, Pesquisas 2026.
- **Currais Novos & Seridó**: Vereadores, Análise (redutos + consultas), Tendências (evolução + projeção).
- **Info**: Sobre.

## Componentes principais

| Arquivo | Papel |
|---|---|
| `components/App.tsx` | shell, sidebar, topbar, roteamento por hash, carga do bundle |
| `components/RNMap.tsx` | SVG clicável dos 167 municípios (d3-geo), Seridó destacado em dourado |
| `components/CNVotingMap.tsx` | mapa esquemático de CN (contorno + bolhas por colégio) |
| `components/CNStreetMap.tsx` | mapa de ruas (Leaflet) de CN, círculos por colégio; invalidateSize + ResizeObserver |
| `components/CandidateModal.tsx` | modal do candidato: resumo + votação por COLÉGIO (nome, bairro, seções) + PDF |
| `components/ui.tsx` | `Card`, `Mini`, `SectionTitle`, `Reveal`, `useCountUp` |
| `lib/data.ts` | tipos + helpers (`fmtInt`, `fmtReais`, `partidoLabel`, `PARTIDOS`) |
| `lib/export.ts` | `exportCSV`, `exportXLSX`, `exportPDF` (com KPIs, intro e seções extras) |

Abas em `components/tabs/`: `OverviewTab`, `DashboardTab`, `MapTab`, `PesquisasTab`, `VereadoresTab`, `AnaliseTab` (→ `MapaVotacaoTab` + `ConsultasTab`), `TendenciasTab` (→ `EvolucaoTab` + `PredictionTab`), `SobreTab`.

## Modelo de dados (`public/data`)

- `rn-municipios.geojson` — malha dos 167 municípios. **Winding CW exterior** (esperado pelo d3-geo, oposto do RFC7946). `.bak` é o original; não reverter.
- `socioeconomico-rn.json` — `{ municipios: Socio[] }` (população 2022, área, densidade, PIB 2021).
- `municipios-rn.json`, `depara-tse-ibge.json` — apoio (nomes, de-para código TSE↔IBGE).
- `eleicao/serido-vereador-{2012,2016,2020,2024}.json` — `{ municipios: MunicipioVereador[] }`, candidatos com `sq`, votos, rank (sem `por_local`).
- `eleicao/cn/currais-novos-{2016,2020,2024}.json` — granular de Currais Novos:
  - `locais[]`: `{ nr, nome (colégio), endereco, bairro, lat, long, eleitores, n_secoes, vereador_total, prefeito_total }`
  - `vereador` / `prefeito`: `{ total_nominais, brancos, nulos, legenda, candidatos[] }`, cada candidato com `por_local: { [nr]: votos }`.
  - **O `sq` do candidato bate entre `serido-*` e `cn/*`** — é assim que o `CandidateModal` cruza a lista do Seridó com o detalhamento por colégio.
- `eleicao/currais-novos-vereador-2024-secao.json` — voto por zona/seção (sem nome de colégio). Legado: o produto hoje mostra por COLÉGIO (que tem nome e coordenada), não por seção crua.
- `eleicao/evolucao-vereador-serido.json` — séries para a aba Evolução.
- `eleicao/pesquisas-rn-2026.json` — pesquisas de governo/senado (registro TSE fica `null` quando não confirmado; nunca inventar).
- `eleicao/situacao-eleitoral.json` — **situação OFICIAL** de cada candidato (eleito/suplente/não eleito), do TSE `consulta_cand` campo `DS_SIT_TOT_TURNO`, chaveado por `sq` e ano (2012/2016/2020/2024). Enum: `ELEITO_QP`, `ELEITO_MEDIA`, `ELEITO`, `SUPLENTE`, `NAO_ELEITO`, `SEGUNDO_TURNO`. Lido por `lib/eleicao.ts` (`getSit`, `sitTag`). NÃO é cálculo — é o resultado oficial. Não reflete cassações posteriores. Reconstruir: baixar `consulta_cand_{ano}.zip` do TSE, extrair `_RN.csv`, filtrar pelos `sq` do painel.

Código IBGE de Currais Novos: **2403103** (cd_tse 16616).

## Relatórios PDF (`lib/export.ts`)

`exportPDF({ filename, title, subtitle?, intro?, kpis?, table, sections? })`:
- cabeçalho com a marca, faixa de acento royal→verde, data de emissão;
- KPIs em cartões com barra de acento;
- tabela principal + `sections[]` (cada uma com título, nota e tabela própria) para relatórios completos;
- rodapé com fontes + numeração de páginas em todas as páginas.

Onde é usado: modal do candidato (por colégio), Vereadores (recorte filtrado), Mapa do RN (relatório completo do município, socioeconômico + eleitoral), Consultas (comparador de redutos, abstenção).

## Decisões e pendências conscientes

- **Dark mode**: adiado. Exige refatorar `--navy`/`--royal` em tokens semânticos (texto vs preenchimento) antes de inverter.
- **Ingestão em tempo real do TSE**: badge de "pesquisa nova" no app já funciona (via `localStorage`); o cron externo + canal de notificação ficou pendente da decisão do canal.
- **Supabase**: schema existe, mas não é consumido em runtime (dados servidos como JSON estático).

## Build, deploy

```
npm run dev        # desenvolvimento
npx tsc --noEmit   # type-check
npm run build      # build de produção
```
Deploy na Vercel, alias `rn-analytics.vercel.app`. Commits terminam com `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
