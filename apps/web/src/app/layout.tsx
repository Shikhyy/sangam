import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Noto_Sans_Devanagari } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari", "latin"],
  variable: "--font-devanagari",
  display: "swap",
});
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  title: "Sangam: a voice agent that talks like you",
  description: "Sangam measures how you mix Hindi and English, then keeps an agent's replies in the same mix.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={`${manrope.variable} ${devanagari.variable} ${mono.variable}`}>
      <body className="sg">{children}</body>
    </html>
  );
}
