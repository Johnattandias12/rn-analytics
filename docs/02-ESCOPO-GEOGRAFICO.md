# Escopo Geográfico — Rio Grande do Norte

## Recorte do projeto

- **Estado inteiro:** 167 municípios (mapa SVG clicável completo).
- **Recorte aprofundado:** Território do Seridó (máxima granularidade socioeconômica + eleitoral).
- **Núcleo de destaque:** Currais Novos (drill-down até zona/seção/bairro/rural).

---

## Território do Seridó

O "Seridó" tem três definições. O projeto adota a **mais ampla (Território de Desenvolvimento do Seridó)**,
para chegar aos ~23-25 municípios pedidos, mas marca a qual microrregião oficial cada um pertence.

### Microrregião Seridó Oriental (10)
Acari · Carnaúba dos Dantas · Cruzeta · **Currais Novos** · Equador · Jardim do Seridó · Ouro Branco · Parelhas · Santana do Seridó · São José do Seridó

### Microrregião Seridó Ocidental (7)
Caicó · Ipueira · Jardim de Piranhas · São Fernando · São João do Sabugi · Serra Negra do Norte · Timbaúba dos Batistas

### Serra de Santana / adjacentes (agregados ao Território do Seridó, ~6)
Bodó · Cerro Corá · Florânia · Lagoa Nova · São Vicente · Tenente Laurentino Cruz

> Total adotado: **~23 municípios**. A lista definitiva (incluir ou não Santana do Matos, Jucurutu)
> será confirmada na fase de coleta cruzando com a base oficial IBGE de regiões geográficas
> imediatas/intermediárias (que substituíram as microrregiões em 2017).

---

## Chaves de identificação

Cada município precisa do **código IBGE (7 dígitos)** e do **código de município TSE**.
O cruzamento TSE↔IBGE é feito por uma tabela de-para (gerada na fase de coleta).

| Município | UF | Cód. IBGE | Cód. TSE | Notas |
|---|---|---|---|---|
| Currais Novos | RN | 2403103 | _a preencher_ | Núcleo de destaque |
| Caicó | RN | 2402006 | _a preencher_ | Maior cidade do Seridó |
| Parelhas | RN | 2410306 | _a preencher_ | |
| _... demais ..._ | | | | preenchido na fase 2 |

> Códigos IBGE acima conferidos manualmente; demais serão preenchidos pelo script de-para.

## Malha territorial (mapa)

- Fonte do GeoJSON/SVG: **IBGE — Malhas Territoriais** (`servicodados.ibge.gov.br/api/v3/malhas`)
  e/ou recorte de `github.com/tbrugz/geodata-br` (RN municípios).
- O mapa SVG do app destaca visualmente o cluster do Seridó e permite clique → drill-down.
