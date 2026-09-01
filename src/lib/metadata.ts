import type { Metadata } from "next";
import { siteUrl } from "@/sanity/env";

export const SITE_NAME = "Company Goods";
export const SITE_TITLE = "Company Goods — A Post Production Company";
export const SITE_DESCRIPTION =
  "Company Goods is a post production company building workflows and a tight-knit roster to bring ambitious creative visions to life.";
export const DEFAULT_OG_IMAGE = "/brand/logo-small.png";

export function createMetadata({
  title,
  description,
  path = "/",
  image,
}: {
  title: string;
  description: string;
  path?: string;
  image?: string | null;
}): Metadata {
  const url = `${siteUrl}${path}`;
  const ogImage = image || DEFAULT_OG_IMAGE;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_US",
      type: "website",
      images: [
        {
          url: ogImage,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}
