import { notFound } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { talentDetailQuery } from "@/sanity/queries";
import type { TalentDetailData } from "@/sanity/types";
import { TalentDetail } from "@/components/talent/TalentDetail";

/** Map roster category (or worker category slug) → post credit discipline. */
const categoryToDiscipline: Record<string, string> = {
  editors: "edit",
  colorists: "color",
  sound: "sound",
  vfx: "vfx",
};

export default async function TalentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const { id } = await params;
  const { role } = await searchParams;

  // First, fetch the talent without projects to get their categories
  const talentBasic = await client.fetch<TalentDetailData>(
    `*[_type == "postWorker" && slug.current == $slug][0] {
      _id,
      name,
      categories,
      "categorySlug": coalesce(categories[0], category->slug.current),
      "categoryTitle": category->title,
      bio,
      "imageUrl": image.asset->url,
      featuredWorkTitle
    }`,
    { slug: id },
  );

  if (!talentBasic) {
    notFound();
  }

  // Prefer the role from the roster (?role=colorists) so videos/projects
  // match the discipline they were viewed under; fall back to primary category.
  const categorySlug =
    (role && categoryToDiscipline[role] ? role : null) ||
    talentBasic.categorySlug;
  const discipline = categoryToDiscipline[categorySlug] || "edit";

  // Projects + videos are filtered to only this discipline's credits
  const talent = await client.fetch<TalentDetailData>(talentDetailQuery, {
    slug: id,
    discipline,
  });

  if (!talent) {
    notFound();
  }

  return <TalentDetail talent={talent} projects={talent.projects || []} />;
}

export async function generateStaticParams() {
  const workers = await client.fetch<{ slug: string }[]>(
    `*[_type == "postWorker"] { "slug": slug.current }`,
  );

  return workers.map((worker) => ({
    id: worker.slug,
  }));
}
