import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

const SITE_URL = "https://rn-analytics.vercel.app";
const TITLE = "RN Analytics: inteligência eleitoral do Rio Grande do Norte";
const DESC =
  "Painel interativo de dados eleitorais (2012–2024), socioeconômicos e pesquisas 2026 dos 167 municípios do RN. Mapa do estado, redutos por seção em Currais Novos, projeções e relatórios em PDF.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · RN Analytics",
  },
  description: DESC,
  applicationName: "RN Analytics",
  authors: [{ name: "Johnattan Dias" }],
  creator: "Beyonder IA",
  keywords: [
    "Rio Grande do Norte", "RN", "eleições", "TSE", "IBGE", "Seridó", "Currais Novos",
    "vereadores", "pesquisas eleitorais 2026", "dados eleitorais", "FEMURN", "Beyonder IA",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "RN Analytics",
    title: TITLE,
    description: DESC,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body style={{ fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
        <div className="bg-aurora" aria-hidden />
        {children}
      </body>
    </html>
  );
}
