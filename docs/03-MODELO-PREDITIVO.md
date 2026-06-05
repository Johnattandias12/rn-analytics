# Modelo de Dados Preditivo — Inteligência Eleitoral

> Esquema de dados e engenharia de features para **previsão e projeção** eleitoral no RN,
> com foco em **vereadores (Seridó/Currais Novos)** e nos pleitos-alvo **2026 e 2028**.
> Saída: insights acionáveis para candidatos, 100% baseados em dado público agregado.

---

## 0. Fronteira legal e ética (importante)

- O TSE divulga voto **agregado por seção eleitoral** — nunca o voto individual de eleitor.
- Perfil do eleitorado também é **agregado** (contagem por sexo/idade/escolaridade por zona/seção).
- Portanto: prevemos comportamento de **territórios** (seções, locais, bairros), não de pessoas.
- Uso = consultoria política legítima sobre dados abertos. Sem LGPD-risco de dado pessoal.
- Regra de ouro do projeto: **nunca inventar número**; ausência fica `null`; toda métrica carrega fonte+ano.

---

## 1. Unidade de análise

Granularidade escolhida: **seção eleitoral**, agrupável por **local de votação geolocalizado**.

```
Estado (RN)
 └─ Município (cód. IBGE + cód. TSE)
     └─ Zona eleitoral
         └─ Local de votação  (endereço + lat/long)   ← unidade espacial p/ mapa de redutos
             └─ Seção eleitoral                         ← unidade mínima de voto
```

Cada seção/local recebe um rótulo **urbano/rural** (via endereço + malha IBGE) — base do mapeamento rural pedido.

---

## 2. Tabelas-núcleo (fato e dimensão)

### Fato: `votos_secao`
| campo | descrição |
|---|---|
| ano, turno | pleito |
| cargo | Vereador, Prefeito, Gov, Dep. Est/Fed, Senador, Presidente |
| municipio_tse, zona, secao | chaves de localização |
| local_votacao_id | liga ao local geolocalizado |
| numero_candidato, partido, coligacao | identificação do voto |
| votos | quantidade (agregado oficial) |

### Fato: `comparecimento_secao`
| campo | descrição |
|---|---|
| ano, turno, municipio_tse, zona, secao | chaves |
| aptos, comparecimento, abstencao | eleitores |
| votos_validos, brancos, nulos | composição |

### Dimensão: `locais_votacao`
endereço, bairro, lat, long, urbano/rural, município, zona, seções vinculadas.
Fonte: TSE *eleitorado locais de votação* (traz lat/long nos anos recentes).

### Dimensão: `eleitorado_perfil`
por zona/seção e ano: total, faixa etária, sexo, escolaridade, estado civil, deficiência, biometria.

### Dimensão: `candidatos`
nome, número, partido, coligação, ocupação, gênero, idade, situação (eleito/não), votos totais.
+ opcional `prestacao_contas`: receitas/despesas de campanha.

### Dimensão: `socioeconomico` (já coletada — IBGE)
população, PIB, PIB/capita, densidade, e (a coletar) renda, escolaridade, IDHM, rural/urbano, saneamento.

---

## 3. Features de modelagem (engenharia)

Derivadas por local/seção e por município, para alimentar os modelos:

**Histórico e tendência**
- share_voto[cargo, partido, ano] e variação entre eleições (swing)
- volatilidade eleitoral (índice de Pedersen local)
- força de incumbência (bônus do reeleito)

**Comparecimento**
- taxa de abstenção e tendência; % brancos+nulos (voto de protesto/reprimido)
- "potencial mobilizável" = aptos × abstenção histórica

**Transferência de votos (inferência ecológica)**
- matriz origem→destino entre dois pleitos por local (King's EI / método de fronteiras)
- detecção de sangria e captura de base

**Socioeconômico (covariáveis)**
- renda, escolaridade, idade média, % rural, densidade por local/município
- correlação e regressão voto ~ covariáveis

**Espacial**
- vizinhança de locais (autocorrelação de Moran), clusters de reduto (LISA)

---

## 4. Alvos de previsão

| Pleito | Cargos-alvo | Base de treino |
|---|---|---|
| **2026** | Governador, Senador, Dep. Federal/Estadual | 2014, 2018, 2022 |
| **2028** | Prefeito e **Vereador** (Seridó/Currais Novos) | 2012, 2016, 2020, 2024 |

Abordagens (fase de modelagem, pós-coleta):
- baseline: média móvel de share + ajuste de swing estadual;
- regressão (share ~ socioeconômico + histórico + comparecimento);
- séries temporais por local; ensemble para projeção com intervalo de confiança.

---

## 5. Módulos de insight para candidatos (viram telas do painel)

1. **Mapa de redutos & bases** — onde o candidato/partido é forte/fraco por local; calor de votos.
2. **Transferência de votos** — para onde a base migrou entre eleições; crescimento × sangria.
3. **Abstenção & comparecimento** — onde há voto reprimido e zonas de mobilização prioritária.
4. **Correlação socioeconômica** — perfil dos territórios que votam em cada força; base das projeções.
5. **Projeção/cenários** — estimativa para 2026/2028 com intervalo, simulação de cenários ("e se").

Cada módulo expõe um número-fonte e permite drill-down até a seção.

---

## 6. Plano de coleta (encaixa neste modelo)

1. De-para TSE↔IBGE (167 municípios).
2. `votacao_secao_<ano>_RN` — 2012/16/20/24 (vereador foco) + 2014/18/22 (estadual/federal).
3. `eleitorado_locais_votacao_<ano>` — geolocalização das seções.
4. `perfil_eleitorado_<ano>` — demografia por zona/seção.
5. `consulta_cand_<ano>_RN` — atributos de candidatos.
6. (opcional) `prestacao_de_contas` — gasto de campanha.

Saída: JSON agregado (painel) + carga granular no Supabase (votos por seção, volume grande).
