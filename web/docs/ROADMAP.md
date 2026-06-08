# RN Analytics — Roadmap e próximas funções

Lista viva do que já existe e do que dá para implementar nas próximas rodadas. Atualizar conforme avançar.

## Estado atual (entregue)

- Navegação por hash com histórico; sidebar retrátil; mobile (anti-zoom iOS, bottom-sheet, segmented rolável).
- Mapa do RN (SVG d3-geo, 167 municípios, Seridó destacado) com relatório completo do município em PDF (socioeconômico + vereadores).
- Mapa de redutos de Currais Novos: Leaflet (ruas) + esquemático (SVG), por colégio/coordenada, vereador e prefeito.
- Vereadores: filtros (ano, busca, partido, votos mín., ordenação), exportação CSV/XLSX/PDF.
- Modal do candidato: votação por colégio (nome+bairro+seções) + situação oficial + relatório PDF. Renderizado via portal (não quebra mais).
- Pesquisas 2026: por pesquisa e comparativo (matriz + drill-down + insights + PDF). Badge de pesquisa nova (localStorage).
- Dashboard, Evolução (2012-2024) e projeção; Consultas (comparador de redutos, correlação, abstenção, todos com PDF).
- **Situação eleitoral OFICIAL do TSE** (eleito/suplente/não eleito) em todo o painel.

## Pendências conscientes (decisão tomada)

- **Dark mode** — exige refatorar tokens de cor em semânticos (texto vs preenchimento), porque `--navy` é os dois. Não inverter direto.
- **Cron em tempo real do TSE** — hoje só badge in-app; o disparo externo depende de escolher o canal (WhatsApp/e-mail).
- **"Atual no cargo"** — o dado de situação é o resultado da eleição (diplomação). Cassações/renúncias pós-eleição NÃO estão no `consulta_cand`. Para isso, usar DivulgaCand/notícias (fonte adicional).

## Dados que dá para acrescentar (todos TSE/IBGE, oficiais)

Reaproveitar o pipeline do `situacao-eleitoral.json` (baixar zip do TSE, extrair `_RN.csv`, casar por `SQ_CANDIDATO`/`sq`, filtrar e gerar JSON enxuto).

1. **Perfil dos candidatos** (`consulta_cand_{ano}_RN.csv`, mesmas colunas já baixadas):
   - idade (`NR_IDADE_DATA_POSSE`), gênero (`DS_GENERO`), grau de instrução (`DS_GRAU_INSTRUCAO`), ocupação (`DS_OCUPACAO`), cor/raça (`DS_COR_RACA`), estado civil.
   - Habilita: gráficos de perfil da câmara/eleitos, filtros por gênero/escolaridade.
2. **Votação nominal por seção de TODOS os municípios** (`votacao_secao_{ano}_RN.csv` ou `votacao_candidato_munzona`): hoje só Currais Novos é granular. Extender redutos/colégios para o Seridó inteiro.
3. **Bens declarados** (`bem_candidato_{ano}_RN.csv`): patrimônio por candidato → coluna no modal + ranking.
4. **Prestação de contas / doações** (`prestacao_contas_*`): receitas e doadores por candidato.
5. **Coligações/federações** (`consulta_cand`): composição das chapas.
6. **IBGE/DATASUS/INEP**: IDHM, leitos/saúde, IDEB/educação, FPM por município → cruzamentos no Consultas.
7. **Prefeito atual + partido** por município (estava no .pbix da FEMURN) → enriquecer o painel socioeconômico.

## Notas de manutenção

- Integridade: nunca inventar número/pesquisa/situação. Valor ausente fica "—". Fonte sempre rastreável.
- Copy sem travessão (—) e sem cara de IA. Ver `IDENTIDADE.md`.
- Deploy: `npx tsc --noEmit` + `npm run build`, depois `vercel deploy --prod --yes` e `vercel alias set <deploy> rn-analytics.vercel.app`.
- Screenshot via Edge headless está instável nesta máquina (sai 0 sem gravar); validar por build + HTTP 200.
