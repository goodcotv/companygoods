import type { Metadata } from "next";
import localFont from "next/font/local";
import { SharedLayout } from "@/components/SharedLayout";
import { SiteCursor } from "@/components/SiteCursor";
import "./globals.css";

const mintGrotesk = localFont({
  src: "../fonts/MintGrotesk-ExtraBold.woff2",
  variable: "--font-mint-grotesk",
  weight: "800",
  display: "swap",
});

const neueHaas = localFont({
  src: "../fonts/NeueHaasGroteskDisplay-55Roman.woff2",
  variable: "--font-neue-haas",
  weight: "400",
  display: "swap",
});

const tekioGrotesk = localFont({
  src: "../fonts/TekioGrotesk-Medium.woff2",
  variable: "--font-tekio-grotesk",
  weight: "500",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Company Goods — A Post Production Company",
  description:
    "Company Goods is a post production company building workflows and a tight-knit roster to bring ambitious creative visions to life.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${mintGrotesk.variable} ${neueHaas.variable} ${tekioGrotesk.variable}`}>
      <body className="min-h-full bg-background text-foreground">
        <div
          id="warm-video-layer"
          className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black"
          aria-hidden
        />
        <div className="relative z-[1] min-h-full">
          <SiteCursor />
          <SharedLayout>{children}</SharedLayout>
        </div>
      </body>
    </html>
  );
}
