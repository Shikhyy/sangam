import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Noto_Sans_Devanagari, Tiro_Devanagari_Hindi } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const serif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif-latin",
  display: "swap",
});
const serifDevanagari = Tiro_Devanagari_Hindi({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["devanagari", "latin"],
  variable: "--font-serif-devanagari",
  display: "swap",
});
const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari", "latin"],
  variable: "--font-devanagari",
  display: "swap",
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const TITLE = "Sangam: a voice agent that talks like you";
const DESCRIPTION =
  "Sangam measures how you mix Hindi and English, then keeps an agent's replies in the same mix. Try it, or build it into your own voice agent.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Sangam",
  keywords: ["Hinglish", "code-switching", "voice agent", "Hindi", "speech", "API"],
  openGraph: { type: "website", siteName: "Sangam", title: TITLE, description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f2efe4" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${geist.variable} ${geistMono.variable} ${serif.variable} ${serifDevanagari.variable} ${devanagari.variable}`}
    >
      <body className="sg">{children}</body>
    </html>
  );
}
