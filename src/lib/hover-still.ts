import { isVimeoUrl } from "@/lib/vimeo";
import type { FeaturedProjectMedia } from "@/sanity/types";

export type HoverStillProject = Pick<
  FeaturedProjectMedia,
  | "videoUrl"
  | "imageUrl"
  | "videoPreviewStartSeconds"
  | "posterImageUrl"
  | "muxVideoUrl"
>;

const vimeoThumbnailCache = new Map<string, Promise<string | undefined>>();
const stillReadyCache = new Map<string, Promise<void>>();
const STILL_TIMEOUT_MS = 2500;

function muxPlaybackIdFromStreamUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "stream.mux.com") return null;
    const playbackId = parsed.pathname.split("/").filter(Boolean)[0];
    return playbackId?.replace(/\.(m3u8|mp4)$/i, "") || null;
  } catch {
    return null;
  }
}

function muxThumbnailUrl(project: HoverStillProject): string | undefined {
  const playbackId =
    muxPlaybackIdFromStreamUrl(project.muxVideoUrl) ||
    muxPlaybackIdFromStreamUrl(project.videoUrl);
  if (!playbackId) return undefined;
  const time = Math.max(project.videoPreviewStartSeconds ?? 1, 0);
  const params = new URLSearchParams({
    time: String(time),
    width: "1920",
    fit_mode: "preserve",
  });
  return `https://image.mux.com/${playbackId}/thumbnail.webp?${params.toString()}`;
}

function enlargeVimeoThumbnailUrl(thumbnailUrl: string): string {
  return thumbnailUrl.replace(/_\d+x\d+(\.\w+)(\?.*)?$/, "_1280x720$1$2");
}

function waitMs(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Poster, then hero/imageUrl, then a Mux still generated from the playback ID. */
export function getProjectHoverStillUrl(
  project: HoverStillProject | null | undefined,
): string | undefined {
  if (!project) return undefined;
  return (
    project.posterImageUrl ||
    project.imageUrl ||
    muxThumbnailUrl(project) ||
    undefined
  );
}

export function waitForHoverStill(url: string): Promise<void> {
  const cached = stillReadyCache.get(url);
  if (cached) return cached;

  const promise = new Promise<void>((resolve) => {
    const image = new Image();
    const done = () => resolve();
    image.addEventListener("load", done, { once: true });
    image.addEventListener("error", done, { once: true });
    image.src = url;
    if (image.complete && image.naturalWidth > 0) {
      done();
    }
  });

  stillReadyCache.set(url, promise);
  return promise;
}

export function preloadHoverStill(url: string | undefined) {
  if (!url || typeof window === "undefined") return;
  void waitForHoverStill(url);
}

/** Wait until the hover poster is decoded (or give up quickly). Never waits on video. */
export async function waitForProjectHoverStill(
  project: HoverStillProject,
): Promise<void> {
  const stillUrl = getProjectHoverStillUrl(project);
  if (stillUrl) {
    await Promise.race([waitForHoverStill(stillUrl), waitMs(STILL_TIMEOUT_MS)]);
    return;
  }

  if (project.videoUrl && isVimeoUrl(project.videoUrl)) {
    const thumb = await Promise.race([
      resolveVimeoThumbnail(project.videoUrl),
      waitMs(STILL_TIMEOUT_MS).then(() => undefined),
    ]);
    if (thumb) {
      await Promise.race([waitForHoverStill(thumb), waitMs(STILL_TIMEOUT_MS)]);
    }
  }
}

export function resolveVimeoThumbnail(
  videoUrl: string,
): Promise<string | undefined> {
  const cached = vimeoThumbnailCache.get(videoUrl);
  if (cached) return cached;

  const promise = (async () => {
    if (!isVimeoUrl(videoUrl)) return undefined;
    try {
      const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoUrl)}`;
      const response = await fetch(oembedUrl);
      if (!response.ok) return undefined;
      const data = (await response.json()) as { thumbnail_url?: string };
      if (!data.thumbnail_url) return undefined;
      return enlargeVimeoThumbnailUrl(data.thumbnail_url);
    } catch {
      return undefined;
    }
  })();

  vimeoThumbnailCache.set(videoUrl, promise);
  return promise;
}

export function preloadProjectHoverStill(project: HoverStillProject) {
  const stillUrl = getProjectHoverStillUrl(project);
  if (stillUrl) {
    preloadHoverStill(stillUrl);
    return;
  }
  if (project.videoUrl && isVimeoUrl(project.videoUrl)) {
    void resolveVimeoThumbnail(project.videoUrl).then(preloadHoverStill);
  }
}

export function projectHasHoverStill(project: HoverStillProject): boolean {
  if (getProjectHoverStillUrl(project)) return true;
  return Boolean(project.videoUrl && isVimeoUrl(project.videoUrl));
}
