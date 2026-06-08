// Situação eleitoral OFICIAL (TSE, campo DS_SIT_TOT_TURNO do consulta_cand).
// Nada é calculado/estimado aqui: lemos o resultado oficial da apuração.
// Arquivo: /data/eleicao/situacao-eleitoral.json (chaveado por sq do candidato e ano).
//
// Observação: reflete o resultado da eleição (diplomação). Eventuais cassações
// posteriores pela Justiça Eleitoral não estão neste dado.

export type SitEnum =
  | "ELEITO_QP"
  | "ELEITO_MEDIA"
  | "ELEITO"
  | "SUPLENTE"
  | "NAO_ELEITO"
  | "SEGUNDO_TURNO";

export type SituacaoFile = {
  meta?: Record<string, unknown>;
  anos: Record<string, Record<string, SitEnum>>;
};

export type SituacaoView = {
  eleito: boolean;
  rotulo: string;
  motivo: string;
  cor: "verde" | "gold" | "muted";
};

export function getSit(file: SituacaoFile | null | undefined, ano: number, sq: string): SituacaoView | null {
  const e = file?.anos?.[String(ano)]?.[sq];
  if (!e) return null;
  switch (e) {
    case "ELEITO_QP":
      return { eleito: true, rotulo: "Eleito", motivo: "Eleito pelo quociente próprio do partido (resultado oficial do TSE).", cor: "verde" };
    case "ELEITO_MEDIA":
      return { eleito: true, rotulo: "Eleito", motivo: "Eleito pelas sobras, por maior média (resultado oficial do TSE).", cor: "verde" };
    case "ELEITO":
      return { eleito: true, rotulo: "Eleito", motivo: "Eleito (resultado oficial do TSE).", cor: "verde" };
    case "SUPLENTE":
      return { eleito: false, rotulo: "Suplente", motivo: "Suplente: não assumiu cadeira na diplomação (resultado oficial do TSE).", cor: "gold" };
    case "SEGUNDO_TURNO":
      return { eleito: false, rotulo: "Foi ao 2º turno", motivo: "Classificado para o 2º turno (resultado oficial do TSE).", cor: "gold" };
    case "NAO_ELEITO":
    default:
      return { eleito: false, rotulo: "Não eleito", motivo: "Não eleito (resultado oficial do TSE).", cor: "muted" };
  }
}

// rótulo curto para tags em listas
export function sitTag(v: SituacaoView | null): { texto: string; cor: string; bg: string } | null {
  if (!v) return null;
  if (v.eleito) return { texto: "Eleito", cor: "#0a7a30", bg: "#eafaf0" };
  if (v.rotulo === "Suplente") return { texto: "Suplente", cor: "#8a6d00", bg: "#fff7da" };
  if (v.rotulo.includes("turno")) return { texto: "2º turno", cor: "#8a6d00", bg: "#fff7da" };
  return { texto: "Não eleito", cor: "#767f93", bg: "#f1f3f7" };
}
