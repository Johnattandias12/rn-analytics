// Tipos e helpers para os dados de RN Analytics (servidos de /public/data)

export type Municipio = {
  codigo_ibge: number;
  nome: string;
  microrregiao: string | null;
  mesorregiao: string | null;
};

export type Socio = {
  codigo_ibge: number;
  nome: string;
  microrregiao: string | null;
  populacao_2022: number | null;
  area_km2: number | null;
  densidade_hab_km2: number | null;
  pib_2021_mil_reais: number | null;
  pib_per_capita_2021: number | null;
};

export type Candidato = {
  sq: string;
  numero: string;
  nome: string;
  partido_num: string;
  votos: number;
  rank: number;
};

export type MunicipioVereador = {
  cd_tse: number;
  codigo_ibge: number | null;
  nome: string;
  microrregiao: string | null;
  total_votos_nominais: number;
  qtd_candidatos: number;
  brancos: number;
  nulos: number;
  votos_legenda_total: number;
  candidatos: Candidato[];
  legenda: { partido_num: string; nome: string; votos: number }[];
};

export type LocalVotacao = {
  cd: string;
  nr: string;
  nome: string;
  endereco: string;
  zona: string;
  votos: number;
};

export type SeridoVereador = {
  meta: Record<string, unknown>;
  municipios: MunicipioVereador[];
  locais_votacao: LocalVotacao[];
};

export const IS_SERIDO = (micro: string | null | undefined) => !!micro && /Seridó/.test(micro);

export const fmtInt = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("pt-BR");

export const fmtReais = (milReais: number | null | undefined) => {
  if (milReais == null) return "—";
  const v = milReais * 1000;
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(2)} bi`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)} mi`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
};

export const fmtReaisCheio = (reais: number | null | undefined) =>
  reais == null ? "—" : `R$ ${reais.toLocaleString("pt-BR")}`;

// Nome do partido a partir do número (principais partidos brasileiros)
export const PARTIDOS: Record<string, string> = {
  "10": "Republicanos", "11": "PP", "12": "PDT", "13": "PT", "14": "PTB",
  "15": "MDB", "16": "PSTU", "17": "PSL", "18": "REDE", "19": "PODE",
  "20": "PODE", "22": "PL", "23": "Cidadania", "25": "União", "27": "DC",
  "28": "PRTB", "30": "Novo", "33": "PMN", "35": "PMB", "36": "Agir",
  "40": "PSB", "43": "PV", "44": "União Brasil", "45": "PSDB", "50": "PSOL",
  "51": "Patriota", "54": "PPL", "55": "PSD", "65": "PCdoB", "70": "Avante",
  "77": "Solidariedade", "80": "UP", "90": "PROS",
};

export const partidoLabel = (num: string) => PARTIDOS[num] ?? `nº ${num}`;
