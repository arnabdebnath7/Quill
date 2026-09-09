import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display-sg", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jb", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Quill — Trading & Life Journal",
    template: "%s · Quill",
  },
  description:
    "One calm place for your trades and your days. Track US stocks, India NSE, forex, crypto and gold with live prices, and journal the life around them.",
  applicationName: "Quill",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0d10" },
  ],
  width: "device-width",
  initialScale: 1,
};

const themeBoot = `(function(){try{var t=localStorage.getItem('quill-theme');if(!t){t='dark';}var d=t==='system'?window.matchMedia('(prefers-color-scheme: dark)').matches:t==='dark';document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrains.variable} themed font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
