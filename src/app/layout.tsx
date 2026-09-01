import type { Metadata } from "next";
import localFont from "next/font/local";
import { SharedLayout } from "@/components/SharedLayout";
import { SiteCursor } from "@/components/SiteCursor";
import {
  DEFAULT_OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
} from "@/lib/metadata";
import { siteUrl } from "@/sanity/env";
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
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: siteUrl,
    siteName: SITE_NAME,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        alt: SITE_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
  ...(process.env.GOOGLE_SITE_VERIFICATION && {
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
    },
  }),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${mintGrotesk.variable} ${neueHaas.variable} ${tekioGrotesk.variable}`}>
      <body className="min-h-full bg-background text-foreground">
        {/*
          Must stay between the warm player z-indexes in preload-video.ts:
          hidden clips park at -11 (occluded), visible ones at -9 (shown).
        */}
        <div
          id="warm-video-layer"
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black"
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
