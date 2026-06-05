# Supabase — Camada granular do RN Analytics

> **IMPORTANTE (pra não se perder):** o RN Analytics **não tem projeto Supabase próprio**.
> A org `jdchefe` estava no limite de 2 projetos free, então os dados moram num **schema
> isolado `rn_analytics` DENTRO do projeto Axon**. Nada disso encosta nas tabelas do Axon
> (que ficam no schema `public`). Se um dia liberar um slot, é só migrar o schema para um projeto dedicado.

## Coordenadas

| item | valor |
|---|---|
| Org | `jdchefe` (`dtlamvlrxdstgwrdshko`) |
| Projeto (host) | **Axon** — ref `qirogiafdyyvsuxspepq` (region us-east-1) |
| Schema | `rn_analytics` (isolado; **não** exposto na API pública) |
| Extensão usada na carga | `http` (em `extensions`) — puxa os JSON públicos da Vercel |

## Tabelas (carga validada)

| tabela | linhas | conteúdo |
|---|---|---|
| `municipios` | 167 | código IBGE, nome, microrregião, mesorregião, `is_serido` (23), `cd_tse` |
| `socioeconomico` | 167 | população 2022, área, densidade, PIB 2021, PIB per capita |
| `candidatos_vereador_2024` | 784 | vereadores do Seridó: nome, número, partido, votos, rank por município |
| `locais_votacao_2024` | 113 | locais de votação do Seridó com endereço |
| `votos_secao_cn_2024` | 6.190 | **granular**: voto × zona × seção × candidato em Currais Novos (102 seções, 24.331 votos) |

## Views

- `vw_municipio_completo` — municípios + socioeconômico (167).
- `vw_cn_votos_secao` — granular de Currais Novos com nome/partido do candidato (base de redutos/previsão).
- `vw_vereador_2024_resumo` — resumo por município do Seridó (candidatos, votos nominais).

## Como a carga é feita (reproduzível)

A carga **não** usa INSERTs colados. Os JSON processados ficam públicos em
`https://rn-analytics.vercel.app/data/...` e são puxados pelo Postgres via `extensions.http_get`,
fazendo `insert ... select` a partir de `jsonb_array_elements`. Vantagens: barato, idempotente,
e qualquer atualização do dado é só reprocessar + redeploy + rerodar o SQL.

SQL de carga versionado em `data/processed/supabase/` (gerado por `scripts/gen-supabase-sql.mjs`)
e também aplicável via MCP. Migrations DDL aplicadas: `rn_analytics_schema_inicial`,
`rn_analytics_enable_http`, `rn_analytics_views`.

## Próximos passos da camada

1. Expandir `candidatos`/`votos_secao` para os demais anos (2012/16/20) e cargos (2014/18/22).
2. Geolocalizar `locais_votacao` (lat/long) via dataset TSE de locais de votação.
3. Quando o app precisar consultar o Supabase direto: expor `rn_analytics` via PostgREST
   (`ALTER ROLE ... set pgrst.db_schemas`) **ou** criar RPCs em `public` que leem de `rn_analytics`
   (preferível, pra não misturar com a API do Axon).
