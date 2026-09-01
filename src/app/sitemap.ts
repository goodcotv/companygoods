import type { MetadataRoute } from "next";
import { client } from "@/sanity/lib/client";
import { siteUrl } from "@/sanity/env";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const routes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  const [projects, workers] = await Promise.all([
    client.fetch<{ slug: string }[]>(
      `*[_type == "project" && hasPostProduction == true && defined(postCategory) && defined(slug.current)] {
        "slug": slug.current
      }`,
    ),
    client.fetch<{ slug: string }[]>(
      `*[_type == "postWorker" && defined(slug.current)] { "slug": slug.current }`,
    ),
  ]);

  const projectRoutes = projects
    .filter((project) => project.slug)
    .map((project) => ({
      url: `${siteUrl}/work/${project.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  const talentRoutes = workers
    .filter((worker) => worker.slug)
    .map((worker) => ({
      url: `${siteUrl}/talent/${worker.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

  return [...routes, ...projectRoutes, ...talentRoutes];
}
