import createImageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url";

import { dataset, projectId } from "../env";

const builder = createImageUrlBuilder({ projectId, dataset });

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

/** Next's optimizer caps responses at 50MB and flattens animated GIFs. */
export function isGifUrl(src?: string | null): boolean {
  if (!src) return false;
  const path = src.split(/[?#]/, 1)[0] ?? src;
  return path.toLowerCase().endsWith(".gif");
}
