/**
 * TypeScript types for Sanity CMS data
 */

export type PostDiscipline = "edit" | "color" | "sound" | "vfx";

export interface FeaturedProjectMedia {
  _id: string;
  title: string;
  videoUrl?: string;
  imageUrl?: string;
}

export interface WorkerRoleOrder {
  role: string;
  order?: number;
}

export interface PostWorker {
  _id: string;
  name: string;
  slug: string;
  /** All roles this worker is tagged with (editors, colorists, sound, vfx). */
  categories?: string[];
  categoryTitle: string;
  categorySlug: string;
  bio?: string;
  imageUrl?: string;
  featuredWorkTitle?: string;
  /** Per-role roster sort; falls back to `order` when a role is not listed. */
  roleOrders?: WorkerRoleOrder[];
  /** Fallback sort order when no role-specific order is set. */
  order?: number;
  /** First project media keyed by post credit discipline (for roster hover). */
  featuredByDiscipline?: Partial<
    Record<PostDiscipline, FeaturedProjectMedia | null>
  >;
}

export interface PostCredit {
  discipline: PostDiscipline;
  role: string;
  /** Sort order of this project on the linked worker's talent page for this discipline. */
  order?: number;
  worker?: {
    name: string;
    slug: string;
    categoryTitle: string;
  };
}

export interface PortableTextSpan {
  _type: "span";
  text: string;
  marks?: string[];
}

export interface PortableTextLinkMark {
  _key: string;
  _type: "link";
  href: string;
}

export interface PortableTextBlock {
  _type: "block";
  _key: string;
  style?: string;
  children: PortableTextSpan[];
  markDefs?: PortableTextLinkMark[];
}

/** One inline run of text in a Latest Projects subtitle line. */
export interface ScrollSubtitleSpan {
  text: string;
  href?: string;
}

type MediaSectionBase = {
  withMargins?: boolean;
  caption?: PortableTextBlock[];
  captionPosition?: "bottom-left" | "bottom-center" | "bottom-right" | "center";
};

export type SingleMediaSection = MediaSectionBase & {
  layout?: "single";
  mediaType?: "image" | "video" | "videoUrl";
  imageUrl?: string;
  videoUrl?: string;
};

export type ImageRowMediaSection = MediaSectionBase & {
  layout: "imageRow";
  columnCount: 2 | 3;
  imageUrls: string[];
};

export type MediaSection = SingleMediaSection | ImageRowMediaSection;

export function isImageRowSection(
  section: MediaSection,
): section is ImageRowMediaSection {
  return section.layout === "imageRow";
}

export interface Project {
  _id: string;
  title: string;
  client?: string;
  slug: string;
  postCategoryTitle?: string;
  postCategorySlug?: string;
  /** Sort order on the POST Work › List page. Lower numbers appear first. */
  postSortOrder?: number;
  /** Per-worker sort order when this project is fetched for a talent detail page. */
  sortOrder?: number;
  videoUrl?: string;
  imageUrl?: string;
  posterImageUrl?: string;
  postWorkDescription?: string;
  postWorkerDescription?: string;
  /** Rich project write-up (Portable Text). Used as a fallback when postWorkDescription is empty. */
  description?: PortableTextBlock[];
  /** Custom Latest Projects scroll lines (Portable Text with optional links). */
  postScrollSubtitles?: PortableTextBlock[];
  postCredits?: PostCredit[];
  /** Full-viewport media blocks below the hero (main project media, not post-only). */
  mediaSections?: MediaSection[];
}

export interface PostCategory {
  _id: string;
  title: string;
  slug: string;
  order?: number;
}

export interface PostSiteSettings {
  introVideoUrl?: string;
  featuredProjects?: Project[];
  aboutParagraphs?: string[];
  contactEmail?: string;
  offices?: {
    label: string;
    address: string;
    phone?: string;
  }[];
  management?: {
    name: string;
    title: string;
    email: string;
  }[];
}

export interface TalentDetailData extends PostWorker {
  projects?: Project[];
}

export interface HomepageData {
  settings: PostSiteSettings;
  allProjects?: Project[];
}
