# Catálogo de Fontes de Dados

Todas as fontes são **dados abertos oficiais**. Cada dataset processado deve registrar
fonte, data de acesso e ano-base, para que os números sejam citáveis na apresentação à FEMURN.

---

## 1. TSE — Tribunal Superior Eleitoral (eleitoral)

**Portal de Dados Abertos:** https://dadosabertos.tse.jus.br/

| Dataset | O que tem | Granularidade | Anos |
|---|---|---|---|
| Resultados (votação) | Votos por candidato/partido | Município · Zona · Seção | 2012–2024 |
| Candidatos | Perfil de candidatos, situação, bens | Por eleição/cargo | 2012–2024 |
| Perfil do eleitorado | Sexo, idade, escolaridade, deficiência | Município · Zona | anual |
| Prestação de contas | Receitas/despesas de campanha | Por candidato | 2012–2024 |

- Download por UF/ano em arquivos `.zip` com `.csv` (separador `;`, encoding `latin-1`).
- Padrão de URL: `cdn.tse.jus.br/estatistica/sead/odsele/...`
- **Foco:** filtrar UF = RN, cargo = Vereador (camada principal) + demais cargos.

## 2. IBGE — socioeconômico e territorial

**API:** https://servicodados.ibge.gov.br/api/docs · **SIDRA:** https://apisidra.ibge.gov.br/

| Indicador | Fonte IBGE | Endpoint base |
|---|---|---|
| População (Censo 2022) | Censo Demográfico 2022 | SIDRA tabela 4709/9514 |
| PIB municipal | PIB dos Municípios | SIDRA tabela 5938 |
| Renda / rendimento | Censo 2022 / PNAD | SIDRA |
| IDHM | Atlas do Desenvolvimento (PNUD/IPEA) | atlasbrasil.org.br |
| Educação / matrículas | Censo Escolar (INEP) | inepdata |
| Saneamento | Censo 2022 (domicílios) | SIDRA |
| Rural vs urbano | Censo 2022 (situação do domicílio) | SIDRA |
| Malha de municípios | Malhas Territoriais | `/api/v3/malhas/estados/24?formato=application/vnd.geo+json` |
| Localidades / códigos | Localidades | `/api/v1/localidades/estados/24/municipios` |

> RN = código UF **24** na base IBGE.

## 3. INCRA / território rural

| Dataset | Fonte | Uso |
|---|---|---|
| Assentamentos da reforma agrária | Acervo Fundiário INCRA (certificacao.incra.gov.br / dados.gov.br) | mapear áreas rurais do Seridó |
| Agropecuária | Censo Agropecuário 2017 (IBGE) | atividade rural por município |

## 4. Complementares (a avaliar)

- **Atlas Brasil (PNUD/IPEA)** — IDHM e séries históricas municipais.
- **DataSUS** — indicadores de saúde, se entrarem no socioeconômico.
- **Portal da Transparência / SICONFI** — finanças municipais (receita/despesa), útil ao público FEMURN.

---

## Princípios de integridade

1. **Nunca inventar número.** Se um dado não existir para um ano/município, marcar como ausente.
2. **Rastreabilidade.** Todo JSON processado carrega `source`, `accessedAt`, `baseYear`.
3. **De-para TSE↔IBGE** validado antes de cruzar eleitoral com socioeconômico.
