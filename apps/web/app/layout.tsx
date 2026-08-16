import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Source_Serif_4 } from "next/font/google";
import type { ReactNode } from "react";

import "katex/dist/katex.min.css";
import "mafs/core.css";

import { loadEnv } from "@/lib/env";

import "./globals.css";

loadEnv();

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display-face",
  display: "swap",
});

const body = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-body-face",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-face",
  display: "swap",
});

export const metadata: Metadata = {
  title: "graph.io",
  description: "Interactive mathematical visualizations",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
