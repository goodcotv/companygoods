import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { resolvedDetailVideoUrlGroq } from "@/sanity/queries";
import type { Project } from "@/sanity/types";
import { ProjectPlayer } from "@/components/project/ProjectPlayer";
import { createMetadata } from "@/lib/metadata";

export const revalidate = 3600;

const getProject = cache(async (slug: string) => {
  return client.fetch<Project | null>(
    `*[_type == "project" && slug.current == $slug][0] {
      _id,
      title,
      client,
      "slug": slug.current,
      "postCategoryTitle": postCategory->title,
      "postCategorySlug": postCategory->slug.current,
      "videoUrl": ${resolvedDetailVideoUrlGroq},
      "imageUrl": heroImage.asset->url,
      "posterImageUrl": posterImage.asset->url,
      postWorkDescription,
      description,
      postCredits[] {
        discipline,
        "worker": worker-> {
          name,
          "slug": slug.current,
          "categoryTitle": category->title
        }
      },
      "mediaSections": mediaSections[] {
        layout,
        withMargins,
        mediaType,
        "imageUrl": image.asset->url,
        "videoUrl": ${resolvedDetailVideoUrlGroq},
        columnCount,
        "imageUrls": images[].asset->url,
        caption,
        captionPosition
      }
    }`,
    { slug },
  );
});

export async function generateStaticParams() {
  const projects = await client.fetch<{ slug: string }[]>(
    `*[_type == "project" && hasPostProduction == true && defined(postCategory) && defined(slug.current)] {
      "slug": slug.current
    }`,
  );

  return projects.map((project) => ({
    slug: project.slug,
  }));
}

type ProjectDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) {
    return { title: "Project Not Found" };
  }

  const description =
    project.postWorkDescription?.trim() ||
    [project.title, project.client, project.postCategoryTitle]
      .filter(Boolean)
      .join(" — ") + ". Post production by Company Goods.";

  return createMetadata({
    title: project.title,
    description,
    path: `/work/${slug}`,
    image: project.posterImageUrl || project.imageUrl,
  });
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { slug } = await params;

  const project = await getProject(slug);

  if (!project) {
    notFound();
  }

  // Normalize media sections so image rows always have a stable shape
  if (project.mediaSections) {
    project.mediaSections = project.mediaSections.map((section) => {
      if (section.layout === "imageRow") {
        return {
          ...section,
          layout: "imageRow" as const,
          columnCount: (section.columnCount === 3 ? 3 : 2) as 2 | 3,
          imageUrls: section.imageUrls?.filter(Boolean) ?? [],
          withMargins: section.withMargins === true,
          captionPosition: section.captionPosition ?? "bottom-left",
        };
      }

      return {
        ...section,
        layout: "single" as const,
        videoUrl: section.videoUrl,
        imageUrl: section.imageUrl,
        withMargins: section.withMargins === true,
        captionPosition: section.captionPosition ?? "bottom-left",
      };
    });
  }

  return <ProjectPlayer project={project} />;
}
