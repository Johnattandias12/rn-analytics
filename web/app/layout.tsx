import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "RN Analytics — Inteligência eleitoral e socioeconômica do Rio Grande do Norte",
  description:
    "Painel interativo de dados eleitorais (2012–2024) e socioeconômicos dos 167 municípios do RN, com recorte no Seridó e em Currais Novos. Desenvolvido pela Beyonder IA.",
  authors: [{ name: "Johnattan Dias" }],
  applicationName: "RN Analytics",
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
