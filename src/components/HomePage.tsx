"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { projects as fallbackProjects } from "@/data/projects";
import type {
  Project as LocalProject,
  ScrollSubtitleSpan,
} from "@/data/projects";
import type { ViewMode } from "./BottomChrome";
import { ListView } from "./ListView";
import { ScrollView } from "./ScrollView";
import type {
  HomepageData,
  PortableTextBlock,
  Project as SanityProject,
} from "@/sanity/types";
import { parseTimeToSeconds } from "@/lib/parse-time";

function parseView(value: string | null): ViewMode {
  return value === "list" ? "list" : "scroll";
}

/**
 * Converts Portable Text subtitle blocks into line/span data for the scroll UI.
 * Each paragraph becomes one line; link annotations become hrefs on spans.
 */
function portableTextToScrollSubtitles(
  blocks?: PortableTextBlock[],
): ScrollSubtitleSpan[][] | undefined {
  if (!blocks || blocks.length === 0) return undefined;

  const lines = blocks
    .filter((block) => block._type === "block")
    .map((block) => {
      const markDefs = block.markDefs || [];
      return (block.children || [])
        .filter((child) => child.text)
        .map((child) => {
          const linkKey = child.marks?.find((mark) =>
            markDefs.some((def) => def._key === mark && def._type === "link"),
          );
          const link = linkKey
            ? markDefs.find((def) => def._key === linkKey && def._type === "link")
            : undefined;
          return {
            text: child.text,
            ...(link?.href ? { href: link.href } : {}),
          } satisfies ScrollSubtitleSpan;
        });
    })
    .filter((line) => line.length > 0);

  return lines.length > 0 ? lines : undefined;
}

/**
 * Transform Sanity project data to match the local Project type
 */
function transformSanityProject(project: SanityProject): LocalProject {
  // Map discipline strings from Sanity to uppercase format
  const disciplineMap: Record<string, LocalProject["disciplines"][number]> = {
    edit: "EDIT",
    color: "COLOR",
    sound: "SOUND",
    vfx: "VFX",
  };

  // Extract disciplines from credits
  const disciplines = Array.from(
    new Set(
      project.postCredits?.map((c) => disciplineMap[c.discipline]).filter(Boolean) || [],
    ),
  ) as LocalProject["disciplines"];

  // Map category title to uppercase format
  const categoryMap: Record<string, LocalProject["category"]> = {
    COMMERCIAL: "COMMERCIAL",
    Commercial: "COMMERCIAL",
    "IMMERSIVE AND LIVE": "IMMERSIVE & LIVE",
    "Immersive & Live": "IMMERSIVE & LIVE",
    "Immersive and Live": "IMMERSIVE & LIVE",
    MUSIC: "MUSIC",
    Music: "MUSIC",
    BEAUTY: "BEAUTY",
    Beauty: "BEAUTY",
  };

  return {
    id: project.slug, // Use slug as id for URL routing
    client: project.client || "",
    title: project.title,
    category: categoryMap[project.postCategoryTitle || ""] || "COMMERCIAL",
    disciplines,
    scrollSubtitles: portableTextToScrollSubtitles(project.postScrollSubtitles),
    description: project.postWorkDescription?.trim() || "",
    image: project.videoUrl || project.imageUrl || "/projects/hero-placeholder.jpg",
    imageAlt: `${project.title} project`,
    videoPreviewStartSeconds: parseTimeToSeconds(project.videoPreviewStart),
  };
}

interface HomePageProps {
  data: HomepageData;
  /** Controlled by AppShell / BottomChrome when present. */
  externalView?: ViewMode;
}

export function HomePage({ data, externalView }: HomePageProps) {
  const searchParams = useSearchParams();
  const [internalView, setInternalView] = useState<ViewMode>(() =>
    parseView(searchParams.get("view")),
  );

  // Use external view if provided (when rendered in AppShell), otherwise use internal
  const view = externalView ?? internalView;

  // Get intro video URL from Sanity settings
  const introVideoUrl = data?.settings?.introVideoUrl;

  // Use allProjects for list view, featuredProjects for scroll view
  const sanityProjects = view === "list"
    ? data?.allProjects
    : data?.settings?.featuredProjects;

  const projects: LocalProject[] =
    sanityProjects?.map(transformSanityProject) || fallbackProjects;

  useEffect(() => {
    if (!externalView) {
      setInternalView(parseView(searchParams.get("view")));
    }
  }, [searchParams, externalView]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [view]);

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {view === "scroll" ? (
        <ScrollView
          key="scroll"
          projects={projects}
          introVideoUrl={introVideoUrl}
        />
      ) : (
        <ListView key="list" projects={projects} />
      )}
    </AnimatePresence>
  );
}
