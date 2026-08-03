import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "../env";

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  // Use CDN only in production - in dev we want fresh data
  useCdn: process.env.NODE_ENV === "production",
  // Always use the latest API version with no caching in dev
  perspective: "published",
  stega: {
    enabled: false,
    studioUrl: "/studio",
  },
});

export const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});
