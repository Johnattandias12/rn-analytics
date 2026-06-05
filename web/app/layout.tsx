import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RN Analytics — Inteligência eleitoral e socioeconômica do Rio Grande do Norte",
  description:
    "Painel interativo de dados eleitorais (2012–2024) e socioeconômicos dos 167 municípios do RN, com recorte aprofundado no Seridó e em Currais Novos.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
