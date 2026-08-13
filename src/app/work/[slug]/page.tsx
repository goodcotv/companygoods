import { notFound } from "next/navigation";
import { client } from "@/sanity/lib/client";
import type { Project } from "@/sanity/types";
import { ProjectPlayer } from "@/components/project/ProjectPlayer";

export const revalidate = 3600;

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

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const project = await client.fetch<Project>(
    `*[_type == "project" && slug.current == $slug][0] {
      _id,
      title,
      client,
      "slug": slug.current,
      "postCategoryTitle": postCategory->title,
      "postCategorySlug": postCategory->slug.current,
      "videoUrl": coalesce(video.asset->url, videoUrl),
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
        "videoUrl": coalesce(video.asset->url, videoUrl),
        columnCount,
        "imageUrls": images[].asset->url,
        caption,
        captionPosition
      }
    }`,
    { slug },
  );

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
